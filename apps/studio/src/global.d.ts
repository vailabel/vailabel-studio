/* eslint-disable @typescript-eslint/no-explicit-any */

type IpcWithEvents = {
  invoke: (channel: string, ...args: unknown[]) => Promise<any>
  on: (channel: string, listener: (...args: unknown[]) => void) => void
  off: (channel: string, listener: (...args: unknown[]) => void) => void
}
declare global {
  interface Window {
    ipc: IpcWithEvents
  }
}

export {}
