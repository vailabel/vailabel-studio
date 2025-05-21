import { ICommand } from "."
import { IpcHandler } from "./IpcHandler"

export class CommandIpcHandler<TRequest, TResult>
  implements IpcHandler<TRequest, TResult>
{
  constructor(
    public readonly channel: string,
    private readonly command: ICommand<TRequest, TResult>
  ) {}

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    request: TRequest
  ): Promise<TResult> {
    return this.command.execute(request)
  }
}
