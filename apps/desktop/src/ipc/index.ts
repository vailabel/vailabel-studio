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
import { DeleteProjectCommand, FetchProjectsQuery, SaveProjectCommand, UpdateProjectCommand } from "./projects"
import { DeleteLabelCommand, FetchLabelQuery, SaveLabelCommand, UpdateLabelCommand } from "./labels"
import { DeleteUserCommand, FetchUserQuery, SaveUserCommand, UpdateUserCommand } from "./users"
import { DeleteAIModelCommand, FetchAIModelQuery, SaveAIModelCommand, UpdateAIModelCommand } from "./ai-models"
import { DeleteTaskCommand, FetchTaskQuery, SaveTaskCommand, UpdateTaskCommand } from "./tasks"
import { FetchSettingsQuery, SaveOrUpdateSettingsCommand } from "./settings"
import { DeleteImageDataCommand, FetchImageDataByProjectidQuery, FetchImageDataQuery, SaveImageDataCommand, UpdateImageDataCommand } from "./image-data"
import { DeleteHistoryCommand, FetchHistoryQuery, SaveHistoryCommand, UpdateHistoryCommand } from "./history"
import { DeleteAnnotationCommand, FetchAnnotationQuery, SaveAnnotationCommand, UpdateAnnotationCommand } from "./annotations"


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

// Register AI models
handlers.push(new FetchProjectsQuery())
handlers.push(new SaveProjectCommand())
handlers.push(new DeleteProjectCommand())
handlers.push(new UpdateProjectCommand())


// Register labels
handlers.push(new FetchLabelQuery())
handlers.push(new DeleteLabelCommand())
handlers.push(new SaveLabelCommand())
handlers.push(new UpdateLabelCommand())

// Register users
handlers.push(new FetchUserQuery())
handlers.push(new DeleteUserCommand())
handlers.push(new SaveUserCommand())
handlers.push(new UpdateUserCommand())

handlers.push(new FetchAIModelQuery())
handlers.push(new DeleteAIModelCommand())
handlers.push(new SaveAIModelCommand())
handlers.push(new UpdateAIModelCommand())


// Register tasks
handlers.push(new FetchTaskQuery())
handlers.push(new DeleteTaskCommand())
handlers.push(new SaveTaskCommand())
handlers.push(new UpdateTaskCommand())

// Register settings
handlers.push(new FetchSettingsQuery())
handlers.push(new SaveOrUpdateSettingsCommand())



// Register image data
handlers.push(new FetchImageDataQuery())
handlers.push(new DeleteImageDataCommand())
handlers.push(new SaveImageDataCommand())
handlers.push(new UpdateImageDataCommand())
handlers.push(new FetchImageDataByProjectidQuery())


// Register history
handlers.push(new FetchHistoryQuery())
handlers.push(new DeleteHistoryCommand())
handlers.push(new SaveHistoryCommand())
handlers.push(new UpdateHistoryCommand())

// Register annotations
handlers.push(new FetchAnnotationQuery())
handlers.push(new DeleteAnnotationCommand())
handlers.push(new SaveAnnotationCommand())
handlers.push(new UpdateAnnotationCommand())

registerHandlers(handlers)
