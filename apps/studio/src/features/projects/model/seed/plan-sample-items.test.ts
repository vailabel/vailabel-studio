/// <reference types="node" />
// Reads the bundled files in public/samples straight from disk.
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { decodeSlice, readSliceInfo } from "@/shared/lib/dicom/dicom"
import {
  ctrl,
  fieldObj,
  obj,
  textObj,
} from "@/shared/lib/label-config/builders"
import { configForTemplate } from "@/shared/lib/label-config/generate"
import { LABELING_TEMPLATES } from "@/shared/lib/label-config/labeling-templates"
import { planSampleItems, type SampleFile } from "./plan-sample-items"
import { sampleFieldText } from "./sample-content"
import { READING_PASSAGES } from "./sample-texts"

const SAMPLES = resolve(__dirname, "../../../../../public/samples")
const bundled = (asset: string) => readFileSync(resolve(SAMPLES, asset))
const assets = (files: SampleFile[]) =>
  files.flatMap((file) => (file.kind === "asset" ? [file.asset] : []))

const templateContext = (id: string) => {
  const template = LABELING_TEMPLATES.find((entry) => entry.id === id)!
  return {
    config: configForTemplate(template),
    context: [template.id, template.label, template.description].join(" "),
  }
}

describe("planSampleItems", () => {
  it("gives a file-backed config one bundled file per item, with its size", () => {
    const plan = planSampleItems({
      objects: [obj("image")],
      controls: [ctrl("rectanglelabels", "box", "image")],
    })

    expect(plan.items).toHaveLength(3)
    expect(plan.files.map((file) => file.path)).toEqual(
      plan.items.map((item) => item.file)
    )
    expect(assets(plan.files)).toContain("images/street-new-york.jpg")
    expect(
      plan.items.every((item) => item.width! > 0 && item.height! > 0)
    ).toBe(true)
  })

  it("picks the data that fits the template", () => {
    const pick = (id: string) => {
      const { config, context } = templateContext(id)
      return assets(planSampleItems(config, context).files)
    }

    expect(pick("ocr")).toContain("images/receipt-switzerland.jpg")
    expect(pick("medical-image-classification")).toContain(
      "images/chest-xray-1.jpg"
    )
    expect(pick("speaker-segmentation")).toContain(
      "audio/apollo-13-we-have-a-problem.mp3"
    )
    expect(pick("ls-activity-recognition")).toContain(
      "timeseries/activity-1.csv"
    )
    expect(pick("video-timeline")).toContain("video/skateboard-kickflip.mp4")
  })

  it("fills every field of a judgement row, sharing its photos", () => {
    const plan = planSampleItems({
      objects: [fieldObj("image", "query"), fieldObj("image", "candidate_1")],
      controls: [ctrl("choices", "match", "query")],
    })

    expect(plan.items).toHaveLength(3)
    expect(plan.items[0].file).toBeUndefined()
    // The query and its first candidate show the same subject.
    expect(plan.items[0]).toMatchObject({
      data: {
        query: { file: "dog-1.jpg" },
        candidate_1: { file: "dog-2.jpg" },
      },
    })
    expect(new Set(plan.files.map((file) => file.path)).size).toBe(
      plan.files.length
    )
  })

  it("inlines the main document when a text item carries extra fields", () => {
    const plan = planSampleItems(
      {
        objects: [obj("text"), textObj("question", "Question")],
        controls: [
          ctrl("labels", "answer", "text"),
          ctrl("choices", "ok", "text"),
        ],
      },
      "question answering"
    )

    expect(Object.keys(plan.items[0].data ?? {}).sort()).toEqual([
      "question",
      "text",
    ])
    // The question is about the passage it sits beside.
    expect(plan.items[1].data).toMatchObject({
      text: READING_PASSAGES[1].context,
      question: READING_PASSAGES[1].question,
    })
  })

  it("seeds table rows inline and video clips with their metadata", () => {
    const table = planSampleItems({
      objects: [obj("table")],
      controls: [ctrl("choices", "label", "table")],
    })
    const video = planSampleItems({
      objects: [obj("video")],
      controls: [ctrl("choices", "class", "video")],
    })

    expect(table.items.length).toBeGreaterThan(0)
    expect(table.items.every((item) => item.data && !item.file)).toBe(true)
    expect(video.items.length).toBeGreaterThan(0)
    expect(video.items[0].video).toMatchObject({ width: 640, height: 360 })
  })

  it("produces items for every template, from files that are bundled", () => {
    const empty: string[] = []
    const missing = new Set<string>()
    for (const template of LABELING_TEMPLATES) {
      const plan = planSampleItems(
        configForTemplate(template),
        [template.id, template.label, template.description].join(" ")
      )
      if (plan.items.length === 0) empty.push(template.id)
      for (const asset of assets(plan.files)) {
        if (!existsSync(resolve(SAMPLES, asset))) missing.add(asset)
      }
    }

    expect(empty).toEqual([])
    expect([...missing]).toEqual([])
  })
})

describe("sample row text", () => {
  it("gives preference rows a real prompt and two different replies", () => {
    const hint = "human preference (rlhf)"
    const prompt = sampleFieldText("prompt", 0, hint)

    expect(prompt).toMatch(/polar bears/i)
    expect(sampleFieldText("response_a", 0, hint)).not.toBe(
      sampleFieldText("response_b", 0, hint)
    )
  })

  it("gives retrieval rows a query and distinct passages", () => {
    const hint = "document retrieval rank documents"
    const passages = ["text1", "text2", "text3"].map((name) =>
      sampleFieldText(name, 0, hint)
    )

    expect(sampleFieldText("query", 0, hint)).toMatch(/\?$/)
    expect(new Set(passages).size).toBe(3)
  })
})

describe("bundled sample files", () => {
  it("has CT slices that decode to Hounsfield units", () => {
    const bytes = new Uint8Array(bundled("dicom/lidc-1/IM0006"))
    expect(readSliceInfo("IM0006", bytes)).toMatchObject({
      modality: "CT",
      rows: 256,
      columns: 256,
      instance: 6,
    })
    const pixels = decodeSlice(bytes)
    expect(pixels.min).toBeLessThan(-900)
    // Soft tissue and the nodule are well above air.
    expect(pixels.max).toBeGreaterThan(100)
  })

  it("has binary PCD scans whose header matches their size", () => {
    const raw = bundled("pointcloud/toronto-street-1.pcd")
    const end = raw.indexOf("DATA binary\n") + "DATA binary\n".length
    const header = raw.subarray(0, end).toString()
    const points = Number(/^POINTS (\d+)$/m.exec(header)![1])

    expect(header).toContain("FIELDS x y z intensity")
    expect(raw.length - end).toBe(points * 16)
  })

  it("has time series with a time column and numeric channels", () => {
    for (const name of [
      "activity-1",
      "ecg-pvc",
      "potomac-river-flow",
      "wti-crude-oil-2024",
    ]) {
      const [header, first] = bundled(`timeseries/${name}.csv`)
        .toString()
        .split("\n")
      const cells = first.split(",")

      expect(header.split(",")[0]).toBe("time")
      expect(
        cells.slice(1).every((cell) => Number.isFinite(Number(cell)))
      ).toBe(true)
    }
  })
})
