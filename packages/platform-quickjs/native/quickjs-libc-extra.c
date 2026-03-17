#include <unistd.h>
#include <errno.h>
#include <sys/stat.h>
#include <string.h>
#include <sys/resource.h>
#include <sys/time.h>
#include "quickjs-libc.h"
#include "quickjs-libc-extra.h"
#include "cutils.h"

// Copied from quickjs-libc.c
static JSValue js_error_errno(JSContext *ctx)
{
    JSValue obj = JS_NewError(ctx);
    JS_DefinePropertyValueStr(ctx, obj, "errno",
                              JS_NewInt32(ctx, errno),
                              JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "message",
                              JS_NewString(ctx, strerror(errno)),
                              JS_PROP_C_W_E);
    return JS_Throw(ctx, obj);
}

static JSValue js_os_chmod(JSContext *ctx, JSValueConst this_val,
                           int argc, JSValueConst *argv)
{
    const char *path;
    int mode, ret;

    path = JS_ToCString(ctx, argv[0]);
    if (!path)
        return JS_EXCEPTION;
    if (JS_ToInt32(ctx, &mode, argv[1])) {
        JS_FreeCString(ctx, path);
        return JS_EXCEPTION;
    }
    ret = chmod(path, mode);
    JS_FreeCString(ctx, path);
    if (ret < 0)
        return js_error_errno(ctx);
    return JS_UNDEFINED;
}

static JSValue js_os_chown(JSContext *ctx, JSValueConst this_val,
                           int argc, JSValueConst *argv)
{
    const char *path;
    int uid, gid, ret;

    path = JS_ToCString(ctx, argv[0]);
    if (!path)
        return JS_EXCEPTION;
    if (JS_ToInt32(ctx, &uid, argv[1])) {
        JS_FreeCString(ctx, path);
        return JS_EXCEPTION;
    }
    if (JS_ToInt32(ctx, &gid, argv[2])) {
        JS_FreeCString(ctx, path);
        return JS_EXCEPTION;
    }
    ret = chown(path, uid, gid);
    JS_FreeCString(ctx, path);
    if (ret < 0)
        return js_error_errno(ctx);
    return JS_UNDEFINED;
}

static JSValue js_os_link(JSContext *ctx, JSValueConst this_val,
                          int argc, JSValueConst *argv)
{
    const char *path, *new_path;
    int ret;

    path = JS_ToCString(ctx, argv[0]);
    if (!path)
        return JS_EXCEPTION;
    new_path = JS_ToCString(ctx, argv[1]);
    if (!new_path) {
        JS_FreeCString(ctx, path);
        return JS_EXCEPTION;
    }
    ret = link(path, new_path);
    JS_FreeCString(ctx, path);
    JS_FreeCString(ctx, new_path);
    if (ret < 0)
        return js_error_errno(ctx);
    return JS_UNDEFINED;
}

static JSValue js_os_truncate(JSContext *ctx, JSValueConst this_val,
                              int argc, JSValueConst *argv)
{
    const char *path;
    int64_t length;
    int ret;

    path = JS_ToCString(ctx, argv[0]);
    if (!path)
        return JS_EXCEPTION;
    if (JS_ToInt64(ctx, &length, argv[1])) {
        JS_FreeCString(ctx, path);
        return JS_EXCEPTION;
    }
    ret = truncate(path, length);
    JS_FreeCString(ctx, path);
    if (ret < 0)
        return js_error_errno(ctx);
    return JS_UNDEFINED;
}

static JSValue js_os_ftruncate(JSContext *ctx, JSValueConst this_val,
                               int argc, JSValueConst *argv)
{
    int fd;
    int64_t length;
    int ret;

    if (JS_ToInt32(ctx, &fd, argv[0]))
        return JS_EXCEPTION;
    if (JS_ToInt64(ctx, &length, argv[1]))
        return JS_EXCEPTION;
    ret = ftruncate(fd, length);
    if (ret < 0)
        return js_error_errno(ctx);
    return JS_UNDEFINED;
}

static JSValue js_os_fsync(JSContext *ctx, JSValueConst this_val,
                           int argc, JSValueConst *argv)
{
    int fd;
    int ret;

    if (JS_ToInt32(ctx, &fd, argv[0]))
        return JS_EXCEPTION;
    ret = fsync(fd);
    if (ret < 0)
        return js_error_errno(ctx);
    return JS_UNDEFINED;
}

static JSValue js_os_memory_usage(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    struct rusage usage;
    if (getrusage(RUSAGE_SELF, &usage) != 0) {
        return JS_EXCEPTION;
    }
    JSValue obj = JS_NewObject(ctx);
#ifdef __APPLE__
    JS_SetPropertyStr(ctx, obj, "rss", JS_NewInt64(ctx, usage.ru_maxrss));
#else
    JS_SetPropertyStr(ctx, obj, "rss", JS_NewInt64(ctx, usage.ru_maxrss * 1024));
#endif
    return obj;
}

static JSValue js_os_cpu_usage(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    struct rusage usage;
    if (getrusage(RUSAGE_SELF, &usage) != 0) {
        return JS_EXCEPTION;
    }
    JSValue obj = JS_NewObject(ctx);
    JS_SetPropertyStr(ctx, obj, "user", JS_NewInt64(ctx, usage.ru_utime.tv_sec * 1000000 + usage.ru_utime.tv_usec));
    JS_SetPropertyStr(ctx, obj, "system", JS_NewInt64(ctx, usage.ru_stime.tv_sec * 1000000 + usage.ru_stime.tv_usec));
    return obj;
}

static JSValue js_os_utf8_decode(JSContext *ctx, JSValueConst this_val,
                                 int argc, JSValueConst *argv)
{
    size_t len;
    uint8_t *buf = JS_GetArrayBuffer(ctx, &len, argv[0]);
    if (!buf) return JS_EXCEPTION;
    return JS_NewStringLen(ctx, (const char *)buf, len);
}

static const JSCFunctionListEntry js_os_extra_funcs[] = {
    JS_CFUNC_DEF("chmod", 2, js_os_chmod ),
    JS_CFUNC_DEF("chown", 3, js_os_chown ),
    JS_CFUNC_DEF("link", 2, js_os_link ),
    JS_CFUNC_DEF("truncate", 2, js_os_truncate ),
    JS_CFUNC_DEF("ftruncate", 2, js_os_ftruncate ),
    JS_CFUNC_DEF("fsync", 1, js_os_fsync ),
    JS_CFUNC_DEF("memoryUsage", 0, js_os_memory_usage ),
    JS_CFUNC_DEF("cpuUsage", 0, js_os_cpu_usage ),
    JS_CFUNC_DEF("utf8Decode", 1, js_os_utf8_decode ),
};

void js_init_module_os_extra(JSContext *ctx)
{
    JSValue global = JS_GetGlobalObject(ctx);
    JSValue os = JS_GetPropertyStr(ctx, global, "os");
    if (JS_IsObject(os)) {
        JS_SetPropertyFunctionList(ctx, os, js_os_extra_funcs, countof(js_os_extra_funcs));
    }
    JS_FreeValue(ctx, os);
    JS_FreeValue(ctx, global);
}
