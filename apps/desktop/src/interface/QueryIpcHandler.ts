import { IQuery } from "."
import { IpcHandler } from "./IpcHandler"

export class QueryIpcHandler<TRequest, TResult>
  implements IpcHandler<TRequest, TResult>
{
  constructor(
    public readonly channel: string,
    private readonly query: IQuery<TRequest, TResult>
  ) {}

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    request: TRequest
  ): Promise<TResult> {
    return this.query.execute(request)
  }
}
