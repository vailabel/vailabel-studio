import { getLabelingConfig, resolveCapabilities } from "./labeling-config"

describe("getLabelingConfig (legacy, unchanged behavior)", () => {
  it("maps object_detection to the box toolset", () => {
    const config = getLabelingConfig("object_detection")
    expect(config.mode).toBe("regions")
    expect(config.tools).toEqual(["move", "box", "delete"])
    expect(config.defaultTool).toBe("box")
  })

  it("maps classification to whole-image mode", () => {
    const config = getLabelingConfig("classification")
    expect(config.mode).toBe("classification")
    expect(config.allowsClassification).toBe(true)
    expect(config.allowsRegions).toBe(false)
  })

  it("falls back to the mixed all-tools config for unknown types", () => {
    const config = getLabelingConfig("something-else")
    expect(config.mode).toBe("mixed")
    expect(config.tools).toContain("smartSegment")
  })
})

describe("resolveCapabilities (two-axis taxonomy)", () => {
  it("resolves image detection to the canvas editor with the box toolset", () => {
    const caps = resolveCapabilities({ modality: "image", task: "detection" })
    expect(caps.modality).toBe("image")
    expect(caps.task).toBe("detection")
    expect(caps.editor).toBe("canvas")
    expect(caps.tools).toContain("box")
  })

  it("resolves image classification to the classification editor", () => {
    const caps = resolveCapabilities({ modality: "image", task: "classification" })
    expect(caps.editor).toBe("classification")
    expect(caps.allowsClassification).toBe(true)
  })

  it("resolves image segmentation to the canvas editor with polygon tools", () => {
    const caps = resolveCapabilities({ modality: "image", task: "segmentation" })
    expect(caps.editor).toBe("canvas")
    expect(caps.tools).toContain("polygon")
  })

  it("backfills task from the legacy projectType when no task is given", () => {
    const caps = resolveCapabilities({ projectType: "object_detection" })
    expect(caps.modality).toBe("image")
    expect(caps.task).toBe("detection")
    expect(caps.editor).toBe("canvas")
  })

  it("routes text projects to the text editor", () => {
    const caps = resolveCapabilities({ modality: "text", task: "ner" })
    expect(caps.editor).toBe("text")
  })

  it("routes audio and video projects to the timeline editor", () => {
    expect(resolveCapabilities({ modality: "audio", task: "audio_classification" }).editor).toBe(
      "timeline"
    )
    expect(resolveCapabilities({ modality: "video", task: "tracking" }).editor).toBe("timeline")
  })

  it("defaults to the image modality for an unknown/missing modality", () => {
    const caps = resolveCapabilities({ modality: "hologram" as never })
    expect(caps.modality).toBe("image")
  })
})
