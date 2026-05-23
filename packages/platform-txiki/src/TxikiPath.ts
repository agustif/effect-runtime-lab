/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import { BadArgument } from "effect/PlatformError";

const sep = "/";

const normalizeString = (path: string, allowAboveRoot: boolean) => {
  const isAbsolute = path.charCodeAt(0) === 47 || path.charCodeAt(0) === 92;
  const segments = path.split(/[\\/]+/);
  const result: Array<string> = [];

  for (const segment of segments) {
    if (segment === "" || segment === ".") {
      continue;
    }
    if (segment === "..") {
      if (result.length > 0 && result[result.length - 1] !== "..") {
        result.pop();
      } else if (allowAboveRoot) {
        result.push("..");
      }
    } else {
      result.push(segment);
    }
  }

  let normalized = result.join("/");
  if (isAbsolute) {
    normalized = "/" + normalized;
  }
  return normalized || ".";
};

const basename: Path.Path["basename"] = (path, suffix) => {
  if (path.length === 0) {
    return "";
  }
  const normalized = path.replace(/[\\/]+$/, "");
  if (normalized.length === 0) {
    return "";
  }
  const start = normalized.lastIndexOf("/");
  let base = start === -1 ? normalized : normalized.slice(start + 1);
  if (suffix && base.endsWith(suffix)) {
    base = base.slice(0, -suffix.length);
  }
  return base;
};

const dirname: Path.Path["dirname"] = (path) => {
  if (path.length === 0) {
    return ".";
  }
  const normalized = path.replace(/[\\/]+$/, "");
  if (normalized.length === 0) {
    return "/";
  }
  const index = normalized.lastIndexOf("/");
  if (index === -1) {
    return ".";
  }
  if (index === 0) {
    return "/";
  }
  return normalized.slice(0, index);
};

const extname: Path.Path["extname"] = (path) => {
  const base = basename(path);
  if (base === "" || base === "." || base === "..") {
    return "";
  }
  const index = base.lastIndexOf(".");
  if (index <= 0) {
    return "";
  }
  return base.slice(index);
};

const format: Path.Path["format"] = (pathObject) => {
  const dir = pathObject.dir ?? "";
  const base =
    pathObject.base ??
    (pathObject.name === undefined ? "" : `${pathObject.name}${pathObject.ext ?? ""}`);

  if (dir === "") {
    return base;
  }
  if (base === "") {
    return dir;
  }
  return dir.endsWith(sep) ? `${dir}${base}` : `${dir}${sep}${base}`;
};

const isAbsolute: Path.Path["isAbsolute"] = (path) =>
  path.length > 0 && (path.charCodeAt(0) === 47 || path.charCodeAt(0) === 92);

const join: Path.Path["join"] = (...paths) => {
  if (paths.length === 0) {
    return ".";
  }
  const nonEmpty = paths.filter((path) => path.length > 0);
  if (nonEmpty.length === 0) {
    return ".";
  }
  return normalizeString(nonEmpty.join("/"), !isAbsolute(nonEmpty[0]!));
};

const normalize: Path.Path["normalize"] = (path) => {
  if (path.length === 0) {
    return ".";
  }
  const absolute = isAbsolute(path);
  const trailingSeparator = path.endsWith("/");
  let normalized = normalizeString(path, !absolute);
  if (absolute && normalized === ".") {
    normalized = "/";
  }
  if (trailingSeparator && normalized !== "/" && normalized !== ".") {
    normalized += "/";
  }
  return normalized;
};

const parse: Path.Path["parse"] = (path) => {
  if (path.length === 0) {
    return {
      root: "",
      dir: "",
      base: "",
      ext: "",
      name: "",
    };
  }
  const root = isAbsolute(path) ? "/" : "";
  const normalized = normalize(path);
  const base = basename(normalized);
  const ext = extname(base);
  const name = ext.length > 0 ? base.slice(0, -ext.length) : base;
  const dir = base === "" ? "" : dirname(normalized);
  return {
    root,
    dir: dir === "." && root === "/" ? "/" : dir,
    base,
    ext,
    name,
  };
};

const relative: Path.Path["relative"] = (from, to) => {
  if (from === to) {
    return "";
  }
  const fromResolved = resolve(from);
  const toResolved = resolve(to);
  if (fromResolved === toResolved) {
    return "";
  }
  const fromParts = fromResolved.split("/").filter(Boolean);
  const toParts = toResolved.split("/").filter(Boolean);
  let samePartsLength = 0;
  const length = Math.min(fromParts.length, toParts.length);
  while (samePartsLength < length && fromParts[samePartsLength] === toParts[samePartsLength]) {
    samePartsLength++;
  }
  const outputParts = Array(fromParts.length - samePartsLength)
    .fill("..")
    .concat(toParts.slice(samePartsLength));
  return outputParts.join("/");
};

const resolve: Path.Path["resolve"] = (...pathSegments) => {
  let resolvedPath = "";
  let resolvedAbsolute = false;
  for (let i = pathSegments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    const path = i >= 0 ? pathSegments[i]! : "/";
    if (path.length === 0) {
      continue;
    }
    resolvedPath = path + (resolvedPath.length > 0 ? `/${resolvedPath}` : "");
    resolvedAbsolute = isAbsolute(path);
  }
  const normalized = normalizeString(resolvedPath, !resolvedAbsolute);
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

const fromFileUrl: Path.Path["fromFileUrl"] = (url) =>
  Effect.try({
    try: () => {
      let pathname = url.pathname;
      if (pathname.length > 0 && pathname.charCodeAt(0) !== 47) {
        pathname = "/" + pathname;
      }
      return decodeURIComponent(pathname);
    },
    catch: (cause) =>
      new BadArgument({
        module: "TxikiPath",
        method: "fromFileUrl",
        cause,
      }),
  });

const toFileUrl: Path.Path["toFileUrl"] = (path) =>
  Effect.try({
    try: () => new URL(`file://${path.startsWith("/") ? "" : "/"}${path}`),
    catch: (cause) =>
      new BadArgument({
        module: "TxikiPath",
        method: "toFileUrl",
        cause,
      }),
  });

const toNamespacedPath: Path.Path["toNamespacedPath"] = (path) => path;

export const layer = Layer.succeed(Path.Path)({
  [Path.TypeId]: Path.TypeId,
  sep,
  basename,
  dirname,
  extname,
  format,
  fromFileUrl,
  isAbsolute,
  join,
  normalize,
  parse,
  relative,
  resolve,
  toFileUrl,
  toNamespacedPath,
});
