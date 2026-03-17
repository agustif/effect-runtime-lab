#ifndef QUICKJS_HTTP_H
#define QUICKJS_HTTP_H

#include "quickjs.h"

#if !defined(_WIN32)
#include <poll.h>
#endif

JSModuleDef *js_init_module_http(JSContext *ctx, const char *module_name);
JSValue js_http_global_init(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv);
JSValue js_http_global_cleanup(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv);

// Native Event Loop Integration
int js_http_process_pending(JSContext *ctx);
int js_http_wait(JSContext *ctx, struct pollfd *pfd, int count, int timeout_ms);
int js_http_status(JSContext *ctx);

#endif
