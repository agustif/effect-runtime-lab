/*
 * HTTP Client for QuickJS using libcurl (Async/Non-blocking)
 *
 * Provides HTTP client functionality:
 * - GET, POST, PUT, DELETE, PATCH
 * - Headers, body, timeout
 * - Promise-based API
 * - Integrated via curl_multi
 */

#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <curl/curl.h>
#include "quickjs.h"
#include "quickjs-libc.h"
#include "cutils.h"
#include "list.h"
#include "quickjs-http.h"

// Global multi handle
static CURLM *multi_handle = NULL;
static struct list_head req_list;
static int req_list_inited = 0;

// Cached Atoms
static JSAtom atom_statusCode = 0;
static JSAtom atom_body = 0;
static JSAtom atom_bodyBytes = 0;
static JSAtom atom_ok = 0;
static JSAtom atom_headers = 0;
static JSAtom atom_message = 0;

static void init_atoms(JSContext *ctx) {
    if (atom_statusCode == 0) {
        atom_statusCode = JS_NewAtom(ctx, "statusCode");
        atom_body = JS_NewAtom(ctx, "body");
        atom_bodyBytes = JS_NewAtom(ctx, "bodyBytes");
        atom_ok = JS_NewAtom(ctx, "ok");
        atom_headers = JS_NewAtom(ctx, "headers");
        atom_message = JS_NewAtom(ctx, "message");
    }
}

static void free_atoms(JSContext *ctx) {
    if (atom_statusCode != 0) {
        JS_FreeAtom(ctx, atom_statusCode); atom_statusCode = 0;
        JS_FreeAtom(ctx, atom_body); atom_body = 0;
        JS_FreeAtom(ctx, atom_bodyBytes); atom_bodyBytes = 0;
        JS_FreeAtom(ctx, atom_ok); atom_ok = 0;
        JS_FreeAtom(ctx, atom_headers); atom_headers = 0;
        JS_FreeAtom(ctx, atom_message); atom_message = 0;
    }
}

// Connection Pool
static struct list_head free_curl_list;
static int free_list_inited = 0;
static int free_curl_count = 0;
static int max_pool_size = 128;

typedef struct {
    struct list_head link;
    CURL *curl;
} FreeCurlHandle;

// HTTP Request Context (attached to easy handle)
typedef struct {
    struct list_head link;
    JSContext *ctx;
    CURL *curl;
    JSValue resolving_funcs[2]; // [0]: resolve, [1]: reject
    char *memory;
    size_t size;
    size_t capacity;            // Allocated size
    struct curl_slist *headers; // Keep to free later
    curl_mime *mime;            // Multipart data
    JSValue signal;             // AbortSignal
    int is_stream;
    int response_resolved;
    int finished;
    JSValue response_val;
    JSValue response_headers;
} RequestContext;

// Forward declaration
static JSValue js_http_read_chunk(JSContext *ctx, JSValueConst this_val,
                                 int argc, JSValueConst *argv);

static size_t header_callback(char *buffer, size_t size, size_t nitems, void *userdata)
{
    RequestContext *req = (RequestContext *)userdata;
    size_t len = size * nitems;
    JSContext *ctx = req->ctx;

    char *sep = memchr(buffer, ':', len);
    if (sep) {
        size_t key_len = sep - buffer;
        char *key_str = malloc(key_len + 1);
        if (!key_str) return len;
        memcpy(key_str, buffer, key_len);
        key_str[key_len] = '\0';
        
        for (size_t i = 0; i < key_len; i++) {
            if (key_str[i] >= 'A' && key_str[i] <= 'Z')
                key_str[i] += 32;
        }

        char *val_start = sep + 1;
        while (val_start < buffer + len && (*val_start == ' ' || *val_start == '\t'))
            val_start++;
        
        char *val_end = buffer + len;
        while (val_end > val_start && (val_end[-1] == '\r' || val_end[-1] == '\n' || val_end[-1] == ' ' || val_end[-1] == '\t'))
            val_end--;
        
        size_t val_len = val_end - val_start;
        JSValue val = JS_NewStringLen(ctx, val_start, val_len);
        
        JSValue existing = JS_GetPropertyStr(ctx, req->response_headers, key_str);
        if (JS_IsUndefined(existing)) {
            JS_SetPropertyStr(ctx, req->response_headers, key_str, val);
        } else {
            if (JS_IsArray(existing)) {
                uint32_t alen;
                JSValue len_val = JS_GetPropertyStr(ctx, existing, "length");
                JS_ToUint32(ctx, &alen, len_val);
                JS_FreeValue(ctx, len_val);
                JS_SetPropertyUint32(ctx, existing, alen, val);
                JS_FreeValue(ctx, existing);
            } else {
                JSValue arr = JS_NewArray(ctx);
                JS_SetPropertyUint32(ctx, arr, 0, existing);
                JS_SetPropertyUint32(ctx, arr, 1, val);
                JS_SetPropertyStr(ctx, req->response_headers, key_str, arr);
            }
        }
        free(key_str);
    }
    return len;
}

