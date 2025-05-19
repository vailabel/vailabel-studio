import { describe, it, expect, beforeEach, jest } from "@jest/globals"
import { SQLiteDataAccess } from "./SQLiteDataAccess"

global.window = Object.create(window)
window.ipc = {
  invoke: jest.fn() as unknown as jest.Mock,
} as any

describe("SQLiteDataAccess", () => {
  let adapter: SQLiteDataAccess
  let mockInvoke: jest.Mock

  beforeEach(() => {
    mockInvoke = window.ipc.invoke as jest.Mock
    mockInvoke.mockReset()
    adapter = new SQLiteDataAccess()
  })

  it("should be defined", () => {
    expect(SQLiteDataAccess).toBeDefined()
  })

  it("getProjectWithImages returns project with images", async () => {
    // Arrange
    ;(mockInvoke as any)
      .mockResolvedValueOnce({ id: "p1", name: "proj" }) // for project
      .mockResolvedValueOnce([{ id: "img1" }, { id: "img2" }]) // for images
    // Act
    const result = await adapter.getProjectWithImages("p1")
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:get", [
      "SELECT * FROM projects WHERE id = ?",
      ["p1"],
    ])
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:all", [
      "SELECT * FROM images WHERE projectId = ?",
      ["p1"],
    ])
    expect(result).toEqual({
      id: "p1",
      name: "proj",
      images: [{ id: "img1" }, { id: "img2" }],
    })
  })

  it("getProjectWithImages returns undefined if no project", async () => {
    // Arrange
    ;(mockInvoke as any).mockResolvedValueOnce(undefined)
    // Act
    const result = await adapter.getProjectWithImages("p1")
    // Assert
    expect(result).toBeUndefined()
  })

  it("getProjectById returns project", async () => {
    // Arrange
    ;(mockInvoke as any).mockResolvedValueOnce({ id: "p1" })
    // Act
    const result = await adapter.getProjectById("p1")
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:get", [
      "SELECT * FROM projects WHERE id = ?",
      ["p1"],
    ])
    expect(result).toEqual({ id: "p1" })
  })

  it("createProject calls sqlite:run", async () => {
    // Arrange
    const project = { id: "p1", name: "n", createdAt: 1, lastModified: 2 }
    // Act
    await adapter.createProject(project as any)
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
      "INSERT INTO projects (id, name, createdAt, lastModified) VALUES (?, ?, ?, ?)",
      [project.id, project.name, project.createdAt, project.lastModified],
    ])
  })

  it("updateProject calls sqlite:run with correct SQL", async () => {
    // Arrange
    // Act
    await adapter.updateProject("p1", { name: "new" })
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
      "UPDATE projects SET name = ? WHERE id = ?",
      ["new", "p1"],
    ])
  })

  it("deleteProject deletes annotations, images, labels, and project", async () => {
    // Arrange
    ;(mockInvoke as any)
      .mockResolvedValueOnce([{ id: "img1" }, { id: "img2" }]) // images
      .mockResolvedValue(undefined)
    // Act
    await adapter.deleteProject("p1")
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:all", [
      "SELECT id FROM images WHERE projectId = ?",
      ["p1"],
    ])
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
      "DELETE FROM annotations WHERE imageId IN (?,?)",
      ["img1", "img2"],
    ])
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
      "DELETE FROM images WHERE projectId = ?",
      ["p1"],
    ])
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
      "DELETE FROM labels WHERE projectId = ?",
      ["p1"],
    ])
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
      "DELETE FROM projects WHERE id = ?",
      ["p1"],
    ])
  })

  it("getImages returns images", async () => {
    // Arrange
    ;(mockInvoke as any).mockResolvedValueOnce([{ id: "img1" }])
    // Act
    const result = await adapter.getImages("p1")
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:all", [
      "SELECT * FROM images WHERE projectId = ?",
      ["p1"],
    ])
    expect(result).toEqual([{ id: "img1" }])
  })

  it("getImagesWithPagination returns images", async () => {
    // Arrange
    ;(mockInvoke as any).mockResolvedValueOnce([{ id: "img1" }])
    // Act
    const result = await adapter.getImagesWithPagination("p1", 10, 5)
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:all", [
      "SELECT * FROM images WHERE projectId = ? LIMIT ? OFFSET ?",
      ["p1", 5, 10],
    ])
    expect(result).toEqual([{ id: "img1" }])
  })

  it("getNextImageId returns id or null", async () => {
    // Arrange
    ;(mockInvoke as any).mockResolvedValueOnce({ id: "img2" })
    // Act
    const result = await adapter.getNextImageId("img1")
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:get", [
      "SELECT id FROM images WHERE id > ? ORDER BY id ASC LIMIT 1",
      ["img1"],
    ])
    expect(result).toBe("img2")
  })

  it("getNextImageId returns null if not found", async () => {
    // Arrange
    ;(mockInvoke as any).mockResolvedValueOnce(undefined)
    // Act
    const result = await adapter.getNextImageId("img1")
    // Assert
    expect(result).toBeNull()
  })

  it("getPreviousImageId returns id or null", async () => {
    // Arrange
    ;(mockInvoke as any).mockResolvedValueOnce({ id: "img0" })
    // Act
    const result = await adapter.getPreviousImageId("img1")
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:get", [
      "SELECT id FROM images WHERE id < ? ORDER BY id DESC LIMIT 1",
      ["img1"],
    ])
    expect(result).toBe("img0")

    // Arrange for null
    ;(mockInvoke as any).mockResolvedValueOnce(undefined)
    const resultNull = await adapter.getPreviousImageId("img1")
    expect(resultNull).toBeNull()
  })

  it("createAnnotation stringifies coordinates", async () => {
    // Arrange
    const annotation = {
      id: "a",
      imageId: "img1",
      labelId: "l1",
      name: "n",
      type: "rect",
      coordinates: [1, 2],
      color: "red",
      isAIGenerated: false,
      createdAt: 1,
      updatedAt: 2,
    }
    // Act
    await adapter.createAnnotation(annotation as any)
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
      expect.stringContaining("INSERT INTO annotations"),
      expect.arrayContaining([
        annotation.id,
        annotation.imageId,
        annotation.labelId,
        annotation.name,
        annotation.type,
        JSON.stringify(annotation.coordinates),
        annotation.color,
        annotation.isAIGenerated,
        annotation.createdAt,
        annotation.updatedAt,
      ]),
    ])
  })

  it("updateAnnotation stringifies coordinates if present", async () => {
    // Arrange
    // Act
    await adapter.updateAnnotation("a", {
      coordinates: [1, 2] as any,
      name: "n",
    })
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
      expect.stringContaining("UPDATE annotations SET"),
      expect.arrayContaining([JSON.stringify([1, 2]), "n", "a"]),
    ])
  })

  it("deleteAnnotation calls sqlite:run", async () => {
    // Arrange
    // Act
    await adapter.deleteAnnotation("a")
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
      "DELETE FROM annotations WHERE id = ?",
      ["a"],
    ])
  })

  it("createLabel calls sqlite:run", async () => {
    // Arrange
    const label = {
      id: "l1",
      name: "label",
      category: "cat",
      isAIGenerated: false,
      projectId: "p1",
      color: "red",
      createdAt: 1,
      updatedAt: 2,
    }
    // Act
    await adapter.createLabel(label as any)
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
      expect.stringContaining("INSERT INTO labels"),
      expect.arrayContaining([
        label.id,
        label.name,
        label.category,
        label.isAIGenerated,
        label.projectId,
        label.color,
        label.createdAt,
        label.updatedAt,
      ]),
    ])
  })

  it("getLabels returns labels", async () => {
    // Arrange
    ;(mockInvoke as any).mockResolvedValueOnce([{ id: "l1" }])
    // Act
    const result = await adapter.getLabels()
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:all", [
      "SELECT * FROM labels",
      [],
    ])
    expect(result).toEqual([{ id: "l1" }])
  })

  it("getLabelById returns label", async () => {
    // Arrange
    ;(mockInvoke as any).mockResolvedValueOnce({ id: "l1" })
    // Act
    const result = await adapter.getLabelById("l1")
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:get", [
      "SELECT * FROM labels WHERE id = ?",
      ["l1"],
    ])
    expect(result).toEqual({ id: "l1" })
  })

  it("updateLabel calls sqlite:run", async () => {
    // Arrange
    // Act
    await adapter.updateLabel("l1", { name: "new" })
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
      "UPDATE labels SET name = ? WHERE id = ?",
      ["new", "l1"],
    ])
  })

  it("deleteLabel calls sqlite:run", async () => {
    // Arrange
    // Act
    await adapter.deleteLabel("l1")
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
      "DELETE FROM labels WHERE id = ?",
      ["l1"],
    ])
  })

  it("getSettings returns settings", async () => {
    // Arrange
    ;(mockInvoke as any).mockResolvedValueOnce([{ key: "a", value: "b" }])
    // Act
    const result = await adapter.getSettings()
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:all", [
      "SELECT * FROM settings",
      [],
    ])
    expect(result).toEqual([{ key: "a", value: "b" }])
  })

  it("updateSetting calls sqlite:run", async () => {
    // Arrange
    // Act
    await adapter.updateSetting("k", "v")
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
      "UPDATE settings SET value = ? WHERE key = ?",
      ["v", "k"],
    ])
  })

  it("getHistory returns history", async () => {
    // Arrange
    ;(mockInvoke as any).mockResolvedValueOnce([{ id: "h1" }])
    // Act
    const result = await adapter.getHistory()
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:all", [
      "SELECT * FROM history",
      [],
    ])
    expect(result).toEqual([{ id: "h1" }])
  })

  it("updateHistory calls sqlite:run", async () => {
    // Arrange
    const history = { id: "h1", foo: "bar" }
    // Act
    await adapter.updateHistory(history as any)
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
      expect.stringContaining("UPDATE history SET"),
      expect.arrayContaining(["bar", "h1"]),
    ])
  })

  it("getProjects returns projects", async () => {
    // Arrange
    ;(mockInvoke as any).mockResolvedValueOnce([{ id: "p1" }])
    // Act
    const result = await adapter.getProjects()
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:all", [
      "SELECT * FROM projects",
      [],
    ])
    expect(result).toEqual([{ id: "p1" }])
  })

  it("createImage calls sqlite:run", async () => {
    // Arrange
    const image = {
      id: "img1",
      projectId: "p1",
      name: "img",
      data: "data",
      width: 100,
      height: 200,
      url: "url",
      createdAt: 123,
    }
    // Act
    await adapter.createImage(image as any)
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
      expect.stringContaining("INSERT INTO images"),
      expect.arrayContaining([
        image.id,
        image.projectId,
        image.name,
        image.data,
        image.width,
        image.height,
        image.url,
        image.createdAt,
      ]),
    ])
  })

  it("updateImage calls sqlite:run with correct SQL", async () => {
    // Arrange
    // Act
    await adapter.updateImage("img1", { name: "new", width: 123 })
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
      "UPDATE images SET name = ?, width = ? WHERE id = ?",
      ["new", 123, "img1"],
    ])
  })

  it("deleteImage calls sqlite:run", async () => {
    // Arrange
    // Act
    await adapter.deleteImage("img1")
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
      "DELETE FROM images WHERE id = ?",
      ["img1"],
    ])
  })

  it("getAnnotationsWithFilter calls sqlite:all with filter", async () => {
    // Arrange
    ;(mockInvoke as any).mockResolvedValueOnce([])
    // Act
    await adapter.getAnnotationsWithFilter("img1", { type: "box", name: "foo" })
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:all", [
      "SELECT * FROM annotations WHERE imageId = ? AND type = ? AND name = ?",
      ["img1", "box", "foo"],
    ])
  })

  it("getAnnotations handles JSON.parse error", async () => {
    // Arrange
    const badRow = { id: "a", coordinates: "not-json" }
    ;(mockInvoke as any).mockResolvedValueOnce([badRow])
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
    // Act
    const result = await adapter.getAnnotations("img1")
    // Assert
    expect(result[0].coordinates).toBe("not-json")
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it("deleteProject handles no images branch", async () => {
    // Arrange
    ;(mockInvoke as any)
      .mockResolvedValueOnce([]) // images
      .mockResolvedValue(undefined)
    // Act
    await adapter.deleteProject("p1")
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:all", [
      "SELECT id FROM images WHERE projectId = ?",
      ["p1"],
    ])
    expect(mockInvoke).not.toHaveBeenCalledWith(
      "sqlite:run",
      expect.arrayContaining([
        expect.stringContaining("DELETE FROM annotations WHERE imageId IN"),
      ])
    )
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
      "DELETE FROM images WHERE projectId = ?",
      ["p1"],
    ])
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
      "DELETE FROM labels WHERE projectId = ?",
      ["p1"],
    ])
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
      "DELETE FROM projects WHERE id = ?",
      ["p1"],
    ])
  })

  it("updateAnnotation handles multiple fields and stringifies coordinates only", async () => {
    // Arrange
    const points = [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]
    // Act
    await adapter.updateAnnotation("a", {
      coordinates: points,
      name: "n",
      color: "red",
    })
    // Assert
    expect(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
      "UPDATE annotations SET coordinates = ?, name = ?, color = ? WHERE id = ?",
      [JSON.stringify(points), "n", "red", "a"],
    ])
  })
})
