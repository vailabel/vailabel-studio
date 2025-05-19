type IpcWithEvents = {
  invoke: (channel: string, ...args: any[]) => Promise<any>
  on?: (
    channel: string,
    listener: (event: unknown, ...args: any[]) => void
  ) => void
  off?: (
    channel: string,
    listener: (event: unknown, ...args: any[]) => void
  ) => void
}
declare global {
  interface Window {
    ipc: IpcWithEvents
  }
}

export {}