// Callback for curl to check if request should be aborted
static int xferinfo_callback(void *p,
                             curl_off_t dltotal, curl_off_t dlnow,
                             curl_off_t ultotal, curl_off_t ulnow)
{
    RequestContext *req = (RequestContext *)p;
    if (JS_IsObject(req->signal)) {
        JSValue aborted = JS_GetPropertyStr(req->ctx, req->signal, "aborted");
        int is_aborted = JS_ToBool(req->ctx, aborted);
        JS_FreeValue(req->ctx, aborted);
        if (is_aborted) {
            return 1; // Return non-zero to abort
        }
    }
    return 0;
}

static CURL *get_curl_handle(void) {
    if (!free_list_inited) {
        init_list_head(&free_curl_list);
        free_list_inited = 1;
    }
    
    while (!list_empty(&free_curl_list)) {
        struct list_head *el = free_curl_list.next;
        FreeCurlHandle *node = list_entry(el, FreeCurlHandle, link);
        list_del(el);
        CURL *curl = node->curl;

        // Check if connection is still alive
        int is_valid = 1;
        curl_socket_t sockfd = CURL_SOCKET_BAD;
        CURLcode res = curl_easy_getinfo(curl, CURLINFO_ACTIVESOCKET, &sockfd);
        
        if (res == CURLE_OK && sockfd != CURL_SOCKET_BAD) {
            struct pollfd pfd;
            pfd.fd = sockfd;
            pfd.events = POLLIN;
            pfd.revents = 0;
            // Poll with 0 timeout to check status
            int n = poll(&pfd, 1, 0);
            if (n > 0) {
                // Socket is readable (likely EOF/closed) or has error
                is_valid = 0;
            }
        }

        if (is_valid) {
            free(node);
            free_curl_count--;
            curl_easy_reset(curl); // Reset just before reuse
            return curl;
        } else {
            // Connection dead, discard handle
            curl_easy_cleanup(curl);
            free(node);
            free_curl_count--;
        }
    }
    return curl_easy_init();
}

static void release_curl_handle(CURL *curl) {
    if (!free_list_inited) {
        curl_easy_cleanup(curl);
        return;
    }
    
    if (free_curl_count >= max_pool_size) {
        curl_easy_cleanup(curl);
        return;
    }
    
    // Note: We do NOT call curl_easy_reset here because it clears CURLINFO_ACTIVESOCKET,
    // preventing us from checking connection liveness in get_curl_handle.
    // It will be called in get_curl_handle instead.
    
    FreeCurlHandle *node = malloc(sizeof(FreeCurlHandle));
    if (node) {
        node->curl = curl;
        list_add(&node->link, &free_curl_list);
        free_curl_count++;
    } else {
        curl_easy_cleanup(curl);
    }
}

// Callback for curl to write response data
static size_t WriteMemoryCallback(void *contents, size_t size, size_t nmemb, void *userp)
{
    size_t realsize = size * nmemb;
    RequestContext *req = (RequestContext *)userp;

    if (req->size + realsize + 1 > req->capacity) {
        size_t new_cap = req->capacity == 0 ? 16384 : req->capacity * 2;
        if (new_cap < req->size + realsize + 1) new_cap = req->size + realsize + 1;
        
        char *ptr = realloc(req->memory, new_cap);
        if (!ptr) {
            return 0; /* out of memory */
        }
        req->memory = ptr;
        req->capacity = new_cap;
    }

    memcpy(req->memory + req->size, contents, realsize);
    req->size += realsize;
    req->memory[req->size] = 0;
    return realsize;
}

static void FreeRequestContext(RequestContext *req) {
    if (req) {
        list_del(&req->link);
        if (req->memory) free(req->memory);
        if (req->headers) curl_slist_free_all(req->headers);
        if (req->mime) curl_mime_free(req->mime);
        JS_FreeValue(req->ctx, req->signal);
        JS_FreeValue(req->ctx, req->response_val);
        JS_FreeValue(req->ctx, req->response_headers);
        JS_FreeValue(req->ctx, req->resolving_funcs[0]);
        JS_FreeValue(req->ctx, req->resolving_funcs[1]);
        free(req);
    }
}

