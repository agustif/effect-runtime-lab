#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <signal.h>
#include <sys/resource.h>
#include <unistd.h>
#include "quickjs.h"
#include "quickjs-libc.h"
#include "quickjs-http.h"
#include "quickjs-libc-extra.h"

extern const uint8_t qjsc_polyfills[];
extern const uint32_t qjsc_polyfills_size;

static volatile sig_atomic_t timeout_triggered = 0;
static int http_initialized = 0;

enum lazy_global_kind {
  LAZY_GLOBAL_STD = 0,
  LAZY_GLOBAL_OS = 1,
  LAZY_GLOBAL_HTTP = 2,
};

static void timeout_handler(int sig) {
  (void)sig;
  timeout_triggered = 1;
}

static int js_interrupt_handler(JSRuntime *rt, void *opaque) {
  (void)rt;
  (void)opaque;
  return timeout_triggered;
}

static void setup_timeout(int seconds) {
  if (seconds <= 0) return;
  signal(SIGALRM, timeout_handler);
  alarm(seconds);
}

static void clear_timeout(void) {
  alarm(0);
}

static int parse_time(const char *value) {
  if (!value || !*value) return 0;
  return atoi(value);
}

static void cleanup_http(JSContext *ctx) {
  if (!http_initialized) return;
  js_http_global_cleanup(ctx, JS_UNDEFINED, 0, NULL);
  http_initialized = 0;
}

static void cleanup_runtime(JSRuntime *rt, JSContext *ctx) {
  if (ctx) {
    cleanup_http(ctx);
    JS_FreeContext(ctx);
  }
  if (rt) {
    js_std_free_handlers(rt);
    JS_FreeRuntime(rt);
  }
  clear_timeout();
}

static JSValue js_process_exit(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
  int code = 0;
  if (argc > 0 && JS_ToInt32(ctx, &code, argv[0])) {
    return JS_EXCEPTION;
  }
  exit(code);
  return JS_UNDEFINED;
}

static JSContext *new_custom_context(JSRuntime *rt) {
  JSContext *ctx = JS_NewContext(rt);
  if (!ctx) return NULL;
  js_init_module_std(ctx, "qjs:std");
  js_init_module_os(ctx, "qjs:os");
  js_init_module_http(ctx, "qjs:http");
  return ctx;
}

static const char *lazy_global_name(int magic) {
  switch (magic) {
    case LAZY_GLOBAL_STD:
      return "std";
    case LAZY_GLOBAL_OS:
      return "os";
    case LAZY_GLOBAL_HTTP:
      return "http";
    default:
      return NULL;
  }
}

static const char *lazy_module_name(int magic) {
  switch (magic) {
    case LAZY_GLOBAL_STD:
      return "qjs:std";
    case LAZY_GLOBAL_OS:
      return "qjs:os";
    case LAZY_GLOBAL_HTTP:
      return "qjs:http";
    default:
      return NULL;
  }
}

static JSValue ensure_http_initialized(JSContext *ctx) {
  if (http_initialized) {
    return JS_UNDEFINED;
  }

  JSValue result = js_http_global_init(ctx, JS_UNDEFINED, 0, NULL);
  if (!JS_IsException(result)) {
    http_initialized = 1;
  }
  return result;
}

static JSValue load_module_namespace(JSContext *ctx, const char *module_name, const char *filename) {
  char source[128];
  int source_len = snprintf(
      source,
      sizeof(source),
      "import * as module from '%s'; export default module;\n",
      module_name);

  if (source_len <= 0 || source_len >= (int) sizeof(source)) {
    return JS_ThrowInternalError(ctx, "failed to create bootstrap source for %s", module_name);
  }

  JSValue object = JS_Eval(
      ctx,
      source,
      (size_t) source_len,
      filename,
      JS_EVAL_TYPE_MODULE | JS_EVAL_FLAG_COMPILE_ONLY);
  if (JS_IsException(object)) {
    return object;
  }

  if (JS_ResolveModule(ctx, object) < 0) {
    JS_FreeValue(ctx, object);
    return JS_EXCEPTION;
  }
  if (js_module_set_import_meta(ctx, object, false, true) < 0) {
    JS_FreeValue(ctx, object);
    return JS_EXCEPTION;
  }

  JSValue evaluated = JS_EvalFunction(ctx, JS_DupValue(ctx, object));
  if (JS_IsException(evaluated)) {
    JS_FreeValue(ctx, object);
    return evaluated;
  }
  JS_FreeValue(ctx, evaluated);

  JSModuleDef *module = JS_VALUE_GET_PTR(object);
  JSValue namespace = JS_GetModuleNamespace(ctx, module);
  JS_FreeValue(ctx, object);
  return namespace;
}

