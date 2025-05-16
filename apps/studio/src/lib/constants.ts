export const isElectronEnv = () => {
  return (
    typeof window !== "undefined" &&
    typeof window.process === "object" &&
    window.process &&
    window.process.versions &&
    !!window.process.versions.electron
  )
}
