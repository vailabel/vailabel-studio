import { ExportService } from "@/lib/export-service"
import type { Project, Annotation, ImageData } from "@vailabel/core"
import JSZip from "jszip"
import type { IDataAccess } from "@vailabel/core/src/data"

const mockDataAccess = () => {
  const projects: Project[] = [
    {
      id: "p1",
      name: "Test Project",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      lastModified: new Date("2024-01-02T00:00:00Z"),
      images: [
        {
          id: "img1",
          name: "image1.jpg",
          width: 100,
          height: 200,
          data: "",
          projectId: "p1",
          createdAt: new Date("2024-01-01T00:00:00Z"),
        },
      ],
    },
  ]
  const images: ImageData[] = projects[0].images as ImageData[]
  const annotations: Annotation[] = [
    {
      id: "a1",
      imageId: "img1",
      name: "label1",
      type: "box",
      coordinates: [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ],
      color: "red",
      labelId: "l1",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
    },
  ]
  return {
    getProjects: jest.fn().mockResolvedValue(projects),
    getImages: jest.fn().mockResolvedValue(images),
    getAnnotations: jest.fn().mockResolvedValue(annotations),
    getSettings: jest.fn().mockResolvedValue([]),
    updateSetting: jest.fn(),
  }
}

describe("ExportService", () => {
  let exportService: ExportService
  let dataAccess: ReturnType<typeof mockDataAccess>
  beforeEach(() => {
    dataAccess = mockDataAccess()
    exportService = new ExportService(dataAccess as unknown as IDataAccess)
    // Mock document.createElement and related DOM for download
    document.body.innerHTML = ""
    jest.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        return Object.assign(
          document.createElementNS("http://www.w3.org/1999/xhtml", "a"),
          {
            click: jest.fn(),
          }
        )
      }
      return document.createElementNS("http://www.w3.org/1999/xhtml", tag)
    })
    jest
      .spyOn(document.body, "appendChild")
      .mockImplementation(() => null as unknown as Node)
    jest
      .spyOn(document.body, "removeChild")
      .mockImplementation(() => null as unknown as Node)
    // Patch globalThis.URL if needed for jsdom
    if (!("createObjectURL" in URL)) {
      // @ts-expect-error: createObjectURL is not defined in jsdom, patching for test
      URL.createObjectURL = jest.fn(() => "blob:url")
    } else {
      jest.spyOn(URL, "createObjectURL").mockReturnValue("blob:url")
    }
    if (!("revokeObjectURL" in URL)) {
      // @ts-expect-error: revokeObjectURL is not defined in jsdom, patching for test
      URL.revokeObjectURL = jest.fn()
    } else {
      jest.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
    }
  })

  afterEach(() => {
    jest.restoreAllMocks()
    // Clean up patched URL methods to avoid leaking between tests
    const createObjectURL = URL.createObjectURL as unknown as {
      mockRestore?: () => void
    }
    if (typeof createObjectURL.mockRestore === "function") {
      createObjectURL.mockRestore()
    } else if ("createObjectURL" in URL) {
      delete (URL as unknown as { [key: string]: unknown }).createObjectURL
    }
    const revokeObjectURL = URL.revokeObjectURL as unknown as {
      mockRestore?: () => void
    }
    if (typeof revokeObjectURL.mockRestore === "function") {
      revokeObjectURL.mockRestore()
    } else if ("revokeObjectURL" in URL) {
      delete (URL as unknown as { [key: string]: unknown }).revokeObjectURL
    }
  })

  it("exports project as JSON", async () => {
    await exportService.exportToJson("p1", "test.json")
    expect(dataAccess.getProjects).toHaveBeenCalled()
    expect(dataAccess.getImages).toHaveBeenCalledWith("p1")
    expect(dataAccess.getAnnotations).toHaveBeenCalled()
    // Check download triggered
    // The anchor is created and removed synchronously, so we need to spy on appendChild
    const appendSpy = jest.spyOn(document.body, "appendChild")
    await exportService.exportToJson("p1", "test.json")
    expect(appendSpy).toHaveBeenCalled()
    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement
    expect(anchor.download).toBe("test.json")
    expect(anchor.href).toBe("blob:url")
    appendSpy.mockRestore()
  })

  it("exports project as COCO JSON", async () => {
    const appendSpy = jest.spyOn(document.body, "appendChild")
    await exportService.exportToCoco("p1", "test-coco.json")
    expect(dataAccess.getProjects).toHaveBeenCalled()
    expect(dataAccess.getImages).toHaveBeenCalledWith("p1")
    expect(dataAccess.getAnnotations).toHaveBeenCalled()
    expect(appendSpy).toHaveBeenCalled()
    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement
    expect(anchor.download).toBe("test-coco.json")
    expect(anchor.href).toBe("blob:url")
    appendSpy.mockRestore()
  })

  it("exports project as Pascal VOC zip", async () => {
    // Mock JSZip
    const zipMock = {
      file: jest.fn(),
      generateAsync: jest
        .fn()
        .mockResolvedValue(
          new Blob(["zipcontent"], { type: "application/zip" })
        ),
    }
    jest.spyOn(JSZip.prototype, "file").mockImplementation(zipMock.file)
    jest
      .spyOn(JSZip.prototype, "generateAsync")
      .mockImplementation(zipMock.generateAsync)
    const appendSpy = jest.spyOn(document.body, "appendChild")
    await exportService.exportToPascalVoc(
      {
        id: "p1",
        name: "Test Project",
        images: [
          {
            id: "img1",
            name: "image1.jpg",
            width: 100,
            height: 200,
            data: "",
            projectId: "p1",
            createdAt: new Date("2024-01-01T00:00:00Z"),
          },
        ],
      } as Project,
      [
        {
          id: "a1",
          imageId: "img1",
          name: "label1",
          type: "box",
          coordinates: [
            { x: 10, y: 20 },
            { x: 30, y: 40 },
          ],
          color: "red",
          labelId: "l1",
          createdAt: new Date("2024-01-01T00:00:00Z"),
          updatedAt: new Date("2024-01-01T00:00:00Z"),
        },
      ] as Annotation[],
      "pascal"
    )
    expect(zipMock.file).toHaveBeenCalled()
    expect(zipMock.generateAsync).toHaveBeenCalled()
    expect(appendSpy).toHaveBeenCalled()
    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement
    expect(anchor.download).toBe("pascal.zip")
    appendSpy.mockRestore()
  })

  it("exports project as YOLO zip", async () => {
    const zipMock = {
      file: jest.fn(),
      generateAsync: jest
        .fn()
        .mockResolvedValue(
          new Blob(["zipcontent"], { type: "application/zip" })
        ),
    }
    jest.spyOn(JSZip.prototype, "file").mockImplementation(zipMock.file)
    jest
      .spyOn(JSZip.prototype, "generateAsync")
      .mockImplementation(zipMock.generateAsync)
    const appendSpy = jest.spyOn(document.body, "appendChild")
    await exportService.exportToYolo(
      {
        id: "p1",
        name: "Test Project",
        images: [
          {
            id: "img1",
            name: "image1.jpg",
            width: 100,
            height: 200,
            data: "",
            projectId: "p1",
            createdAt: new Date("2024-01-01T00:00:00Z"),
          },
        ],
      } as Project,
      [
        {
          id: "a1",
          imageId: "img1",
          name: "label1",
          type: "box",
          coordinates: [
            { x: 10, y: 20 },
            { x: 30, y: 40 },
          ],
          color: "red",
          labelId: "l1",
          createdAt: new Date("2024-01-01T00:00:00Z"),
          updatedAt: new Date("2024-01-01T00:00:00Z"),
        },
      ] as Annotation[],
      "yolo"
    )
    expect(zipMock.file).toHaveBeenCalled()
    expect(zipMock.generateAsync).toHaveBeenCalled()
    expect(appendSpy).toHaveBeenCalled()
    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement
    expect(anchor.download).toBe("yolo.zip")
    appendSpy.mockRestore()
  })
})