static JSValue js_http_request(JSContext *ctx, JSValueConst this_val,
                               int argc, JSValueConst *argv)
{
    const char *method;
    const char *url;
    const char *headers = NULL;
    double timeout = 30.0;
    JSValue body_val = JS_UNDEFINED;
    int insecure = 0;
    int follow = 1;
    const char *ca = NULL;

    // Parse arguments
    method = JS_ToCString(ctx, argv[0]);
    if (!method) return JS_EXCEPTION;

    url = JS_ToCString(ctx, argv[1]);
    if (!url) {
        JS_FreeCString(ctx, method);
        return JS_EXCEPTION;
    }

    if (argc > 2) {
        body_val = argv[2];
    }

    if (argc > 3 && JS_IsString(argv[3])) {
        headers = JS_ToCString(ctx, argv[3]);
    }
    if (argc > 4 && JS_IsNumber(argv[4])) {
        JS_ToFloat64(ctx, &timeout, argv[4]);
    }

    if (argc > 5 && JS_IsObject(argv[5])) {
        JSValue insecure_val = JS_GetPropertyStr(ctx, argv[5], "insecure");
        if (!JS_IsUndefined(insecure_val)) {
            insecure = JS_ToBool(ctx, insecure_val);
        }
        JS_FreeValue(ctx, insecure_val);

        JSValue follow_val = JS_GetPropertyStr(ctx, argv[5], "follow");
        if (!JS_IsUndefined(follow_val)) {
            follow = JS_ToBool(ctx, follow_val);
        }
        JS_FreeValue(ctx, follow_val);

        JSValue ca_val = JS_GetPropertyStr(ctx, argv[5], "ca");
        if (JS_IsString(ca_val)) {
            ca = JS_ToCString(ctx, ca_val);
        }
        JS_FreeValue(ctx, ca_val);
    }

    if (!req_list_inited) {
        init_list_head(&req_list);
        req_list_inited = 1;
    }

    if (!multi_handle) {
        multi_handle = curl_multi_init();
    }

    CURL *curl = get_curl_handle();
    if (!curl) {
        JS_FreeCString(ctx, method);
        JS_FreeCString(ctx, url);
        if (headers) JS_FreeCString(ctx, headers);
        if (ca) JS_FreeCString(ctx, ca);
        return JS_ThrowTypeError(ctx, "Failed to initialize curl");
    }

    // Create RequestContext
    RequestContext *req = malloc(sizeof(RequestContext));
    if (!req) {
        JS_FreeCString(ctx, method);
        JS_FreeCString(ctx, url);
        if (headers) JS_FreeCString(ctx, headers);
        if (ca) JS_FreeCString(ctx, ca);
        release_curl_handle(curl);
        return JS_ThrowOutOfMemory(ctx);
    }
    req->ctx = ctx;
    req->curl = curl;
    req->capacity = 16384;
    req->memory = malloc(req->capacity);
    if (!req->memory) {
        free(req);
        JS_FreeCString(ctx, method);
        JS_FreeCString(ctx, url);
        if (headers) JS_FreeCString(ctx, headers);
        if (ca) JS_FreeCString(ctx, ca);
        release_curl_handle(curl);
        return JS_ThrowOutOfMemory(ctx);
    }
    req->size = 0;
    req->memory[0] = 0;
    req->headers = NULL;
    req->mime = NULL;
    req->signal = JS_UNDEFINED;
    req->is_stream = 0;
    req->response_resolved = 0;
    req->finished = 0;
    req->response_val = JS_UNDEFINED;
    req->response_headers = JS_NewObject(ctx);

    if (argc > 5 && JS_IsObject(argv[5])) {
        JSValue signal_val = JS_GetPropertyStr(ctx, argv[5], "signal");
        if (JS_IsObject(signal_val)) {
            req->signal = JS_DupValue(ctx, signal_val);
        }
        JS_FreeValue(ctx, signal_val);

        JSValue stream_val = JS_GetPropertyStr(ctx, argv[5], "stream");
        if (!JS_IsUndefined(stream_val)) {
            req->is_stream = JS_ToBool(ctx, stream_val);
        }
        JS_FreeValue(ctx, stream_val);
    }
    
    list_add_tail(&req->link, &req_list);

    // Create Promise
    JSValue promise = JS_NewPromiseCapability(ctx, req->resolving_funcs);
    if (JS_IsException(promise)) {
        FreeRequestContext(req); // This removes from list and frees memory
        release_curl_handle(curl);
        JS_FreeCString(ctx, method);
        JS_FreeCString(ctx, url);
        if (headers) JS_FreeCString(ctx, headers);
        if (ca) JS_FreeCString(ctx, ca);
        return promise;
    }

    // Set options
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, method);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, (long)timeout);
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, follow ? 1L : 0L);
    if (insecure) {
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L);
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0L);
    } else {
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 1L);
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 2L);
    }
    if (ca) {
        curl_easy_setopt(curl, CURLOPT_CAINFO, ca);
    }

    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteMemoryCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)req);
    curl_easy_setopt(curl, CURLOPT_HEADERFUNCTION, header_callback);
    curl_easy_setopt(curl, CURLOPT_HEADERDATA, (void *)req);
    curl_easy_setopt(curl, CURLOPT_PRIVATE, (void *)req);
    
    // AbortSignal support
    curl_easy_setopt(curl, CURLOPT_XFERINFOFUNCTION, xferinfo_callback);
    curl_easy_setopt(curl, CURLOPT_XFERINFODATA, (void *)req);
    curl_easy_setopt(curl, CURLOPT_NOPROGRESS, 0L);
    
    // Enable compression support
    curl_easy_setopt(curl, CURLOPT_ACCEPT_ENCODING, "");
    
    // TCP Keep-alive for pooled connections
    curl_easy_setopt(curl, CURLOPT_TCP_KEEPALIVE, 1L);
    curl_easy_setopt(curl, CURLOPT_TCP_KEEPIDLE, 60L);
    curl_easy_setopt(curl, CURLOPT_TCP_KEEPINTVL, 60L);

    // Headers
    if (headers) {
        char *headers_dup = strdup(headers);
        char *token = strtok(headers_dup, "\r\n");
        while (token != NULL) {
            req->headers = curl_slist_append(req->headers, token);
            token = strtok(NULL, "\r\n");
        }
        free(headers_dup);
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, req->headers);
    }

    // Body handling
    if (!JS_IsNull(body_val) && !JS_IsUndefined(body_val)) {
        if (JS_IsString(body_val)) {
            const char *body_str = JS_ToCString(ctx, body_val);
            if (body_str) {
                curl_easy_setopt(curl, CURLOPT_COPYPOSTFIELDS, body_str);
                JS_FreeCString(ctx, body_str);
            }
        } else {
            size_t len;
            uint8_t *buf = NULL;
            JSValue ab = JS_UNDEFINED;
            
            if (JS_IsArrayBuffer(body_val)) {
                buf = JS_GetArrayBuffer(ctx, &len, body_val);
            } else if (JS_GetTypedArrayType(body_val) != -1) {
                size_t byte_offset, byte_length, bpe;
                ab = JS_GetTypedArrayBuffer(ctx, body_val, &byte_offset, &byte_length, &bpe);
                if (!JS_IsException(ab)) {
                    buf = JS_GetArrayBuffer(ctx, &len, ab);
                    if (buf) {
                        buf += byte_offset;
                        len = byte_length;
                    }
                }
            }

            if (buf) {
                curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, (long)len);
                curl_easy_setopt(curl, CURLOPT_COPYPOSTFIELDS, (const char *)buf);
                JS_FreeValue(ctx, ab);
            } else {
                JS_FreeValue(ctx, ab);
                // Check if it's FormData and prefer the non-standard multipartEntries helper
                // so JS iteration can remain standards-compliant.
                JSValue entries_fn = JS_GetPropertyStr(ctx, body_val, "multipartEntries");
                if (!JS_IsFunction(ctx, entries_fn)) {
                    JS_FreeValue(ctx, entries_fn);
                    entries_fn = JS_GetPropertyStr(ctx, body_val, "entries");
                }
                if (JS_IsFunction(ctx, entries_fn)) {
                    req->mime = curl_mime_init(curl);
                    
                    // Get iterator from entries()
                    JSValue iter_obj = JS_Call(ctx, entries_fn, body_val, 0, NULL);
                    JS_FreeValue(ctx, entries_fn);
                    
                    if (!JS_IsException(iter_obj)) {
                        JSValue next_fn = JS_GetPropertyStr(ctx, iter_obj, "next");
                        if (JS_IsFunction(ctx, next_fn)) {
                            while (1) {
                                JSValue next_res = JS_Call(ctx, next_fn, iter_obj, 0, NULL);
                                if (JS_IsException(next_res)) {
                                    break;
                                }
                                
                                JSValue done = JS_GetPropertyStr(ctx, next_res, "done");
                                int is_done = JS_ToBool(ctx, done);
                                JS_FreeValue(ctx, done);
                                if (is_done) {
                                    JS_FreeValue(ctx, next_res);
                                    break;
                                }
                                
                                JSValue entry = JS_GetPropertyStr(ctx, next_res, "value"); // [name, value, optional_filename]
                                JS_FreeValue(ctx, next_res);
                                
                                JSValue name_val = JS_GetPropertyUint32(ctx, entry, 0);
                                JSValue val_val = JS_GetPropertyUint32(ctx, entry, 1);
                                JSValue filename_val = JS_GetPropertyUint32(ctx, entry, 2);
                                
                                const char *name = JS_ToCString(ctx, name_val);
                                curl_mimepart *part = curl_mime_addpart(req->mime);
                                curl_mime_name(part, name);
                                
                                if (JS_IsString(val_val)) {
                                    const char *vstr = JS_ToCString(ctx, val_val);
                                    curl_mime_data(part, vstr, CURL_ZERO_TERMINATED);
                                    JS_FreeCString(ctx, vstr);
                                } else {
                                    // Check for Blob/File internal buffer
                                    JSValue get_buf = JS_GetPropertyStr(ctx, val_val, "_getBuffer");
                                    if (JS_IsFunction(ctx, get_buf)) {
                                        JSValue buf_val = JS_Call(ctx, get_buf, val_val, 0, NULL);
                                        size_t blen;
                                        uint8_t *bbuf = JS_GetArrayBuffer(ctx, &blen, buf_val);
                                        JSValue ab_to_free = JS_UNDEFINED;
                                        
                                        if (!bbuf) {
                                            // Maybe it's a TypedArray (Uint8Array)
                                            JSValue buffer = JS_GetPropertyStr(ctx, buf_val, "buffer");
                                            if (JS_IsObject(buffer)) {
                                                bbuf = JS_GetArrayBuffer(ctx, &blen, buffer);
                                                if (bbuf) {
                                                    JSValue offset_val = JS_GetPropertyStr(ctx, buf_val, "byteOffset");
                                                    JSValue len_val = JS_GetPropertyStr(ctx, buf_val, "byteLength");
                                                    uint32_t offset = 0, length = 0;
                                                    JS_ToUint32(ctx, &offset, offset_val);
                                                    JS_ToUint32(ctx, &length, len_val);
                                                    bbuf += offset;
                                                    blen = length;
                                                    JS_FreeValue(ctx, offset_val);
                                                    JS_FreeValue(ctx, len_val);
                                                    ab_to_free = buffer;
                                                } else {
                                                    JS_FreeValue(ctx, buffer);
                                                }
                                            }
                                        }

                                        if (bbuf) {
                                            curl_mime_data(part, (const char *)bbuf, blen);
                                        }
                                        JS_FreeValue(ctx, ab_to_free);
                                        JS_FreeValue(ctx, buf_val);
                                    }
                                    JS_FreeValue(ctx, get_buf);
                                    
                                    // Optional filename from entry[2] or value.name
                                    if (JS_IsString(filename_val)) {
                                        const char *fn = JS_ToCString(ctx, filename_val);
                                        curl_mime_filename(part, fn);
                                        JS_FreeCString(ctx, fn);
                                    } else {
                                        JSValue fname = JS_GetPropertyStr(ctx, val_val, "name");
                                        if (JS_IsString(fname)) {
                                            const char *fn = JS_ToCString(ctx, fname);
                                            curl_mime_filename(part, fn);
                                            JS_FreeCString(ctx, fn);
                                        }
                                        JS_FreeValue(ctx, fname);
                                    }
                                    
                                    JSValue type = JS_GetPropertyStr(ctx, val_val, "type");
                                    if (JS_IsString(type)) {
                                        const char *ts = JS_ToCString(ctx, type);
                                        curl_mime_type(part, ts);
                                        JS_FreeCString(ctx, ts);
                                    }
                                    JS_FreeValue(ctx, type);
                                }
                                
                                JS_FreeCString(ctx, name);
                                JS_FreeValue(ctx, name_val);
                                JS_FreeValue(ctx, val_val);
                                JS_FreeValue(ctx, filename_val);
                                JS_FreeValue(ctx, entry);
                            }
                        JS_FreeValue(ctx, next_fn);
                    }
                    JS_FreeValue(ctx, iter_obj);
                }
                curl_easy_setopt(curl, CURLOPT_MIMEPOST, req->mime);
            } else {
                JS_FreeValue(ctx, entries_fn);
            }
            }
        }
    }
    
    curl_multi_add_handle(multi_handle, curl);

    // Cleanup input strings (we made copies where needed)
    JS_FreeCString(ctx, method);
    JS_FreeCString(ctx, url);
    if (headers) JS_FreeCString(ctx, headers);
    if (ca) JS_FreeCString(ctx, ca);

    return promise;
}