static JSValue js_lazy_host_module_get(JSContext *ctx, JSValueConst this_val, int magic) {
  (void) this_val;

  const char *global_name = lazy_global_name(magic);
  const char *module_name = lazy_module_name(magic);
  if (!global_name || !module_name) {
    return JS_ThrowInternalError(ctx, "unknown lazy global module");
  }

  if (magic == LAZY_GLOBAL_HTTP) {
    JSValue init = ensure_http_initialized(ctx);
    if (JS_IsException(init)) {
      return init;
    }
    JS_FreeValue(ctx, init);
  }

  char filename[64];
  int filename_len = snprintf(filename, sizeof(filename), "<lazy:%s>", global_name);
  if (filename_len <= 0 || filename_len >= (int) sizeof(filename)) {
    return JS_ThrowInternalError(ctx, "failed to create lazy global filename for %s", global_name);
  }

  JSValue namespace = load_module_namespace(ctx, module_name, filename);
  if (JS_IsException(namespace)) {
    return namespace;
  }

  JSValue global = JS_GetGlobalObject(ctx);
  if (JS_DefinePropertyValueStr(
          ctx,
          global,
          global_name,
          JS_DupValue(ctx, namespace),
          JS_PROP_CONFIGURABLE | JS_PROP_ENUMERABLE | JS_PROP_WRITABLE) < 0) {
    JS_FreeValue(ctx, global);
    JS_FreeValue(ctx, namespace);
    return JS_EXCEPTION;
  }

  JS_FreeValue(ctx, global);
  return namespace;
}

static int install_lazy_host_global(JSContext *ctx, JSValueConst global, const char *name, int magic) {
  JSAtom atom = JS_NewAtom(ctx, name);
  if (atom == JS_ATOM_NULL) {
    return -1;
  }

  JSCFunctionType getter;
  getter.getter_magic = js_lazy_host_module_get;

  int result = JS_DefinePropertyGetSet(
      ctx,
      global,
      atom,
      JS_NewCFunction2(ctx, getter.generic, name, 0, JS_CFUNC_getter_magic, magic),
      JS_UNDEFINED,
      JS_PROP_CONFIGURABLE | JS_PROP_ENUMERABLE);
  JS_FreeAtom(ctx, atom);
  return result;
}

static int install_lazy_host_globals(JSContext *ctx) {
  JSValue global = JS_GetGlobalObject(ctx);
  if (JS_IsException(global)) {
    return -1;
  }

  int result = 0;
  if (install_lazy_host_global(ctx, global, "std", LAZY_GLOBAL_STD) < 0) {
    result = -1;
    goto done;
  }
  if (install_lazy_host_global(ctx, global, "os", LAZY_GLOBAL_OS) < 0) {
    result = -1;
    goto done;
  }
  if (install_lazy_host_global(ctx, global, "http", LAZY_GLOBAL_HTTP) < 0) {
    result = -1;
    goto done;
  }

done:
  JS_FreeValue(ctx, global);
  return result;
}

static int run_loop_with_http(JSContext *ctx) {
  for (;;) {
    int loop_state = js_std_loop_once(ctx);
    if (loop_state == -2) {
      return JS_HasException(ctx) ? 1 : 0;
    }

    int http_state = js_http_status(ctx);
    if (http_state == 2 || loop_state == 0) {
      continue;
    }
    if (loop_state == -1 && http_state == 0) {
      break;
    }

    js_http_wait(ctx, NULL, 0, loop_state > 0 ? loop_state : 100);
  }

  return JS_HasException(ctx) ? 1 : 0;
}

