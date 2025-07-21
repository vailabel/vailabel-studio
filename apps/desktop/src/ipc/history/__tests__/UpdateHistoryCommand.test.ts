import { UpdateHistoryCommand } from "../UpdateHistoryCommand"
import { HistoryRepository } from "../../../db/models"

describe("UpdateHistoryCommand", () => {
  const command = new UpdateHistoryCommand()
  it("should call HistoryRepository.update with history data and id", async () => {
    const history = {
      id: "1",
      historyIndex: 2,
      canUndo: true,
      canRedo: false,
    }
    HistoryRepository.update = jest.fn()
    await command.handle({} as any, history as any)
    expect(HistoryRepository.update).toHaveBeenCalledWith(history, {
      where: { id: history.id },
    })
  })
})