static JSValue js_http_read_chunk(JSContext *ctx, JSValueConst this_val,
                                 int argc, JSValueConst *argv)
{
    JSValue last_chunk = JS_GetPropertyStr(ctx, this_val, "_last_chunk");
    if (!JS_IsUndefined(last_chunk)) {
        JS_SetPropertyStr(ctx, this_val, "_last_chunk", JS_UNDEFINED);
        return last_chunk;
    }
    JS_FreeValue(ctx, last_chunk);

    JSValue req_ptr_val = JS_GetPropertyStr(ctx, this_val, "_req_ptr");
    int64_t ptr_val = 0;
    if (JS_IsBigInt(req_ptr_val)) {
        JS_ToBigInt64(ctx, &ptr_val, req_ptr_val);
    }
    JS_FreeValue(ctx, req_ptr_val);
    
    if (ptr_val == 0) return JS_UNDEFINED;
    
    RequestContext *req = (RequestContext *)(uintptr_t)ptr_val;
    
    // Safety check: is req still in the list?
    int found = 0;
    if (req_list_inited) {
        struct list_head *el;
        list_for_each(el, &req_list) {
            if (list_entry(el, RequestContext, link) == req) {
                found = 1;
                break;
            }
        }
    }
    
    if (!found) return JS_UNDEFINED;

    if (req->size == 0) {
        if (req->finished) return JS_UNDEFINED;
        return JS_NULL;
    }

    JSValue chunk = JS_NewArrayBufferCopy(ctx, (const uint8_t *)req->memory, req->size);
    req->size = 0;
    req->memory[0] = 0;
    return chunk;
}

