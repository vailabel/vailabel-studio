import { SaveHistoryCommand } from "../SaveHistoryCommand"
import { HistoryRepository } from "../../../db/models"

describe("SaveHistoryCommand", () => {
  const command = new SaveHistoryCommand()
  it("should call HistoryRepository.create with history data", async () => {
    const history = {
      id: "1",
      historyIndex: 2,
      canUndo: true,
      canRedo: false,
    }
    HistoryRepository.create = jest.fn()
    await command.handle({} as any, history as any)
    expect(HistoryRepository.create).toHaveBeenCalledWith(history)
  })
})
