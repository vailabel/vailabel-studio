export interface ICommand<TRequest, TResult> {
  execute(request: TRequest): Promise<TResult>
}

export interface IQuery<TRequest, TResult> {
  execute(request: TRequest): Promise<TResult>
}