// Perform tick - called from JS loop
int js_http_process_pending(JSContext *ctx)
{
    if (!multi_handle) return 0;

    int running_handles;
    curl_multi_perform(multi_handle, &running_handles);

    // Check for streaming responses that can be resolved early
    if (req_list_inited) {
        struct list_head *el, *el1;
        list_for_each_safe(el, el1, &req_list) {
            RequestContext *req = list_entry(el, RequestContext, link);
            if (req->is_stream && !req->response_resolved) {
                long response_code = 0;
                curl_easy_getinfo(req->curl, CURLINFO_RESPONSE_CODE, &response_code);
                if (response_code != 0) {
                    // Build response object
                    JSValue response_obj = JS_NewObject(ctx);
                    JS_DefinePropertyValue(ctx, response_obj, atom_statusCode, JS_NewInt32(ctx, response_code), JS_PROP_C_W_E);
                    JS_DefinePropertyValue(ctx, response_obj, atom_ok, JS_NewBool(ctx, response_code >= 200 && response_code < 300), JS_PROP_C_W_E);
                    JS_DefinePropertyValue(ctx, response_obj, atom_headers, JS_DupValue(ctx, req->response_headers), JS_PROP_C_W_E);
                    
                    // Add readChunk method and req pointer
                    JS_SetPropertyStr(ctx, response_obj, "_req_ptr", JS_NewBigInt64(ctx, (intptr_t)req));
                    JS_SetPropertyStr(ctx, response_obj, "readChunk", JS_NewCFunction(ctx, js_http_read_chunk, "readChunk", 0));

                    // Store response object in request context to signal completion later
                    req->response_val = JS_DupValue(ctx, response_obj);

                    // Resolve promise
                    JSValue ret = JS_Call(ctx, req->resolving_funcs[0], JS_UNDEFINED, 1, (JSValueConst *)&response_obj);
                    JS_FreeValue(ctx, ret);
                    JS_FreeValue(ctx, response_obj);
                    
                    req->response_resolved = 1;
                }
            }
        }
    }

    // Check for completed transfers
    CURLMsg *msg;
    int msgs_left;
    int count = 0;
    while ((msg = curl_multi_info_read(multi_handle, &msgs_left))) {
        count++;
        if (msg->msg == CURLMSG_DONE) {
            CURL *easy = msg->easy_handle;
            RequestContext *req;
            curl_easy_getinfo(easy, CURLINFO_PRIVATE, &req);

            if (msg->data.result == CURLE_OK) {
                long response_code;
                curl_easy_getinfo(easy, CURLINFO_RESPONSE_CODE, &response_code);

                if (req->is_stream && req->response_resolved) {
                    req->finished = 1;
                    if (req->size > 0) {
                        JSValue last_chunk = JS_NewArrayBufferCopy(ctx, (const uint8_t *)req->memory, req->size);
                        JS_SetPropertyStr(ctx, req->response_val, "_last_chunk", last_chunk);
                        req->size = 0;
                    }
                    JS_SetPropertyStr(ctx, req->response_val, "_req_ptr", JS_NewBigInt64(ctx, 0));
                } else {
                    // Build response object
                    JSValue response_obj = JS_NewObject(ctx);
                    JS_DefinePropertyValue(ctx, response_obj, atom_statusCode, JS_NewInt32(ctx, response_code), JS_PROP_C_W_E);
                    JS_DefinePropertyValue(ctx, response_obj, atom_body, JS_UNDEFINED, JS_PROP_C_W_E);
                    JS_DefinePropertyValue(
                        ctx,
                        response_obj,
                        atom_bodyBytes,
                        JS_NewArrayBufferCopy(ctx, (const uint8_t *)req->memory, req->size),
                        JS_PROP_C_W_E
                    );
                    JS_DefinePropertyValue(ctx, response_obj, atom_ok, JS_NewBool(ctx, response_code >= 200 && response_code < 300), JS_PROP_C_W_E);
                    
                    JS_DefinePropertyValue(ctx, response_obj, atom_headers, JS_DupValue(ctx, req->response_headers), JS_PROP_C_W_E);

                    if (req->is_stream) {
                         JS_SetPropertyStr(ctx, response_obj, "_req_ptr", JS_NewBigInt64(ctx, 0)); // Done
                         JS_SetPropertyStr(ctx, response_obj, "readChunk", JS_NewCFunction(ctx, js_http_read_chunk, "readChunk", 0));
                         req->finished = 1;
                         req->response_resolved = 1;
                    }

                    // Resolve promise
                    JSValue ret = JS_Call(ctx, req->resolving_funcs[0], JS_UNDEFINED, 1, (JSValueConst *)&response_obj);
                    JS_FreeValue(ctx, ret);
                    JS_FreeValue(ctx, response_obj);
                }
            } else {
                if (req->is_stream && req->response_resolved) {
                    req->finished = 1;
                    JS_SetPropertyStr(ctx, req->response_val, "_req_ptr", JS_NewBigInt64(ctx, 0));
                } else {
                    // Reject promise
                    const char *error_msg = curl_easy_strerror(msg->data.result);
                    JSValue error_obj = JS_NewError(ctx);
                    JS_DefinePropertyValue(ctx, error_obj, atom_message, JS_NewString(ctx, error_msg), JS_PROP_C_W_E);
                    
                    JSValue ret = JS_Call(ctx, req->resolving_funcs[1], JS_UNDEFINED, 1, (JSValueConst *)&error_obj);
                    JS_FreeValue(ctx, ret);
                    JS_FreeValue(ctx, error_obj);
                }
            }

            // Cleanup
            curl_multi_remove_handle(multi_handle, easy);
            release_curl_handle(easy);
            FreeRequestContext(req);
        }
    }
    return count;
}

