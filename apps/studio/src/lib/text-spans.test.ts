import type { Annotation } from "@/types/core"
import {
  annotationsToSpans,
  annotationsToRelations,
  annotationsToValue,
  buildSegments,
  trimRange,
  toTextJsonl,
  type EntitySpan,
} from "./text-spans"

const span = (
  id: string,
  start: number,
  end: number,
  label = "X",
  color = "#000"
): EntitySpan => ({ id, start, end, label, color })

describe("buildSegments", () => {
  it("returns a single plain segment when there are no spans", () => {
    const segments = buildSegments("hello world", [])
    expect(segments).toEqual([
      { start: 0, end: 11, text: "hello world", entity: null, isEntityStart: false },
    ])
  })

  it("tiles the text around a single span with no gaps", () => {
    const segments = buildSegments("hello world", [span("a", 6, 11, "ORG")])
    expect(segments.map((s) => s.text)).toEqual(["hello ", "world"])
    expect(segments[0].entity).toBeNull()
    expect(segments[1].entity?.label).toBe("ORG")
    expect(segments[1].isEntityStart).toBe(true)
  })

  it("marks isEntityStart only on the slice where the entity begins", () => {
    // Overlap: A=[0,10] fully contains B=[3,6]; the shorter span wins the middle.
    const segments = buildSegments("abcdefghij", [
      span("A", 0, 10, "OUTER"),
      span("B", 3, 6, "INNER"),
    ])
    const byText = Object.fromEntries(segments.map((s) => [s.text, s]))
    expect(byText["abc"].entity?.label).toBe("OUTER")
    expect(byText["abc"].isEntityStart).toBe(true)
    expect(byText["def"].entity?.label).toBe("INNER") // shortest wins
    expect(byText["def"].isEntityStart).toBe(true)
    expect(byText["ghij"].entity?.label).toBe("OUTER")
    expect(byText["ghij"].isEntityStart).toBe(false) // tag already shown
  })

  it("clamps out-of-range spans and drops empty ones", () => {
    const segments = buildSegments("abc", [span("a", -5, 99), span("b", 2, 2)])
    expect(segments).toHaveLength(1)
    expect(segments[0]).toMatchObject({ start: 0, end: 3, text: "abc" })
    expect(segments[0].entity?.id).toBe("a")
  })

  it("handles adjacent spans", () => {
    const segments = buildSegments("abcdef", [span("a", 0, 3, "L"), span("b", 3, 6, "R")])
    expect(segments.map((s) => s.entity?.label)).toEqual(["L", "R"])
    expect(segments.every((s) => s.isEntityStart)).toBe(true)
  })
})

describe("annotationsToSpans", () => {
  it("keeps only text-meta annotations with a valid range", () => {
    const annotations = [
      { id: "1", name: "ORG", color: "#f00", meta: { kind: "text", charStart: 0, charEnd: 4 } },
      { id: "2", name: "BAD", meta: { kind: "text", charStart: 4, charEnd: 4 } }, // empty
      { id: "3", name: "BOX", coordinates: [], type: "box" }, // not text
    ] as unknown as Annotation[]
    const spans = annotationsToSpans(annotations)
    expect(spans).toHaveLength(1)
    expect(spans[0]).toMatchObject({ id: "1", start: 0, end: 4, label: "ORG" })
  })
})

describe("annotationsToRelations", () => {
  it("extracts relation-meta annotations", () => {
    const annotations = [
      { id: "r1", name: "works_at", meta: { kind: "relation", fromId: "a", toId: "b" } },
      { id: "s1", name: "ORG", meta: { kind: "text", charStart: 0, charEnd: 3 } },
    ] as unknown as Annotation[]
    const relations = annotationsToRelations(annotations)
    expect(relations).toEqual([
      { id: "r1", fromId: "a", toId: "b", label: "works_at" },
    ])
  })
})

describe("annotationsToValue", () => {
  it("returns the free-text value, or empty string", () => {
    const withValue = [
      { id: "v", name: "translation", meta: { kind: "value", text: "bonjour" } },
    ] as unknown as Annotation[]
    expect(annotationsToValue(withValue)).toBe("bonjour")
    expect(annotationsToValue([])).toBe("")
  })
})

describe("trimRange", () => {
  it("strips surrounding whitespace", () => {
    expect(trimRange("  hi  ", 0, 6)).toEqual({ start: 2, end: 4 })
  })
  it("normalizes a backwards selection", () => {
    expect(trimRange("abcdef", 5, 1)).toEqual({ start: 1, end: 5 })
  })
  it("returns null for an all-whitespace range", () => {
    expect(trimRange("a    b", 1, 5)).toBeNull()
  })
})

describe("toTextJsonl", () => {
  it("emits one JSON object per line with text/label/cats", () => {
    const jsonl = toTextJsonl([
      { text: "Acme Inc", label: [[0, 4, "ORG"]], cats: [] },
      { text: "spam", label: [], cats: ["junk"] },
    ])
    const lines = jsonl.split("\n")
    expect(lines).toHaveLength(2)
    expect(JSON.parse(lines[0])).toEqual({ text: "Acme Inc", label: [[0, 4, "ORG"]], cats: [] })
    expect(JSON.parse(lines[1])).toEqual({ text: "spam", label: [], cats: ["junk"] })
  })

  it("includes relations and translation only when present", () => {
    const jsonl = toTextJsonl([
      {
        text: "Ada works at Acme",
        label: [[0, 3, "PER"], [13, 17, "ORG"]],
        cats: [],
        relations: [{ from: [0, 3], to: [13, 17], type: "works_at" }],
      },
      { text: "hello", label: [], cats: [], translation: "bonjour" },
    ])
    const [first, second] = jsonl.split("\n").map((line) => JSON.parse(line))
    expect(first.relations).toEqual([{ from: [0, 3], to: [13, 17], type: "works_at" }])
    expect(first.translation).toBeUndefined()
    expect(second.translation).toBe("bonjour")
    expect(second.relations).toBeUndefined()
  })
})
