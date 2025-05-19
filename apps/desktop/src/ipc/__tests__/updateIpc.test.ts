import { jest } from "@jest/globals"

// Arrange: Mock Electron
jest.mock("electron", () => ({
  ipcMain: { on: jest.fn() },
  app: { relaunch: jest.fn(), exit: jest.fn() },
}))

import { ipcMain, app } from "electron"

// Act: Import the file to register the handler
import "../updateIpc"

describe("updateIpc", () => {
  it("calls relaunch and exit on 'restart-app' event", () => {
    const onMock = ipcMain.on as jest.Mock
    expect(onMock).toHaveBeenCalledWith("restart-app", expect.any(Function))
    // Simulate the event
    const call = onMock.mock.calls.find((c) => c[0] === "restart-app")
    expect(call).toBeDefined()
    const handler = call && (call[1] as Function)
    if (handler) handler()
    expect(app.relaunch).toHaveBeenCalled()
    expect(app.exit).toHaveBeenCalledWith(0)
  })
})