int js_http_wait(JSContext *ctx, struct pollfd *pfd, int count, int timeout_ms)
{
    if (!multi_handle) {
        return poll(pfd, count, timeout_ms);
    }

    struct curl_waitfd wait_fds_local[64];
    struct curl_waitfd *wait_fds = wait_fds_local;
    
    if (count > (int)(sizeof(wait_fds_local)/sizeof(wait_fds_local[0]))) {
        wait_fds = malloc(sizeof(struct curl_waitfd) * count);
        if (!wait_fds) return -1;
    }
    
    if (count > 0) {
        for (int i = 0; i < count; i++) {
            wait_fds[i].fd = pfd[i].fd;
            wait_fds[i].events = pfd[i].events;
            wait_fds[i].revents = 0;
        }
    }

    int ret;
    
    // Some libcurl versions/platforms have issues with -1 timeout when nfds=0
    if (timeout_ms < 0) timeout_ms = 100;

    CURLMcode rc = curl_multi_poll(multi_handle, count > 0 ? wait_fds : NULL, count, timeout_ms, &ret);
    if (rc != CURLM_OK) {
        if (wait_fds != wait_fds_local) free(wait_fds);
        return poll(pfd, count, timeout_ms);
    }

    int active_count = 0;
    if (count > 0) {
        for (int i = 0; i < count; i++) {
            pfd[i].revents = wait_fds[i].revents;
            if (pfd[i].revents != 0) active_count++;
        }
        if (wait_fds != wait_fds_local) free(wait_fds);
    }

    return active_count;
}

