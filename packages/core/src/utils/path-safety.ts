import { isAbsolute, relative, resolve } from "node:path";

export function safeChildPath(root: string, requestedPath: string): string {
  const resolvedRoot = resolve(root);
  const resolvedPath = resolve(resolvedRoot, requestedPath);
  const rel = relative(resolvedRoot, resolvedPath);
  if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) {
    return resolvedPath;
  }
  throw new Error(`Path traversal blocked: ${requestedPath}`);
}
