import { ExportService } from "./export-service"
import { Project, Annotation } from "./types"
import { IDataAccess } from "./data-access"

type MockDataAccess = IDataAccess & {
  getProjects: jest.Mock
  getImages: jest.Mock
  getAnnotations: jest.Mock
}

const mockDataAccess: MockDataAccess = {
  getProjectById: jest.fn(),
  getProjects: jest.fn(),
  getImages: jest.fn(),
  getAnnotations: jest.fn(),
  createProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
  createImage: jest.fn(),
  updateImage: jest.fn(),
  deleteImage: jest.fn(),
  createAnnotation: jest.fn(),
  updateAnnotation: jest.fn(),
  deleteAnnotation: jest.fn(),
  createLabel: jest.fn(),
  getLabels: jest.fn(),
  getLabelById: jest.fn(),
  updateLabel: jest.fn(),
  deleteLabel: jest.fn(),
  getSettings: jest.fn(),
  updateSetting: jest.fn(),
  getHistory: jest.fn(),
  updateHistory: jest.fn(),
  getImagesWithPagination: jest.fn(),
  getAnnotationsWithFilter: jest.fn(),
  getNextImageId: jest.fn(),
  getPreviousImageId: jest.fn(),
}

describe("ExportService", () => {
  let exportService: ExportService

  beforeAll(() => {
    global.URL.createObjectURL = jest.fn(() => "mock-url")
    global.URL.revokeObjectURL = jest.fn()
  })

  beforeEach(() => {
    exportService = new ExportService(mockDataAccess)
  })

  describe("exportToJson", () => {
    it("should throw an error if the project is not found", async () => {
      ;(mockDataAccess.getProjects as jest.Mock).mockResolvedValue([])

      await expect(
        exportService.exportToJson("invalid-id", "test.json")
      ).rejects.toThrow("Project with ID invalid-id not found.")
    })

    it("should generate JSON data for a valid project", async () => {
      const mockProject: Project = {
        id: "1",
        name: "Test Project",
        createdAt: new Date(),
        lastModified: new Date(),
      }
      const mockImages = [
        { id: "img1", name: "image1.jpg", width: 100, height: 100 },
        { id: "img2", name: "image2.jpg", width: 200, height: 200 },
      ]
      const mockAnnotations: Annotation[] = [
        {
          id: "annotation1",
          imageId: "img1",
          labelId: "label1",
          name: "Test Annotation",
          type: "box",
          coordinates: [
            { x: 10, y: 10 },
            { x: 50, y: 50 },
          ],
          color: "red",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      ;(mockDataAccess.getProjects as jest.Mock).mockResolvedValue([
        mockProject,
      ])
      ;(mockDataAccess.getImages as jest.Mock).mockResolvedValue(mockImages)
      ;(mockDataAccess.getAnnotations as jest.Mock).mockResolvedValue(
        mockAnnotations
      )

      const createElementSpy = jest.spyOn(document, "createElement")
      const appendChildSpy = jest.spyOn(document.body, "appendChild")
      const removeChildSpy = jest.spyOn(document.body, "removeChild")

      await exportService.exportToJson("1", "test.json")

      expect(createElementSpy).toHaveBeenCalledWith("a")
      expect(appendChildSpy).toHaveBeenCalled()
      expect(removeChildSpy).toHaveBeenCalled()
    })
  })

  // Additional tests for exportToCoco, exportToPascalVoc, and exportToYolo can be added here.
})
