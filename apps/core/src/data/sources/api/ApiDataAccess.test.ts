import { ApiDataAccess } from "./ApiDataAccess"
import { ApiClient } from "@vailabel/core/src/data/sources/api/ApiClient"
import type {
  Project,
  ImageData,
  Annotation,
  Label,
  History as ModelHistory,
} from "../../../models/types"

jest.mock("@vailabel/core/src/data/sources/api/ApiClient")

const mockGet = jest.fn()
const mockPost = jest.fn()
const mockPut = jest.fn()
const mockDelete = jest.fn()

;(ApiClient as jest.Mock).mockImplementation(() => ({
  get: mockGet,
  post: mockPost,
  put: mockPut,
  delete: mockDelete,
}))

describe("ApiDataAccess", () => {
  let dataAccess: ApiDataAccess
  let apiClientInstance: any

  beforeEach(() => {
    jest.clearAllMocks()
    apiClientInstance = {
      get: mockGet,
      post: mockPost,
      put: mockPut,
      delete: mockDelete,
    }
    dataAccess = new ApiDataAccess(apiClientInstance)
    mockGet.mockResolvedValue(undefined)
    mockPost.mockResolvedValue(undefined)
    mockPut.mockResolvedValue(undefined)
    mockDelete.mockResolvedValue(undefined)
  })

  it("getProjectWithImages calls correct endpoint", async () => {
    await dataAccess.getProjectWithImages("1")
    expect(mockGet).toHaveBeenCalledWith("/projects/1")
  })

  it("getNextImageId calls correct endpoint", async () => {
    await dataAccess.getNextImageId("img1")
    expect(mockGet).toHaveBeenCalledWith("/images/img1/next")
  })

  it("deleteLabel calls correct endpoint", async () => {
    await dataAccess.deleteLabel("label1")
    expect(mockDelete).toHaveBeenCalledWith("/labels/label1")
  })

  it("createProject posts to correct endpoint", async () => {
    const project = { id: "2", name: "New Project" } as Project
    mockPost.mockResolvedValueOnce(undefined)
    await dataAccess.createProject(project)
    expect(mockPost).toHaveBeenCalledWith("/projects", project)
  })

  it("getAnnotationsWithFilter calls correct endpoint with query", async () => {
    const filter = { type: "box" } as Partial<Annotation>
    mockGet.mockResolvedValueOnce(undefined)
    await dataAccess.getAnnotationsWithFilter("img1", filter)
    expect(mockGet).toHaveBeenCalledWith("/images/img1/annotations?type=box")
  })

  it("createLabel posts label and updates annotations", async () => {
    const label = { id: "l1", name: "Label1" } as Label
    const annotationIds = ["a1", "a2"]
    mockPost.mockResolvedValueOnce(undefined)
    mockPut.mockResolvedValue(undefined)
    await dataAccess.createLabel(label, annotationIds)
    expect(mockPost).toHaveBeenCalledWith("/labels", label)
    expect(mockPut).toHaveBeenNthCalledWith(1, "/annotations/a1", {
      labelId: "l1",
    })
    expect(mockPut).toHaveBeenNthCalledWith(2, "/annotations/a2", {
      labelId: "l1",
    })
  })

  it("updateProject calls correct endpoint", async () => {
    const updates = { name: "Updated Project" }
    await dataAccess.updateProject("1", updates)
    expect(mockPut).toHaveBeenCalledWith("/projects/1", updates)
  })

  it("deleteProject calls correct endpoint", async () => {
    await dataAccess.deleteProject("1")
    expect(mockDelete).toHaveBeenCalledWith("/projects/1")
  })

  it("createImage posts to correct endpoint", async () => {
    const image = { id: "img1", url: "url" } as ImageData
    await dataAccess.createImage(image)
    expect(mockPost).toHaveBeenCalledWith("/images", image)
  })

  it("updateImage calls correct endpoint", async () => {
    const updates = { url: "new-url" }
    await dataAccess.updateImage("img1", updates)
    expect(mockPut).toHaveBeenCalledWith("/images/img1", updates)
  })

  it("deleteImage calls correct endpoint", async () => {
    await dataAccess.deleteImage("img1")
    expect(mockDelete).toHaveBeenCalledWith("/images/img1")
  })

  it("createAnnotation posts to correct endpoint", async () => {
    const annotation = { id: "a1", imageId: "img1" } as Annotation
    await dataAccess.createAnnotation(annotation)
    expect(mockPost).toHaveBeenCalledWith("/annotations", annotation)
  })

  it("updateAnnotation calls correct endpoint", async () => {
    const updates = { labelId: "l1" }
    await dataAccess.updateAnnotation("a1", updates)
    expect(mockPut).toHaveBeenCalledWith("/annotations/a1", updates)
  })

  it("deleteAnnotation calls correct endpoint", async () => {
    await dataAccess.deleteAnnotation("a1")
    expect(mockDelete).toHaveBeenCalledWith("/annotations/a1")
  })

  it("getSettings calls correct endpoint", async () => {
    await dataAccess.getSettings()
    expect(mockGet).toHaveBeenCalledWith("/settings")
  })

  it("updateSetting calls correct endpoint", async () => {
    await dataAccess.updateSetting("theme", "dark")
    expect(mockPut).toHaveBeenCalledWith("/settings/theme", { value: "dark" })
  })

  it("getHistory calls correct endpoint", async () => {
    await dataAccess.getHistory()
    expect(mockGet).toHaveBeenCalledWith("/history")
  })

  it("updateHistory calls correct endpoint", async () => {
    const history: ModelHistory = {
      id: "h1",
      labels: [],
      historyIndex: 0,
      canUndo: false,
      canRedo: false,
    }
    await dataAccess.updateHistory(history)
    expect(mockPut).toHaveBeenCalledWith("/history", history)
  })

  it("getImagesWithPagination calls correct endpoint", async () => {
    await dataAccess.getImagesWithPagination("p1", 10, 5)
    expect(mockGet).toHaveBeenCalledWith(
      "/projects/p1/images?offset=10&limit=5"
    )
  })

  it("getLabels calls correct endpoint", async () => {
    await dataAccess.getLabels()
    expect(mockGet).toHaveBeenCalledWith("/labels")
  })

  it("getLabelById calls correct endpoint", async () => {
    await dataAccess.getLabelById("l1")
    expect(mockGet).toHaveBeenCalledWith("/labels/l1")
  })

  it("updateLabel calls correct endpoint", async () => {
    const updates = { name: "Updated Label" }
    await dataAccess.updateLabel("l1", updates)
    expect(mockPut).toHaveBeenCalledWith("/labels/l1", updates)
  })

  it("getPreviousImageId calls correct endpoint", async () => {
    await dataAccess.getPreviousImageId("img1")
    expect(mockGet).toHaveBeenCalledWith("/images/img1/previous")
  })

  it("getProjects calls correct endpoint", async () => {
    await dataAccess.getProjects()
    expect(mockGet).toHaveBeenCalledWith("/projects")
  })

  it("getProjectById calls correct endpoint", async () => {
    await dataAccess.getProjectById("1")
    expect(mockGet).toHaveBeenCalledWith("/projects/1")
  })

  it("getImages calls correct endpoint", async () => {
    await dataAccess.getImages("p1")
    expect(mockGet).toHaveBeenCalledWith("/projects/p1/images")
  })

  it("getAnnotations calls correct endpoint", async () => {
    await dataAccess.getAnnotations("img1")
    expect(mockGet).toHaveBeenCalledWith("/images/img1/annotations")
  })
})
