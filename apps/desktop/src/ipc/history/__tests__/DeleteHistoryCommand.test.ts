import { DeleteHistoryCommand } from "../DeleteHistoryCommand"
import { HistoryRepository } from "../../../db/models"

describe("DeleteHistoryCommand", () => {
  const command = new DeleteHistoryCommand()
  const history = { id: "1" }

  it("should call HistoryRepository.destroy with history id", async () => {
    HistoryRepository.destroy = jest.fn()
    await command.handle({} as any, history as any)
    expect(HistoryRepository.destroy).toHaveBeenCalledWith({
      where: { id: history.id },
    })
  })
})
