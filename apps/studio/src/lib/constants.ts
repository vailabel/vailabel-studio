import { isDesktopApp } from "@/lib/desktop"

export const APP_NAME = "Vai Studio"
export const APP_VERSION = "0.0.0" // TODO: Replace with actual version or inject at build time

export { isDesktopApp }

export const isDevMode = () => {
  return process.env.NODE_ENV === "development"
}
