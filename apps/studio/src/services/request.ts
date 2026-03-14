import { desktopRequest, isDesktopApp } from "@/lib/desktop"

type RequestMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH"

export async function request<T>(
  method: RequestMethod,
  path: string,
  body?: unknown
): Promise<T> {
  if (!isDesktopApp()) {
    throw new Error("This build only supports direct desktop commands.")
  }

  return desktopRequest<T>({
    method,
    path,
    body,
  })
}
