import { jest } from "@jest/globals"

// Arrange: Mocks for Electron and Node modules
jest.mock("electron", () => ({
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
  },
  app: {
    getPath: jest.fn(() => "/mock/userData"),
    relaunch: jest.fn(),
    exit: jest.fn(),
  },
}))
jest.mock("fs", () => ({
  existsSync: jest.fn(() => false),
  mkdirSync: jest.fn(),
}))
jest.mock("path", () => ({
  join: jest.fn((...args: string[]) => args.join("/")),
  dirname: jest.fn((p: string) => p.split("/").slice(0, -1).join("/")),
}))

const runMigrations = jest.fn()
jest.mock("../../db/sqliteDb", () => ({ runMigrations }))

const dbRun = jest.fn()
const dbGet = jest.fn()
const dbAll = jest.fn()
const sqlite3Mock = {
  Database: jest.fn(() => ({
    run: dbRun,
    get: dbGet,
    all: dbAll,
  })),
  verbose: jest.fn(() => sqlite3Mock),
}
// @ts-ignore
jest.mock("sqlite3", () => sqlite3Mock)

// Import after mocks
import { ipcMain, app } from "electron"
import fs from "fs"
import path from "path"

// Act: Import the file to register handlers
describe("slqiteIpc", () => {
  const handlers: Record<string, Function> = {}

  beforeAll(() => {
    // Patch handle and on to capture handlers
    ;(ipcMain.handle as jest.Mock).mockImplementation((...args) => {
      const [name, fn] = args as [string, Function]
      handlers[name] = fn
    })
    ;(ipcMain.on as jest.Mock).mockImplementation((...args) => {
      const [name, fn] = args as [string, Function]
      handlers[name] = fn
    })
    // Register handlers after mocks are set
    require("../slqiteIpc")
    require("../updateIpc")
  })

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset db mocks
    dbRun.mockImplementation((...args) => {
      const cb = args[2] as Function
      cb(null)
    })
    dbGet.mockImplementation((...args) => {
      const cb = args[2] as Function
      cb(null, { id: 1 })
    })
    dbAll.mockImplementation((...args) => {
      const cb = args[2] as Function
      cb(null, [{ id: 1 }])
    })
  })

  it("runs migrations if new db", () => {
    // The handler registration happens after beforeAll, so we need to re-require the module to trigger the migration logic
    jest.resetModules()
    require("../slqiteIpc")
    expect(runMigrations).toHaveBeenCalled()
  })

  it("sqlite:get returns row", async () => {
    const result = await handlers["sqlite:get"]({}, ["SELECT 1", []])
    expect(result).toEqual({ id: 1 })
  })

  it("sqlite:get returns error", async () => {
    dbGet.mockImplementationOnce((...args) => {
      const cb = args[2] as Function
      cb(new Error("fail"))
    })
    const result = await handlers["sqlite:get"]({}, ["SELECT 1", []])
    expect(result).toEqual({ error: "fail" })
  })

  it("sqlite:all returns rows", async () => {
    const result = await handlers["sqlite:all"]({}, ["SELECT 1", []])
    expect(result).toEqual([{ id: 1 }])
  })

  it("sqlite:all returns error", async () => {
    dbAll.mockImplementationOnce((...args) => {
      const cb = args[2] as Function
      cb(new Error("fail"))
    })
    const result = await handlers["sqlite:all"]({}, ["SELECT 1", []])
    expect(result).toEqual({ error: "fail" })
  })

  it("sqlite:run returns success", async () => {
    const result = await handlers["sqlite:run"]({}, ["UPDATE", []])
    expect(result).toEqual({ success: true })
  })

  it("sqlite:run returns error", async () => {
    dbRun.mockImplementationOnce((...args) => {
      const cb = args[2] as Function
      cb(new Error("fail"))
    })
    const result = await handlers["sqlite:run"]({}, ["UPDATE", []])
    expect(result).toEqual({ error: "fail" })
  })
})
