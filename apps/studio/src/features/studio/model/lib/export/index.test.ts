import { EXPORT_FORMATS, exportFormatsFor } from "./index"

const ids = (...args: Parameters<typeof exportFormatsFor>) =>
  exportFormatsFor(...args).map((format) => format.id)

describe("exportFormatsFor", () => {
  it("offers the image formats to image projects", () => {
    expect(ids("image", "detection")).toEqual(["labelme", "coco", "yolo", "yolo-seg", "voc"])
  })

  it("adds CoNLL and spaCy only for span-labeling text tasks", () => {
    expect(ids("text", "ner")).toEqual(["jsonl", "conll", "spacy"])
    expect(ids("text", "relation_extraction")).toEqual(["jsonl", "conll", "spacy"])
    expect(ids("text", "text_classification")).toEqual(["jsonl"])
  })

  it("adds subtitles only for audio transcription", () => {
    expect(ids("audio", "transcription")).toEqual(["audio-jsonl", "srt", "vtt"])
    expect(ids("audio", "diarization")).toEqual(["audio-jsonl"])
  })

  it("offers MOT and Label Studio to video projects", () => {
    expect(ids("video", "tracking")).toEqual(["mot", "label-studio"])
  })

  it("offers results JSONL and CSV to tabular, results JSONL and Label Studio to custom", () => {
    expect(ids("tabular", "classification")).toEqual(["results-jsonl", "csv"])
    expect(ids("custom", "classification")).toEqual(["results-jsonl", "label-studio"])
  })

  it("ignores the task filter when the task is unknown", () => {
    expect(ids("text")).toEqual(["jsonl", "conll", "spacy"])
  })

  it("no longer falls back to the image formats for an unknown modality", () => {
    expect(exportFormatsFor(undefined)).toEqual([])
  })

  it("registers every format id once", () => {
    const all = EXPORT_FORMATS.map((format) => format.id)
    expect(new Set(all).size).toBe(all.length)
  })
})
