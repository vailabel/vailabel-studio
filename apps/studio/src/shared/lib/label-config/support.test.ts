import { ctrl, fieldObj, obj, textObj } from "./builders"
import { configForTemplate } from "./generate"
import { inferModalityTask, isMultiFieldJudgement } from "./infer"
import { LABELING_TEMPLATES } from "./labeling-templates"
import { isConfigSupported } from "./support"

describe("isConfigSupported", () => {
  it("accepts configs handled by a native editor", () => {
    expect(
      isConfigSupported({
        objects: [obj("image")],
        controls: [ctrl("rectanglelabels", "box", "image")],
      })
    ).toBe(true)
  })

  it("accepts region controls on the object types that can draw them", () => {
    expect(
      isConfigSupported({
        objects: [fieldObj("timeseries", "csv")],
        controls: [
          ctrl("timeserieslabels", "label", "csv"),
          ctrl("choices", "c", "csv"),
        ],
      })
    ).toBe(true)
  })

  it("rejects a region control its object can't draw", () => {
    expect(
      isConfigSupported({
        objects: [fieldObj("audio", "audio")],
        controls: [
          ctrl("rectanglelabels", "box", "audio"),
          ctrl("choices", "c", "audio"),
        ],
      })
    ).toBe(false)
  })

  it("accepts regions on PDF pages", () => {
    expect(
      isConfigSupported({
        objects: [fieldObj("pdf", "pdf")],
        controls: [
          ctrl("rectanglelabels", "box", "pdf"),
          ctrl("choices", "c", "pdf"),
        ],
      })
    ).toBe(true)
  })

  it("rejects objects and controls with no renderer", () => {
    expect(
      isConfigSupported({
        objects: [fieldObj("hologram", "h")],
        controls: [ctrl("choices", "c", "h")],
      })
    ).toBe(false)
    expect(
      isConfigSupported({
        objects: [fieldObj("hypertext", "html")],
        controls: [ctrl("magicwand", "m", "html")],
      })
    ).toBe(false)
  })

  it("accepts dialogue, chat, list and the extra image tools", () => {
    expect(
      isConfigSupported({
        objects: [fieldObj("paragraphs", "dialogue")],
        controls: [
          ctrl("paragraphlabels", "intent", "dialogue"),
          ctrl("choices", "c", "dialogue"),
        ],
      })
    ).toBe(true)
    expect(
      isConfigSupported({
        objects: [fieldObj("chat", "chat")],
        controls: [ctrl("rating", "r", "chat")],
      })
    ).toBe(true)
    expect(
      isConfigSupported({
        objects: [textObj("query", "Query"), fieldObj("list", "results")],
        controls: [ctrl("ranker", "rank", "results")],
      })
    ).toBe(true)
    expect(
      isConfigSupported({
        objects: [obj("image")],
        controls: [ctrl("brushlabels", "m", "image"), ctrl("rectangle", "r", "image")],
      })
    ).toBe(true)
  })

  it("rejects a config with nothing to label", () => {
    expect(isConfigSupported({ objects: [obj("image")], controls: [] })).toBe(
      false
    )
  })
})

describe("isMultiFieldJudgement", () => {
  const choices = (toName: string) => ctrl("choices", "c", toName)

  it("treats several images as one judged row", () => {
    const config = {
      objects: [fieldObj("image", "a"), fieldObj("image", "b")],
      controls: [choices("a")],
    }
    expect(isMultiFieldJudgement(config)).toBe(true)
    expect(inferModalityTask(config).modality).toBe("custom")
  })

  it("keeps a single image with a question as an interactive image task", () => {
    expect(
      isMultiFieldJudgement({
        objects: [obj("image"), textObj("question", "Question")],
        controls: [ctrl("textarea", "answer", "image")],
      })
    ).toBe(false)
  })

  it("is not a judgement once anything is drawn on a field", () => {
    expect(
      isMultiFieldJudgement({
        objects: [fieldObj("image", "a"), fieldObj("image", "b")],
        controls: [ctrl("rectanglelabels", "box", "a")],
      })
    ).toBe(false)
  })
})

describe("template catalog", () => {
  it("has no template without a working editor", () => {
    const broken = LABELING_TEMPLATES.filter(
      (template) =>
        template.status !== "available" ||
        !isConfigSupported(configForTemplate(template))
    ).map((template) => template.id)

    expect(broken).toEqual([])
  })
})
