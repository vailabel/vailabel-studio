import {
  ctrl,
  fieldObj,
  obj,
  textObj,
} from "@/shared/lib/label-config/builders"
import { configForTemplate } from "@/shared/lib/label-config/generate"
import { LABELING_TEMPLATES } from "@/shared/lib/label-config/labeling-templates"
import { planSampleItems } from "./plan-sample-items"
import {
  samplePdf,
  sampleTimeSeriesCsv,
  sampleWavDataUrl,
} from "./sample-content"

describe("planSampleItems", () => {
  it("gives a file-backed config one file per item", () => {
    const plan = planSampleItems({
      objects: [obj("image")],
      controls: [ctrl("rectanglelabels", "box", "image")],
    })

    expect(plan.items).toHaveLength(3)
    expect(plan.files.map((file) => file.path)).toEqual(
      plan.items.map((item) => item.file)
    )
    expect(plan.items.every((item) => item.isImage && !item.data)).toBe(true)
  })

  it("fills every field of a judgement row, drawing its image fields", () => {
    const plan = planSampleItems({
      objects: [fieldObj("image", "query"), fieldObj("image", "candidate_1")],
      controls: [ctrl("choices", "match", "query")],
    })

    expect(plan.items).toHaveLength(3)
    expect(plan.files).toHaveLength(6)
    expect(plan.items[0].file).toBeUndefined()
    expect(plan.items[0]).toMatchObject({
      data: {
        query: { file: "task-1-query.png" },
        candidate_1: { file: "task-1-candidate_1.png" },
      },
    })
  })

  it("inlines the main document when a text item carries extra fields", () => {
    const plan = planSampleItems({
      objects: [obj("text"), textObj("question", "Question")],
      controls: [
        ctrl("labels", "answer", "text"),
        ctrl("choices", "ok", "text"),
      ],
    })

    expect(Object.keys(plan.items[0].data ?? {}).sort()).toEqual([
      "question",
      "text",
    ])
  })

  it("seeds table rows inline and video with no items", () => {
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
    expect(video.items).toEqual([])
    expect(video.note).toMatch(/video/i)
  })

  it("produces items for every non-video template in the catalog", () => {
    const empty = LABELING_TEMPLATES.filter((template) => {
      const config = configForTemplate(template)
      const isVideo = config.objects.some((object) => object.tag === "video")
      return !isVideo && planSampleItems(config).items.length === 0
    }).map((template) => template.id)

    expect(empty).toEqual([])
  })
})

describe("sample content", () => {
  it("writes a WAV whose header matches its length", () => {
    const base64 = sampleWavDataUrl(0, 1).split(",")[1]
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
    const view = new DataView(bytes.buffer)
    const text = (offset: number) =>
      String.fromCharCode(...bytes.subarray(offset, offset + 4))

    expect([text(0), text(8), text(36)]).toEqual(["RIFF", "WAVE", "data"])
    expect(view.getUint32(4, true)).toBe(bytes.length - 8)
    expect(view.getUint32(40, true)).toBe(bytes.length - 44)
  })

  it("writes a PDF whose cross-reference offsets point at its objects", () => {
    const pdf = samplePdf("Title (draft)", ["one", "two"])
    const xrefAt = Number(/startxref\n(\d+)/.exec(pdf)![1])
    const offsets = [...pdf.matchAll(/^(\d{10}) 00000 n /gm)].map((match) =>
      Number(match[1])
    )

    expect(pdf.startsWith("%PDF-1.4")).toBe(true)
    expect(pdf.slice(xrefAt, xrefAt + 4)).toBe("xref")
    offsets.forEach((offset, index) =>
      expect(pdf.slice(offset, offset + 7)).toBe(`${index + 1} 0 obj`)
    )
    expect(pdf).toContain("(Title \\(draft\\)) Tj")
  })

  it("writes a parseable series with a header and one row per sample", () => {
    const lines = sampleTimeSeriesCsv(0).trim().split("\n")

    expect(lines[0]).toBe("time,velocity,temperature")
    expect(lines).toHaveLength(241)
  })
})