int js_http_status(JSContext *ctx)
{
    if (!multi_handle) return 0;
    int running_handles;
    curl_multi_perform(multi_handle, &running_handles);
    int processed = js_http_process_pending(ctx);
    if (running_handles > 0) return 1;
    if (processed > 0) return 2;
    return 0;
}

static JSValue js_http_perform(JSContext *ctx, JSValueConst this_val,
                               int argc, JSValueConst *argv)
{
    if (!multi_handle) return JS_NewInt32(ctx, 0);

    js_http_process_pending(ctx);

    int running_handles;
    curl_multi_perform(multi_handle, &running_handles);

    return JS_NewInt32(ctx, running_handles);
}

static JSValue js_http_get(JSContext *ctx, JSValueConst this_val,
                           int argc, JSValueConst *argv)
{
    JSValue method = JS_NewString(ctx, "GET");
    JSValue res = js_http_request(ctx, this_val, 4, (JSValueConst[]){
        method, argv[0], argc > 1 ? argv[1] : JS_NULL, argc > 2 ? argv[2] : JS_NULL
    });
    JS_FreeValue(ctx, method);
    return res;
}

static JSValue js_http_post(JSContext *ctx, JSValueConst this_val,
                           int argc, JSValueConst *argv)
{
    JSValue method = JS_NewString(ctx, "POST");
    JSValue res = js_http_request(ctx, this_val, 4, (JSValueConst[]){
        method, argv[0], argc > 1 ? argv[1] : JS_NULL, argc > 2 ? argv[2] : JS_NULL
    });
    JS_FreeValue(ctx, method);
    return res;
}

static JSValue js_http_put(JSContext *ctx, JSValueConst this_val,
                          int argc, JSValueConst *argv)
{
    JSValue method = JS_NewString(ctx, "PUT");
    JSValue res = js_http_request(ctx, this_val, 4, (JSValueConst[]){
        method, argv[0], argc > 1 ? argv[1] : JS_NULL, argc > 2 ? argv[2] : JS_NULL
    });
    JS_FreeValue(ctx, method);
    return res;
}

