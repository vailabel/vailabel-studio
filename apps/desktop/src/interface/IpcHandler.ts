export interface IpcHandler<TRequest = any, TResult = any> {
  channel: string
  handle(
    event: Electron.IpcMainInvokeEvent,
    request: TRequest
  ): Promise<TResult>
}
