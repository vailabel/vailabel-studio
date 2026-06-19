import { Item } from "@/shared/types/core"
import { studioCommands } from "@/shared/ipc/studio"

export const itemsService = {
  getItemsByProjectId: (projectId: string) =>
    studioCommands.itemsListByProject(projectId),
  getItem: (itemId: string) => studioCommands.itemsGet(itemId),
  getItemRange: (projectId: string, offset: number, limit: number) =>
    studioCommands.itemsListRange({ projectId, offset, limit }),
  createItem: (image: Partial<Item>) => studioCommands.itemsSave(image),
  updateItem: (itemId: string, updates: Partial<Item>) =>
    studioCommands.itemsSave({ id: itemId, ...updates }),
  deleteItem: (itemId: string) => studioCommands.itemsDelete(itemId),
}

