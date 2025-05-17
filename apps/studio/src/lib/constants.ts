import pkg from "../../package.json"

export const isElectron = () => {
  return (
    typeof window !== "undefined" &&
    window.process &&
    window.process.versions &&
    window.process.versions.electron
  )
}
export const APP_NAME = "Vai Studio"
export const APP_VERSION = pkg.version
