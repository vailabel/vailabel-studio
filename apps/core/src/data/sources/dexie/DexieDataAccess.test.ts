import "fake-indexeddb/auto"
// Polyfill structuredClone for Node.js/Jest if not present
if (typeof global.structuredClone !== "function") {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj))
}

import { describe, it, expect, beforeEach } from "@jest/globals"
import { DexieDataAccess } from "./DexieDataAccess"
import { db } from "@vailabel/core/src/data/db/dexieDb"

describe("DexieDataAccess", () => {
  let dataAccess: DexieDataAccess
  const createProject = (id: string, name?: string) => ({
    id,
    name: name ?? id,
    createdAt: new Date(),
    lastModified: new Date(),
    images: [],
  })
  const createImage = (id: string, projectId: string, name?: string) => ({
    id,
    name: name ?? id,
    data: "",
    width: 1,
    height: 1,
    projectId,
    createdAt: new Date(),
  })

  beforeEach(async () => {
    dataAccess = new DexieDataAccess()
    // Clear all tables before each test to avoid cross-test pollution
    await db.projects.clear()
    await db.images.clear()
    await db.annotations.clear()
    await db.labels.clear()
    await db.settings.clear()
    await db.history.clear()
  })

  it("should be defined", () => {
    expect(DexieDataAccess).toBeDefined()
  })

  it("should add and retrieve a project", async () => {
    // Arrange
    const project = createProject("test-id", "Test Project")
    // Act
    await dataAccess.createProject(project)
    const projects = await dataAccess.getProjects()
    // Assert
    expect(projects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "test-id", name: "Test Project" }),
      ])
    )
  })

  it("should update a project", async () => {
    const project = createProject("p1", "P1")
    await dataAccess.createProject(project)
    await dataAccess.updateProject("p1", { name: "P1-updated" })
    const updated = await dataAccess.getProjectById("p1")
    expect(updated?.name).toBe("P1-updated")
  })

  it("should delete a project", async () => {
    const project = createProject("p2", "P2")
    await dataAccess.createProject(project)
    await dataAccess.deleteProject("p2")
    const deleted = await dataAccess.getProjectById("p2")
    expect(deleted).toBeUndefined()
  })

  it("should add and retrieve an image", async () => {
    const project = createProject("p3", "P3")
    await dataAccess.createProject(project)
    const image = createImage("img1", "p3", "img")
    await dataAccess.createImage(image)
    const images = await dataAccess.getImages("p3")
    expect(images).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "img1" })])
    )
  })

  it("should update and delete an image", async () => {
    const project = createProject("p4", "P4")
    await dataAccess.createProject(project)
    const image = createImage("img2", "p4", "img2")
    await dataAccess.createImage(image)
    await dataAccess.updateImage("img2", { name: "img2-upd" })
    let updated = await dataAccess.getImages("p4")
    expect(updated[0].name).toBe("img2-upd")
    await dataAccess.deleteImage("img2")
    const afterDelete = await dataAccess.getImages("p4")
    expect(afterDelete.length).toBe(0)
  })

  it("should add, update, and delete an annotation", async () => {
    const dataAccess = new DexieDataAccess()
    const project = {
      id: "p5",
      name: "P5",
      createdAt: new Date(),
      lastModified: new Date(),
      images: [],
    }
    await dataAccess.createProject(project)
    const image = {
      id: "img3",
      name: "img3",
      data: "",
      width: 1,
      height: 1,
      projectId: "p5",
      createdAt: new Date(),
    }
    await dataAccess.createImage(image)
    const annotation = {
      id: "a1",
      imageId: "img3",
      labelId: "",
      name: "ann",
      type: "box" as const,
      coordinates: [],
      color: "red",
      isAIGenerated: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await dataAccess.createAnnotation(annotation)
    await dataAccess.updateAnnotation("a1", { name: "ann-upd" })
    let anns = await dataAccess.getAnnotations("img3")
    expect(anns[0].name).toBe("ann-upd")
    await dataAccess.deleteAnnotation("a1")
    anns = await dataAccess.getAnnotations("img3")
    expect(anns.length).toBe(0)
  })

  it("should add, update, and delete a label", async () => {
    const dataAccess = new DexieDataAccess()
    const label = {
      id: "l1",
      name: "Label1",
      color: "blue",
      category: "cat",
      isAIGenerated: false,
      projectId: "p6",
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await dataAccess.createLabel(label, [])
    let labels = await dataAccess.getLabels()
    expect(labels[0].name).toBe("Label1")
    await dataAccess.updateLabel("l1", { name: "Label1-upd" })
    const updated = await dataAccess.getLabelById("l1")
    expect(updated?.name).toBe("Label1-upd")
    await dataAccess.deleteLabel("l1")
    labels = await dataAccess.getLabels()
    expect(labels.length).toBe(0)
  })

  it("should store and retrieve settings", async () => {
    const dataAccess = new DexieDataAccess()
    await dataAccess.updateSetting("theme", "dark")
    const settings = await dataAccess.getSettings()
    expect(settings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "theme", value: "dark" }),
      ])
    )
  })

  it("should store and retrieve history", async () => {
    const dataAccess = new DexieDataAccess()
    const history = {
      id: "h1",
      action: "edit",
      timestamp: new Date(),
      userId: "u1",
      labels: [],
      historyIndex: 0,
      canUndo: true,
      canRedo: false,
    }
    await dataAccess.updateHistory(history)
    const histories = await dataAccess.getHistory()
    expect(histories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "h1", action: "edit" }),
      ])
    )
  })

  it("should paginate images", async () => {
    const dataAccess = new DexieDataAccess()
    const project = {
      id: "p7",
      name: "P7",
      createdAt: new Date(),
      lastModified: new Date(),
      images: [],
    }
    await dataAccess.createProject(project)
    for (let i = 0; i < 5; i++) {
      await dataAccess.createImage({
        id: `img${i}`,
        name: `img${i}`,
        data: "",
        width: 1,
        height: 1,
        projectId: "p7",
        createdAt: new Date(),
      })
    }
    const paged = await dataAccess.getImagesWithPagination("p7", 1, 2)
    expect(paged.length).toBe(2)
  })

  it("should filter annotations", async () => {
    const dataAccess = new DexieDataAccess()
    const project = {
      id: "p8",
      name: "P8",
      createdAt: new Date(),
      lastModified: new Date(),
      images: [],
    }
    await dataAccess.createProject(project)
    const image = {
      id: "img8",
      name: "img8",
      data: "",
      width: 1,
      height: 1,
      projectId: "p8",
      createdAt: new Date(),
    }
    await dataAccess.createImage(image)
    await dataAccess.createAnnotation({
      id: "a8",
      imageId: "img8",
      labelId: "l8",
      name: "ann8",
      type: "box",
      coordinates: [],
      color: "red",
      isAIGenerated: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const filtered = await dataAccess.getAnnotationsWithFilter("img8", {
      labelId: "l8",
    })
    expect(filtered.length).toBe(1)
  })

  it("should get next and previous image ids", async () => {
    const dataAccess = new DexieDataAccess()
    const project = {
      id: "p9",
      name: "P9",
      createdAt: new Date(),
      lastModified: new Date(),
      images: [],
    }
    await dataAccess.createProject(project)
    await dataAccess.createImage({
      id: "imgA",
      name: "A",
      data: "",
      width: 1,
      height: 1,
      projectId: "p9",
      createdAt: new Date(),
    })
    await dataAccess.createImage({
      id: "imgB",
      name: "B",
      data: "",
      width: 1,
      height: 1,
      projectId: "p9",
      createdAt: new Date(),
    })
    const next = await dataAccess.getNextImageId("imgA")
    const prev = await dataAccess.getPreviousImageId("imgB")
    expect(next).toBe("imgB")
    expect(prev).toBe("imgA")
  })

  it("should get project with images (project exists)", async () => {
    const project = createProject("p10", "P10")
    await dataAccess.createProject(project)
    const image1 = createImage("img10a", "p10", "img10a")
    const image2 = createImage("img10b", "p10", "img10b")
    await dataAccess.createImage(image1)
    await dataAccess.createImage(image2)
    const result = await dataAccess.getProjectWithImages("p10")
    expect(result).toBeDefined()
    expect(result && result.images && result.images.length).toBe(2)
    expect(
      result && result.images && result.images.map((img) => img.id)
    ).toEqual(expect.arrayContaining(["img10a", "img10b"]))
  })

  it("should get project with images (project does not exist)", async () => {
    const result = await dataAccess.getProjectWithImages("doesnotexist")
    expect(result).toBeUndefined()
  })

  it("should createLabel and update annotation labelId", async () => {
    const label = {
      id: "l2",
      name: "Label2",
      color: "green",
      category: "cat2",
      isAIGenerated: false,
      projectId: "p11",
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const project = createProject("p11", "P11")
    await dataAccess.createProject(project)
    const image = createImage("img11", "p11", "img11")
    await dataAccess.createImage(image)
    const annotation = {
      id: "a11",
      imageId: "img11",
      labelId: "",
      name: "ann11",
      type: "box" as const,
      coordinates: [],
      color: "red",
      isAIGenerated: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await dataAccess.createAnnotation(annotation)
    await dataAccess.createLabel(label, ["a11"])
    const anns = await dataAccess.getAnnotations("img11")
    expect(anns[0].labelId).toBe("l2")
  })

  it("should return null for getNextImageId if image does not exist", async () => {
    const result = await dataAccess.getNextImageId("doesnotexist")
    expect(result).toBeNull()
  })

  it("should return null for getPreviousImageId if image does not exist", async () => {
    const result = await dataAccess.getPreviousImageId("doesnotexist")
    expect(result).toBeNull()
  })

  it("should return null for getNextImageId if no next image exists", async () => {
    const project = createProject("p12", "P12")
    await dataAccess.createProject(project)
    const image = createImage("img12", "p12", "img12")
    await dataAccess.createImage(image)
    const result = await dataAccess.getNextImageId("img12")
    expect(result).toBeNull()
  })

  it("should return null for getPreviousImageId if no previous image exists", async () => {
    const project = createProject("p13", "P13")
    await dataAccess.createProject(project)
    const image = createImage("img13", "p13", "img13")
    await dataAccess.createImage(image)
    const result = await dataAccess.getPreviousImageId("img13")
    expect(result).toBeNull()
  })
})
