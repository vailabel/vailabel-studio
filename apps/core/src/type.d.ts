import { IDataAccess } from "./data"
import { DataAccess } from "./data/sources/sqlite/DataAccess"

type IpcWithEvents = {
  invoke: (channel: string, ...args: any[]) => Promise<any>
  on: (channel: string, listener: (...args: any[]) => void) => void
  off: (channel: string, listener: (...args: any[]) => void) => void
}
declare global {
  interface Window {
    ipc: IpcWithEvents
    db: DataAccess
  }
}

export {}
