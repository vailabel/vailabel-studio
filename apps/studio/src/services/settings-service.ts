import { Settings } from "@vailabel/core"
import { request } from "./request"

export const settingsService = {
  list: () => request<Settings[]>("GET", "/settings"),
  getByKey: (key: string) => request<Settings>("GET", `/settings/${key}`),
  update: (key: string, value: string) =>
    request<Settings>("POST", "/settings", { key, value }),
}
