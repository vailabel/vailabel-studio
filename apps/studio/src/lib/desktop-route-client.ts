import { desktopRequest, isDesktopApp } from "@/lib/desktop"

export class DesktopRouteClient {
  async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    path: string,
    body?: unknown,
    authToken?: string | null
  ): Promise<T> {
    if (!isDesktopApp()) {
      throw new Error("Desktop route client is only available in the Tauri app")
    }

    return desktopRequest<T>({
      method,
      path,
      body,
      authToken,
    })
  }
}
