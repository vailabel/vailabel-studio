import {
  Project,
  Label,
  Annotation,
  ImageData,
  History,
  Task,
  AIModel,
  Settings,
  User,
} from "@vailabel/core"
import { ElectronApiDataAdapter } from "../ElectronApiDataAdaptor"

describe("ElectronApiDataAdapter", () => {
  let adapter: ElectronApiDataAdapter
  let mockInvoke: jest.Mock
  beforeAll(() => {
    // nothing here, see beforeEach
  })

  beforeEach(() => {
    mockInvoke = jest.fn()
    // Redefine window.ipc for each test so ElectronApiDataAdapter uses the correct mock
    Object.defineProperty(window, "ipc", {
      value: { invoke: mockInvoke, on: jest.fn(), off: jest.fn() },
      configurable: true,
      writable: true,
    })
    adapter = new ElectronApiDataAdapter()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("calls updateProject with correct args", async () => {
    mockInvoke.mockResolvedValue(undefined)
    await adapter.updateProject("pid", { name: "test" })
    expect(mockInvoke).toHaveBeenCalledWith("update:projects", "pid", {
      name: "test",
    })
  })

  it("calls fetchProjects", async () => {
    mockInvoke.mockResolvedValue([])
    await adapter.fetchProjects()
    expect(mockInvoke).toHaveBeenCalledWith("fetch:projects")
  })

  it("calls saveProject", async () => {
    const project = new Project()
    project.id = "1"
    project.name = "p"
    mockInvoke.mockResolvedValue(undefined)
    await adapter.saveProject(project)
    expect(mockInvoke).toHaveBeenCalledWith("save:projects", project)
  })

  it("calls deleteProject", async () => {
    mockInvoke.mockResolvedValue(undefined)
    await adapter.deleteProject("pid")
    expect(mockInvoke).toHaveBeenCalledWith("delete:projects", "pid")
  })

  it("calls updateLabel", async () => {
    mockInvoke.mockResolvedValue(undefined)
    await adapter.updateLabel("lid", { name: "label" })
    expect(mockInvoke).toHaveBeenCalledWith("update:labels", "lid", {
      name: "label",
    })
  })

  it("calls fetchLabels", async () => {
    mockInvoke.mockResolvedValue([])
    await adapter.fetchLabels("pid")
    expect(mockInvoke).toHaveBeenCalledWith("fetch:labels", "pid")
  })

  it("calls saveLabel", async () => {
    const label = new Label()
    label.id = "1"
    label.name = "l"
    label.color = "color"
    label.projectId = "projectId"
    mockInvoke.mockResolvedValue(undefined)
    await adapter.saveLabel(label)
    expect(mockInvoke).toHaveBeenCalledWith("save:labels", label)
  })

  // it("calls deleteLabel", async () => {
  //   mockInvoke.mockResolvedValue(undefined)
  //   await adapter.deleteLabel("lid")
  //   expect(mockInvoke).toHaveBeenCalledWith("delete:labels", "lid")
  // })

  it("calls fetchImageDataByProjectId", async () => {
    mockInvoke.mockResolvedValue([])
    await adapter.fetchImageDataByProjectId("pid")
    expect(mockInvoke).toHaveBeenCalledWith("fetch:imageDataByProjectId", "pid")
  })

  it("calls updateAnnotation", async () => {
    mockInvoke.mockResolvedValue(undefined)
    await adapter.updateAnnotation("aid", { id: "aid" })
    expect(mockInvoke).toHaveBeenCalledWith("update:annotations", { id: "aid", updates: { id: "aid" } })
  })

  it("calls fetchAnnotations", async () => {
    mockInvoke.mockResolvedValue([])
    await adapter.fetchAnnotations("pid")
    expect(mockInvoke).toHaveBeenCalledWith("fetch:annotations", "pid")
  })

  it("calls saveAnnotation", async () => {
    const annotation = new Annotation()
    annotation.id = "1"
    annotation.imageId = "imageId"
    annotation.labelId = "l1"
    annotation.name = "test-annotation"
    annotation.type = "box"
    annotation.coordinates = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]
    annotation.createdAt = new Date()
    mockInvoke.mockResolvedValue(undefined)
    await adapter.saveAnnotation(annotation)
    expect(mockInvoke).toHaveBeenCalledWith("save:annotations", annotation)
  })

  it("calls deleteAnnotation", async () => {
    mockInvoke.mockResolvedValue(undefined)
    await adapter.deleteAnnotation("aid")
    expect(mockInvoke).toHaveBeenCalledWith("delete:annotations", "aid")
  })

  it("calls getAnnotationsByImageId", async () => {
    mockInvoke.mockResolvedValue([])
    await adapter.getAnnotationsByImageId("imgid")
    expect(mockInvoke).toHaveBeenCalledWith(
      "fetch:getAnnotationsByImageId",
      "imgid"
    )
  })

  it("calls updateImageData", async () => {
    mockInvoke.mockResolvedValue(undefined)
    await adapter.updateImageData("imgid", { url: "u" })
    expect(mockInvoke).toHaveBeenCalledWith("update:imageData", { id: "imgid", updates: { url: "u" } })
  })

  it("calls fetchImageData", async () => {
    mockInvoke.mockResolvedValue([])
    await adapter.fetchImageData("pid")
    expect(mockInvoke).toHaveBeenCalledWith("fetch:imageData", "pid")
  })

  it("calls saveImageData", async () => {
    const imageData = new ImageData()
    imageData.id = "imgid"
    imageData.url = "url"
    imageData.projectId = "pid"
    mockInvoke.mockResolvedValue(undefined)
    await adapter.saveImageData(imageData)
    expect(mockInvoke).toHaveBeenCalledWith("save:imageData", imageData)
  })

  it("calls deleteImageData", async () => {
    mockInvoke.mockResolvedValue(undefined)
    await adapter.deleteImageData("imgid")
    expect(mockInvoke).toHaveBeenCalledWith("delete:imageData", "imgid")
  })

  it("calls fetchImageDataById", async () => {
    mockInvoke.mockResolvedValue(undefined)
    await adapter.fetchImageDataById("imgid")
    expect(mockInvoke).toHaveBeenCalledWith("fetch:imageDataById", "imgid")
  })

  it("calls updateHistory", async () => {
    mockInvoke.mockResolvedValue(undefined)
    await adapter.updateHistory("hid", { id: "hid" })
    expect(mockInvoke).toHaveBeenCalledWith("update:history", { id: "hid", updates: { id: "hid" } })
  })

  it("calls fetchHistory", async () => {
    mockInvoke.mockResolvedValue([])
    await adapter.fetchHistory("pid")
    expect(mockInvoke).toHaveBeenCalledWith("fetch:history", "pid")
  })

  it("calls saveHistory", async () => {
    const history = new History()
    history.id = "1"
    history.historyIndex = 0
    history.canUndo = true
    history.canRedo = false
    history.createdAt = new Date()
    mockInvoke.mockResolvedValue(undefined)
    await adapter.saveHistory(history)
    expect(mockInvoke).toHaveBeenCalledWith("save:history", history)
  })

  it("calls deleteHistory", async () => {
    mockInvoke.mockResolvedValue(undefined)
    await adapter.deleteHistory("hid")
    expect(mockInvoke).toHaveBeenCalledWith("delete:history", "hid")
  })

  it("calls updateTask", async () => {
    mockInvoke.mockResolvedValue(undefined)
    await adapter.updateTask("tid", { name: "t" })
    expect(mockInvoke).toHaveBeenCalledWith("update:tasks", { id: "tid", updates: { name: "t" } })
  })

  it("calls fetchTasks", async () => {
    mockInvoke.mockResolvedValue([])
    await adapter.fetchTasks("pid")
    expect(mockInvoke).toHaveBeenCalledWith("fetch:tasks", "pid")
  })

  it("calls saveTask", async () => {
    const task = new Task()
    task.id = "1"
    task.name = "t"
    task.description = "desc"
    task.projectId = "projectId"
    task.status = "pending"
    mockInvoke.mockResolvedValue(undefined)
    await adapter.saveTask(task)
    expect(mockInvoke).toHaveBeenCalledWith("save:tasks", task)
  })

  it("calls deleteTask", async () => {
    mockInvoke.mockResolvedValue(undefined)
    await adapter.deleteTask("tid")
    expect(mockInvoke).toHaveBeenCalledWith("delete:tasks", "tid")
  })

  it("calls updateAIModel", async () => {
    mockInvoke.mockResolvedValue(undefined)
    await adapter.updateAIModel("aid", { name: "m" })
    expect(mockInvoke).toHaveBeenCalledWith("update:aiModels", { id: "aid", updates: { name: "m" } })
  })

  it("calls fetchAIModels", async () => {
    mockInvoke.mockResolvedValue([])
    await adapter.fetchAIModels("pid")
    expect(mockInvoke).toHaveBeenCalledWith("fetch:aiModels", "pid")
  })

  it("calls saveAIModel", async () => {
    const aiModel = new AIModel()
    aiModel.id = "1"
    aiModel.name = "m"
    aiModel.description = "desc"
    aiModel.version = "v1"
    aiModel.modelPath = "/path/to/model"
    aiModel.configPath = "/path/to/config"
    aiModel.modelSize = 123
    aiModel.isCustom = false
    aiModel.createdAt = new Date()
    mockInvoke.mockResolvedValue(undefined)
    await adapter.saveAIModel(aiModel)
    expect(mockInvoke).toHaveBeenCalledWith("save:aiModels", aiModel)
  })

  it("calls deleteAIModel", async () => {
    mockInvoke.mockResolvedValue(undefined)
    await adapter.deleteAIModel("aid")
    expect(mockInvoke).toHaveBeenCalledWith("delete:aiModels", "aid")
  })

  it("calls fetchSettings", async () => {
    mockInvoke.mockResolvedValue([])
    await adapter.fetchSettings()
    expect(mockInvoke).toHaveBeenCalledWith("fetch:settings")
  })

  it("calls saveOrUpdateSettings", async () => {
    const settings = new Settings()
    settings.id = "1"
    settings.key = "theme"
    settings.value = "dark"
    mockInvoke.mockResolvedValue(undefined)
    await adapter.saveOrUpdateSettings(settings)
    expect(mockInvoke).toHaveBeenCalledWith("saveOrUpdate:settings", settings)
  })

  it("calls updateUser", async () => {
    mockInvoke.mockResolvedValue(undefined)
    await adapter.updateUser("uid", { name: "u" })
    expect(mockInvoke).toHaveBeenCalledWith("update:users", "uid", {
      name: "u",
    })
  })

  it("calls fetchUsers", async () => {
    mockInvoke.mockResolvedValue([])
    await adapter.fetchUsers()
    expect(mockInvoke).toHaveBeenCalledWith("fetch:users")
  })

  it("calls saveUser", async () => {
    const user = new User()
    user.id = "1"
    user.name = "u"
    user.email = "email@example.com"
    user.role = "role"
    mockInvoke.mockResolvedValue(undefined)
    await adapter.saveUser(user)
    expect(mockInvoke).toHaveBeenCalledWith("save:users", user)
  })

  it("calls deleteUser", async () => {
    mockInvoke.mockResolvedValue(undefined)
    await adapter.deleteUser("uid")
    expect(mockInvoke).toHaveBeenCalledWith("delete:users", "uid")
  })

  it("calls login", async () => {
    const user = new User()
    user.id = "1"
    user.name = "u"
    user.email = "email@example.com"
    user.role = "role"
    mockInvoke.mockResolvedValue(user)
    const result = await adapter.login("email@example.com", "pass")
    expect(mockInvoke).toHaveBeenCalledWith("login:users", {
      email: "email@example.com",
      password: "pass",
    })
    expect(result).toBe(user)
  })

  it("calls logout", async () => {
    mockInvoke.mockResolvedValue(undefined)
    await adapter.logout()
    expect(mockInvoke).toHaveBeenCalledWith("logout:users")
  })

  it("calls syncData", async () => {
    mockInvoke.mockResolvedValue(undefined)
    await adapter.syncData()
    expect(mockInvoke).toHaveBeenCalledWith("sync:users")
  })
})
