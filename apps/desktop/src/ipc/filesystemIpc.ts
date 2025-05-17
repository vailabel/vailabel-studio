import { ipcMain } from "electron"
import * as fs from "fs/promises"
import * as path from "path"
// Save image
ipcMain.handle("fs-save-image", async (_event, { path: filePath, data }) => {
  await fs.writeFile(filePath, Buffer.from(data))
})

// Load image
ipcMain.handle("fs-load-image", async (_event, { path: filePath }) => {
  return fs.readFile(filePath)
})

// Delete image
ipcMain.handle("fs-delete-image", async (_event, { path: filePath }) => {
  await fs.unlink(filePath)
})

// List images
ipcMain.handle("fs-list-images", async (_event, { directory }) => {
  return fs.readdir(directory)
})

// Get full path for an image id
ipcMain.handle("fs-get-path", async (_event, { directory, id }) => {
  return path.join(directory, id)
})

// Get base name of a file
ipcMain.handle("fs-get-base-name", async (_event, { file }) => {
  return path.basename(file)
})
