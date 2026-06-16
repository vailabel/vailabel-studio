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

  it("treats span tasks (ner/qa/relation) as region tasks", () => {
    for (const task of ["ner", "question_answering", "relation_extraction"] as const) {
      const caps = resolveCapabilities({ modality: "text", task })
      expect(caps.editor).toBe("text")
      expect(caps.allowsRegions).toBe(true)
      expect(caps.allowsClassification).toBe(false)
    }
  })

  it("treats text_classification and taxonomy as classification tasks", () => {
    for (const task of ["text_classification", "taxonomy"] as const) {
      const caps = resolveCapabilities({ modality: "text", task })
      expect(caps.allowsClassification).toBe(true)
      expect(caps.allowsRegions).toBe(false)
    }
  })

  it("routes translation to the text editor with no regions or classes", () => {
    const caps = resolveCapabilities({ modality: "text", task: "translation" })
    expect(caps.editor).toBe("text")
    expect(caps.allowsRegions).toBe(false)
    expect(caps.allowsClassification).toBe(false)
  })

  it("routes audio projects to the audio editor and video to the video editor", () => {
    expect(resolveCapabilities({ modality: "audio", task: "audio_classification" }).editor).toBe(
      "audio"
    )
    expect(resolveCapabilities({ modality: "video", task: "tracking" }).editor).toBe("video")
  })

  it("defaults to the image modality for an unknown/missing modality", () => {
    const caps = resolveCapabilities({ modality: "hologram" as never })
    expect(caps.modality).toBe("image")
  })

  it("gives image/text/audio the item-centric chrome", () => {
    for (const modality of ["image", "text", "audio"] as const) {
      const caps = resolveCapabilities({ modality, task: "detection" })
      expect(caps.chrome.itemSource).toBe("project-images")
      expect(caps.chrome.showFileList).toBe(true)
      expect(caps.chrome.showLabelPalette).toBe(true)
      expect(caps.chrome.showBottomBar).toBe(true)
    }
  })

  it("hides the generic chrome for video (the editor owns its own layout)", () => {
    const caps = resolveCapabilities({ modality: "video", task: "tracking" })
    expect(caps.chrome.itemSource).toBe("editor")
    expect(caps.chrome.showFileList).toBe(false)
    expect(caps.chrome.showLabelPalette).toBe(false)
    expect(caps.chrome.showBottomBar).toBe(false)
  })
})