int main(int argc, char **argv) {
  if (argc < 2) {
    fprintf(stderr, "usage: %s file.js [args...]\n", argv[0]);
    return 1;
  }

  const char *timeout_env = getenv("QUICKJS_TIMEOUT");
  int timeout_seconds = parse_time(timeout_env);

  struct rlimit rl;
  if (getrlimit(RLIMIT_STACK, &rl) == 0) {
    size_t desired = 16 * 1024 * 1024;
    if (rl.rlim_cur < desired) {
      rl.rlim_cur = desired;
      if (rl.rlim_cur > rl.rlim_max) rl.rlim_cur = rl.rlim_max;
      setrlimit(RLIMIT_STACK, &rl);
    }
  }

  JSRuntime *rt = JS_NewRuntime();
  if (!rt) {
    fprintf(stderr, "qjs: cannot allocate JS runtime\n");
    return 2;
  }
  JS_SetMaxStackSize(rt, 10 * 1024 * 1024);
  JS_SetMemoryLimit(rt, 512 * 1024 * 1024);
  JS_SetGCThreshold(rt, 8 * 1024 * 1024);

  if (timeout_seconds > 0) {
    JS_SetInterruptHandler(rt, js_interrupt_handler, NULL);
    setup_timeout(timeout_seconds);
  }

  js_std_init_handlers(rt);
  JSContext *ctx = new_custom_context(rt);
  if (!ctx) {
    fprintf(stderr, "qjs: cannot allocate JS context\n");
    cleanup_runtime(rt, NULL);
    return 2;
  }

  JS_SetModuleLoaderFunc2(rt, NULL, js_module_loader, js_module_check_attributes, NULL);
  js_std_add_helpers(ctx, argc - 1, argv + 1);
  js_init_module_os_extra(ctx);
  if (install_lazy_host_globals(ctx) < 0) {
    js_std_dump_error(ctx);
    cleanup_runtime(rt, ctx);
    return 1;
  }

  js_std_eval_binary(ctx, qjsc_polyfills, qjsc_polyfills_size, 0);

  JSValue global = JS_GetGlobalObject(ctx);
  JSValue process = JS_GetPropertyStr(ctx, global, "process");
  if (!JS_IsObject(process)) {
    process = JS_NewObject(ctx);
    JS_SetPropertyStr(ctx, global, "process", JS_DupValue(ctx, process));
  }
  JS_SetPropertyStr(ctx, process, "exit", JS_NewCFunction(ctx, js_process_exit, "exit", 1));
  JS_FreeValue(ctx, process);
  JS_FreeValue(ctx, global);

  const char *filename = argv[1];
  size_t buf_len = 0;
  uint8_t *buf = js_load_file(ctx, &buf_len, filename);
  if (!buf) {
    perror(filename);
    cleanup_runtime(rt, ctx);
    return 1;
  }

  int flags = JS_EVAL_TYPE_MODULE;
  if (!JS_DetectModule((const char *)buf, buf_len)) {
    flags = JS_EVAL_TYPE_GLOBAL;
  }

  JSValue value;
  if (buf_len >= 1 && buf[0] == 0x15) {
    value = JS_ReadObject(ctx, buf, buf_len, JS_READ_OBJ_BYTECODE);
    if (!JS_IsException(value) && JS_VALUE_GET_TAG(value) == JS_TAG_MODULE) {
      if (JS_ResolveModule(ctx, value) < 0) {
        JS_FreeValue(ctx, value);
        js_free(ctx, buf);
        cleanup_runtime(rt, ctx);
        return 1;
      }
      js_module_set_import_meta(ctx, value, true, true);
      value = JS_EvalFunction(ctx, value);
    } else if (!JS_IsException(value)) {
      value = JS_EvalFunction(ctx, value);
    }
  } else if ((flags & JS_EVAL_TYPE_MASK) == JS_EVAL_TYPE_MODULE) {
    value = JS_Eval(ctx, (const char *)buf, buf_len, filename, flags | JS_EVAL_FLAG_COMPILE_ONLY);
    if (!JS_IsException(value)) {
      if (JS_ResolveModule(ctx, value) < 0) {
        JS_FreeValue(ctx, value);
        js_free(ctx, buf);
        cleanup_runtime(rt, ctx);
        return 1;
      }
      js_module_set_import_meta(ctx, value, true, true);
      value = JS_EvalFunction(ctx, value);
    }
  } else {
    value = JS_Eval(ctx, (const char *)buf, buf_len, filename, flags);
  }

  int result = 0;
  if (JS_IsException(value)) {
    js_std_dump_error(ctx);
    result = 1;
  } else {
    result = run_loop_with_http(ctx);
    if (result != 0) {
      js_std_dump_error(ctx);
    }
  }

  JS_FreeValue(ctx, value);
  js_free(ctx, buf);
  cleanup_runtime(rt, ctx);
  return result;
}
