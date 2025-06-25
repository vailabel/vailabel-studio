import {
  Menu,
  MenuItemConstructorOptions,
  shell,
  BrowserWindow,
  app,
} from "electron"
import pkgJson from "../../package.json"
import { jsonSetting } from "../utils"

export function setAppMenu(mainWindow: BrowserWindow) {
  const displayName = pkgJson.productName ?? pkgJson.name ?? "VAI Label Desktop"
  const menuTemplate: MenuItemConstructorOptions[] = []

  // macOS app menu
  if (process.platform === "darwin") {
    menuTemplate.push({
      label: displayName,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    })
  }

  // File menu
  const fileSubmenu: MenuItemConstructorOptions[] = [
    {
      label: "Open",
      accelerator: "CmdOrCtrl+O",
      click: () => {
        mainWindow.webContents.send("open-file-dialog")
      },
    },
    {
      label: "Save",
      accelerator: "CmdOrCtrl+S",
      click: () => {
        mainWindow.webContents.send("save-file-dialog")
      },
    },
    {
      label: "Save As",
      accelerator: "CmdOrCtrl+Shift+S",
      click: () => {
        mainWindow.webContents.send("save-file-as-dialog")
      },
    },
    { type: "separator" },
    {
      label: "New Project",
      accelerator: "CmdOrCtrl+N",
      click: () => {
        mainWindow.webContents.send("new-project")
      },
    },
    {
      label: "Open Project",
      accelerator: "CmdOrCtrl+Shift+O",
      click: () => {
        mainWindow.webContents.send("open-project-dialog")
      },
    },
    { type: "separator" },
    {
      label: "Export",
      accelerator: "CmdOrCtrl+E",
      click: () => {
        mainWindow.webContents.send("export-file-dialog")
      },
    },
    {
      label: "Preferences",
      accelerator: "CmdOrCtrl+,",
      click: () => {
        mainWindow.webContents.send("open-preferences")
      },
    },
  ]
  if (process.platform !== "darwin") {
    fileSubmenu.push({ type: "separator" })
    fileSubmenu.push({
      label: "Exit",
      accelerator: "CmdOrCtrl+Q",
      click: () => {
        app.quit()
      },
    })
  }
  menuTemplate.push({ label: "File", submenu: fileSubmenu })

  menuTemplate.push({
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "selectAll" },
    ],
  })
  menuTemplate.push({
    label: "View",
    submenu: [
      { role: "reload" },
      { role: "toggleDevTools" },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" },
    ],
  })
  menuTemplate.push({
    label: "Help",
    submenu: [
      {
        label: "Check for Updates",
        click: () => {
          mainWindow.webContents.send("check-for-updates")
        },
      },
      {
        label: "Skip This Version",
        click: () => {
          const { dialog } = require("electron")
          const version = pkgJson.version
          const settings = jsonSetting()
          settings.setValue("skippedVersion", version)
          dialog.showMessageBox({
            type: "info",
            message: `Version ${version} will be skipped for updates.`,
            buttons: ["OK"],
          })
        },
      },
      {
        label: "Learn More",
        click: () => {
          shell.openExternal("https://vailabel.com")
        },
      },
      {
        label: "Info",
        click: () => {
          const { dialog } = require("electron")
          const path = require("path")
          const pkg = require("../../package.json")
          const displayName = pkg.productName ?? pkg.name ?? "VAI Label Desktop"
          const iconPath = pkg.icon
            ? path.join(__dirname, "../../", pkg.icon)
            : undefined
          dialog.showMessageBox({
            type: "info",
            title: `About ${displayName}`,
            message: `${displayName}\nVersion ${pkg.version}\nhttps://vailabel.com`,
            icon: iconPath,
            buttons: ["OK"],
          })
        },
      },
    ],
  })

  const menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)
}
