import { ipcMain } from "electron"
import { IpcHandler } from "../interface/IpcHandler"
import { GetPythonVersionQuery } from "./queries/GetPythonVersionQuery"
import { InstallPythonPackageCommand } from "./command/InstallPythonPakageCommand"
import { OpenModelFileQuery } from "./queries/OpenModelFileQuery"
import { OpenExternalLinkCommand } from "./command/OpenExternalLinkCommand"
import { SafeStorageSetCommand } from "./command/SafeStorageSetCommand"
import { SafeStorageDeleteCommand } from "./command/SafeStorageDeleteCommand"
import { SafeStorageGetQuery } from "./queries/SafeStorageGetQuery"
import { SafeStorageListQuery } from "./queries/SafeStorageListQuery"
import { RunYoloCommand } from "./command/RunYoloCommand"
import { SelectPythonVenvCommand } from "./command/SelectPythonVenvCommand"

export function registerHandlers(handlers: IpcHandler[]) {
  for (const handler of handlers) {
    ipcMain.handle(handler.channel, handler.handle.bind(handler))
  }
}

const handlers: IpcHandler[] = []

// Register commands
handlers.push(new RunYoloCommand())
handlers.push(new InstallPythonPackageCommand())
handlers.push(new SelectPythonVenvCommand())
handlers.push(new OpenExternalLinkCommand())
handlers.push(new SafeStorageSetCommand())
handlers.push(new SafeStorageDeleteCommand())
// Register queries

handlers.push(new SafeStorageGetQuery())
handlers.push(new SafeStorageListQuery())

handlers.push(new GetPythonVersionQuery())
handlers.push(new OpenModelFileQuery())
registerHandlers(handlers)
