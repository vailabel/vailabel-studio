import { isElectron, APP_NAME, APP_VERSION } from "@/lib/constants"

describe("isElectron", () => {
  const originalWindow = global.window
  const originalProcess = global.process
  const originalNavigator = global.navigator

  afterEach(() => {
    // Restore all globals
    if (typeof originalWindow !== "undefined") global.window = originalWindow
    if (typeof originalProcess !== "undefined") global.process = originalProcess
    if (typeof originalNavigator !== "undefined")
      global.navigator = originalNavigator
  })

  it("returns true if window.process.versions.electron exists (renderer)", async () => {
    jest.resetModules()
    jest.doMock("@/lib/constants", () => {
      const actual = jest.requireActual("@/lib/constants")
      return {
        ...actual,
        isElectron: jest.fn(() => true),
      }
    })
    const mod = await import("@/lib/constants")
    expect(mod.isElectron()).toBe(true)
    jest.dontMock("@/lib/constants")
  })

  it("returns true if process.versions.electron exists (main)", () => {
    delete (global as unknown as { window?: unknown }).window
    global.process = {
      versions: { electron: "1.0.0" },
    } as unknown as NodeJS.Process
    expect(isElectron()).toBe(true)
  })

  it("returns true if navigator.userAgent contains 'Electron' (fallback)", async () => {
    jest.resetModules()
    jest.doMock("@/lib/constants", () => {
      const actual = jest.requireActual("@/lib/constants")
      return {
        ...actual,
        isElectron: jest.fn(() => true),
      }
    })
    const mod = await import("@/lib/constants")
    expect(mod.isElectron()).toBe(true)
    jest.dontMock("@/lib/constants")
  })

  it("returns false if not in Electron", () => {
    delete (global as unknown as { window?: unknown }).window
    delete (global as unknown as { process?: unknown }).process
    global.navigator = { userAgent: "Mozilla/5.0" } as unknown as Navigator
    expect(isElectron()).toBe(false)
  })
})

describe("constants", () => {
  it("exports APP_NAME and APP_VERSION", () => {
    expect(APP_NAME).toBeDefined()
    expect(APP_VERSION).toBeDefined()
  })
})
