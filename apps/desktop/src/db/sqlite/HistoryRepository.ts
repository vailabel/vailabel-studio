import { History } from "@vailabel/core"
import { BaseRepository } from "./BaseRepository"
import { IHistoryRepository } from "./IBaseRepository"

export class HistoryRepository
  extends BaseRepository<History>
  implements IHistoryRepository
{
  constructor() {
    super(History)
  }
  // You can add entity-specific methods here if needed
}
