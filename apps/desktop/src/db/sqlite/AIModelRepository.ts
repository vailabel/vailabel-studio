import { AIModel } from "@vailabel/core"
import { BaseRepository } from "./BaseRepository"

export class AIModelRepository extends BaseRepository<AIModel> {
  constructor() {
    super(AIModel)
  }
}