static JSValue js_http_delete(JSContext *ctx, JSValueConst this_val,
                             int argc, JSValueConst *argv)
{
    JSValue method = JS_NewString(ctx, "DELETE");
    JSValue res = js_http_request(ctx, this_val, 4, (JSValueConst[]){
        method, argv[0], argc > 1 ? argv[1] : JS_NULL, argc > 2 ? argv[2] : JS_NULL
    });
    JS_FreeValue(ctx, method);
    return res;
}

static JSValue js_http_patch(JSContext *ctx, JSValueConst this_val,
                             int argc, JSValueConst *argv)
{
    JSValue method = JS_NewString(ctx, "PATCH");
    JSValue res = js_http_request(ctx, this_val, 4, (JSValueConst[]){
        method, argv[0], argc > 1 ? argv[1] : JS_NULL, argc > 2 ? argv[2] : JS_NULL
    });
    JS_FreeValue(ctx, method);
    return res;
}

static JSValue js_http_set_max_pool_size(JSContext *ctx, JSValueConst this_val,
                                         int argc, JSValueConst *argv)
{
    int size;
    if (JS_ToInt32(ctx, &size, argv[0])) return JS_EXCEPTION;
    if (size < 0) size = 0;
    max_pool_size = size;
    
    // Trim excess
    while (free_curl_count > max_pool_size && !list_empty(&free_curl_list)) {
         struct list_head *el = free_curl_list.next;
         FreeCurlHandle *node = list_entry(el, FreeCurlHandle, link);
         list_del(el);
         curl_easy_cleanup(node->curl);
         free(node);
         free_curl_count--;
    }
    
    return JS_UNDEFINED;
}

JSValue js_http_global_init(JSContext *ctx, JSValueConst this_val,
                           int argc, JSValueConst *argv)
{
    init_atoms(ctx);
    CURLcode res = curl_global_init(CURL_GLOBAL_DEFAULT);
    if (res != CURLE_OK) {
        return JS_ThrowTypeError(ctx, "%s", curl_easy_strerror(res));
    }
    if (!multi_handle) {
        multi_handle = curl_multi_init();
    }
    return JS_UNDEFINED;
}

JSValue js_http_global_cleanup(JSContext *ctx, JSValueConst this_val,
                              int argc, JSValueConst *argv)
{
    if (multi_handle) {
        if (req_list_inited) {
            struct list_head *el, *el1;
            list_for_each_safe(el, el1, &req_list) {
                RequestContext *req = list_entry(el, RequestContext, link);
                curl_multi_remove_handle(multi_handle, req->curl);
                release_curl_handle(req->curl);
                FreeRequestContext(req);
            }
        }
        curl_multi_cleanup(multi_handle);
        multi_handle = NULL;
    }

    if (free_list_inited) {
        struct list_head *el, *el1;
        list_for_each_safe(el, el1, &free_curl_list) {
            FreeCurlHandle *node = list_entry(el, FreeCurlHandle, link);
            curl_easy_cleanup(node->curl);
            free(node);
        }
    }

    curl_global_cleanup();
    free_atoms(ctx);
    return JS_UNDEFINED;
}

static const JSCFunctionListEntry js_http_funcs[] = {
    JS_CFUNC_DEF("request", 6, js_http_request),
    JS_CFUNC_DEF("perform", 0, js_http_perform), // Export tick function
    JS_CFUNC_DEF("get", 4, js_http_get),
    JS_CFUNC_DEF("post", 4, js_http_post),
    JS_CFUNC_DEF("put", 4, js_http_put),
    JS_CFUNC_DEF("delete", 4, js_http_delete),
    JS_CFUNC_DEF("patch", 4, js_http_patch),
    JS_CFUNC_DEF("setMaxPoolSize", 1, js_http_set_max_pool_size),
    JS_CFUNC_DEF("globalInit", 0, js_http_global_init),
    JS_CFUNC_DEF("globalCleanup", 0, js_http_global_cleanup),
};

static int js_http_init(JSContext *ctx, JSModuleDef *m)
{
    return JS_SetModuleExportList(ctx, m, js_http_funcs,
                                  countof(js_http_funcs));
}

static int js_http_module_init(JSContext *ctx, JSModuleDef *m)
{
    return JS_SetModuleExportList(ctx, m, js_http_funcs,
                                  countof(js_http_funcs));
}

JSModuleDef *js_init_module_http(JSContext *ctx, const char *module_name)
{
    JSModuleDef *m;
    m = JS_NewCModule(ctx, module_name, js_http_module_init);
    if (!m)
        return NULL;
    JS_AddModuleExportList(ctx, m, js_http_funcs, countof(js_http_funcs));
    return m;
}
