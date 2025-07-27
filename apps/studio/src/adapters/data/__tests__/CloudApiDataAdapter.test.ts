import { CloudApiDataAdapter } from "../CloudApiDataAdapter"
import { ApiClient } from "@/lib/ApiClient"
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

jest.mock("@/lib/ApiClient")

describe("CloudApiDataAdapter", () => {
  let adapter: CloudApiDataAdapter
  let mockApi: jest.Mocked<ApiClient>

  beforeEach(() => {
    mockApi = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
    ;(ApiClient as jest.Mock).mockImplementation(() => mockApi)
    adapter = new CloudApiDataAdapter()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("calls getAnnotationsByImageId", async () => {
    mockApi.get.mockResolvedValue([])
    await adapter.getAnnotationsByImageId("imgid")
    expect(mockApi.get).toHaveBeenCalledWith("/images/imgid/annotations")
  })

  it("calls fetchImageDataById", async () => {
    mockApi.get.mockResolvedValue(undefined)
    await adapter.fetchImageDataById("imgid")
    expect(mockApi.get).toHaveBeenCalledWith("/images/imgid")
  })

  it("calls fetchImageDataByProjectId", async () => {
    mockApi.get.mockResolvedValue([])
    await adapter.fetchImageDataByProjectId("pid")
    expect(mockApi.get).toHaveBeenCalledWith("/projects/pid/images")
  })

  it("calls updateProject", async () => {
    mockApi.put.mockResolvedValue(undefined)
    await adapter.updateProject("pid", { name: "test" })
    expect(mockApi.put).toHaveBeenCalledWith("/projects/pid", { name: "test" })
  })

  it("calls updateLabel", async () => {
    mockApi.put.mockResolvedValue(undefined)
    await adapter.updateLabel("lid", { name: "label" })
    expect(mockApi.put).toHaveBeenCalledWith("/labels/lid", { name: "label" })
  })

  it("calls updateAnnotation", async () => {
    mockApi.put.mockResolvedValue(undefined)
    await adapter.updateAnnotation("aid", { id: "aid" })
    expect(mockApi.put).toHaveBeenCalledWith("/annotations/aid", { id: "aid" })
  })

  it("calls updateImageData", async () => {
    mockApi.put.mockResolvedValue(undefined)
    await adapter.updateImageData("imgid", { url: "u" })
    expect(mockApi.put).toHaveBeenCalledWith("/images/imgid", { url: "u" })
  })

  it("calls updateHistory", async () => {
    mockApi.put.mockResolvedValue(undefined)
    await adapter.updateHistory("hid", { id: "hid" })
    expect(mockApi.put).toHaveBeenCalledWith("/history/hid", { id: "hid" })
  })

  it("calls updateTask", async () => {
    mockApi.put.mockResolvedValue(undefined)
    await adapter.updateTask("tid", { name: "t" })
    expect(mockApi.put).toHaveBeenCalledWith("/tasks/tid", { name: "t" })
  })

  it("calls updateAIModel", async () => {
    mockApi.put.mockResolvedValue(undefined)
    await adapter.updateAIModel("aid", { name: "m" })
    expect(mockApi.put).toHaveBeenCalledWith("/ai-models/aid", { name: "m" })
  })

  it("calls updateUser", async () => {
    mockApi.put.mockResolvedValue(undefined)
    await adapter.updateUser("uid", { name: "u" })
    expect(mockApi.put).toHaveBeenCalledWith("/users/uid", { name: "u" })
  })

  it("calls fetchProjects", async () => {
    mockApi.get.mockResolvedValue([])
    await adapter.fetchProjects()
    expect(mockApi.get).toHaveBeenCalledWith("/projects")
  })

  it("calls saveProject", async () => {
    const project = new Project()
    project.id = "1"
    project.name = "p"
    mockApi.post.mockResolvedValue(undefined)
    await adapter.saveProject(project)
    expect(mockApi.post).toHaveBeenCalledWith("/projects", project)
  })

  it("calls deleteProject", async () => {
    mockApi.delete.mockResolvedValue(undefined)
    await adapter.deleteProject("pid")
    expect(mockApi.delete).toHaveBeenCalledWith("/projects/pid")
  })

  it("calls fetchLabels", async () => {
    mockApi.get.mockResolvedValue([])
    await adapter.fetchLabels("pid")
    expect(mockApi.get).toHaveBeenCalledWith("/projects/pid/labels")
  })

  it("calls saveLabel", async () => {
    const label = new Label()
    label.id = "1"
    label.name = "l"
    label.color = "color"
    label.projectId = "projectId"
    mockApi.post.mockResolvedValue(undefined)
    await adapter.saveLabel(label)
    expect(mockApi.post).toHaveBeenCalledWith("/labels", label)
  })

  it("calls deleteLabel", async () => {
    mockApi.delete.mockResolvedValue(undefined)
    await adapter.deleteLabel("lid")
    expect(mockApi.delete).toHaveBeenCalledWith("/labels/lid")
  })

  it("calls fetchAnnotations", async () => {
    mockApi.get.mockResolvedValue([])
    await adapter.fetchAnnotations("pid")
    expect(mockApi.get).toHaveBeenCalledWith("/projects/pid/annotations")
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
    mockApi.post.mockResolvedValue(undefined)
    await adapter.saveAnnotation(annotation)
    expect(mockApi.post).toHaveBeenCalledWith("/annotations", annotation)
  })

  it("calls deleteAnnotation", async () => {
    mockApi.delete.mockResolvedValue(undefined)
    await adapter.deleteAnnotation("aid")
    expect(mockApi.delete).toHaveBeenCalledWith("/annotations/aid")
  })

  it("calls fetchImageData", async () => {
    mockApi.get.mockResolvedValue([])
    await adapter.fetchImageData("pid")
    expect(mockApi.get).toHaveBeenCalledWith("/projects/pid/images")
  })

  it("calls saveImageData", async () => {
    const imageData = new ImageData()
    imageData.id = "imgid"
    imageData.url = "url"
    imageData.projectId = "pid"
    mockApi.post.mockResolvedValue(undefined)
    await adapter.saveImageData(imageData)
    expect(mockApi.post).toHaveBeenCalledWith("/images", imageData)
  })

  it("calls deleteImageData", async () => {
    mockApi.delete.mockResolvedValue(undefined)
    await adapter.deleteImageData("imgid")
    expect(mockApi.delete).toHaveBeenCalledWith("/images/imgid")
  })

  it("calls fetchHistory", async () => {
    mockApi.get.mockResolvedValue([])
    await adapter.fetchHistory("pid")
    expect(mockApi.get).toHaveBeenCalledWith("/projects/pid/history")
  })

  it("calls saveHistory", async () => {
    const history = new History()
    history.id = "1"
    history.historyIndex = 0
    history.canUndo = true
    history.canRedo = false
    history.createdAt = new Date()
    mockApi.post.mockResolvedValue(undefined)
    await adapter.saveHistory(history)
    expect(mockApi.post).toHaveBeenCalledWith("/history", history)
  })

  it("calls deleteHistory", async () => {
    mockApi.delete.mockResolvedValue(undefined)
    await adapter.deleteHistory("hid")
    expect(mockApi.delete).toHaveBeenCalledWith("/history/hid")
  })

  it("calls fetchTasks", async () => {
    mockApi.get.mockResolvedValue([])
    await adapter.fetchTasks("pid")
    expect(mockApi.get).toHaveBeenCalledWith("/projects/pid/tasks")
  })

  it("calls saveTask", async () => {
    const task = new Task()
    task.id = "1"
    task.name = "t"
    task.description = "desc"
    task.projectId = "projectId"
    task.status = "pending"
    mockApi.post.mockResolvedValue(undefined)
    await adapter.saveTask(task)
    expect(mockApi.post).toHaveBeenCalledWith("/tasks", task)
  })

  it("calls deleteTask", async () => {
    mockApi.delete.mockResolvedValue(undefined)
    await adapter.deleteTask("tid")
    expect(mockApi.delete).toHaveBeenCalledWith("/tasks/tid")
  })

  it("calls fetchAIModels", async () => {
    mockApi.get.mockResolvedValue([])
    await adapter.fetchAIModels("pid")
    expect(mockApi.get).toHaveBeenCalledWith("/projects/pid/ai-models")
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
    mockApi.post.mockResolvedValue(undefined)
    await adapter.saveAIModel(aiModel)
    expect(mockApi.post).toHaveBeenCalledWith("/ai-models", aiModel)
  })

  it("calls deleteAIModel", async () => {
    mockApi.delete.mockResolvedValue(undefined)
    await adapter.deleteAIModel("aid")
    expect(mockApi.delete).toHaveBeenCalledWith("/ai-models/aid")
  })

  it("calls fetchSettings", async () => {
    mockApi.get.mockResolvedValue([])
    await adapter.fetchSettings()
    expect(mockApi.get).toHaveBeenCalledWith("/settings")
  })

  it("calls saveOrUpdateSettings", async () => {
    const settings = new Settings()
    settings.id = "1"
    settings.key = "theme"
    settings.value = "dark"
    mockApi.post.mockResolvedValue(undefined)
    await adapter.saveOrUpdateSettings(settings)
    expect(mockApi.post).toHaveBeenCalledWith("/settings", settings)
  })

  it("calls fetchUsers", async () => {
    mockApi.get.mockResolvedValue([])
    await adapter.fetchUsers()
    expect(mockApi.get).toHaveBeenCalledWith("/users")
  })

  it("calls saveUser", async () => {
    const user = new User()
    user.id = "1"
    user.name = "u"
    user.email = "email@example.com"
    user.role = "role"
    mockApi.post.mockResolvedValue(undefined)
    await adapter.saveUser(user)
    expect(mockApi.post).toHaveBeenCalledWith("/users", user)
  })

  it("calls deleteUser", async () => {
    mockApi.delete.mockResolvedValue(undefined)
    await adapter.deleteUser("uid")
    expect(mockApi.delete).toHaveBeenCalledWith("/users/uid")
  })

  it("calls login", async () => {
    const user = new User()
    user.id = "1"
    user.name = "u"
    user.email = "email@example.com"
    user.role = "role"
    mockApi.post.mockResolvedValue(user)
    const result = await adapter.login("user", "pass")
    expect(mockApi.post).toHaveBeenCalledWith("/login", {
      username: "user",
      password: "pass",
    })
    expect(result).toBe(user)
  })

  it("calls logout", async () => {
    mockApi.get.mockResolvedValue(undefined)
    await adapter.logout()
    expect(mockApi.get).toHaveBeenCalledWith("/logout")
  })

  it("calls syncData", async () => {
    mockApi.get.mockResolvedValue(undefined)
    await adapter.syncData()
    expect(mockApi.get).toHaveBeenCalledWith("/sync")
  })
})
