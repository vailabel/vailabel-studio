import { toSpacy } from "./spacy-exporter"

describe("toSpacy", () => {
  it("emits {text, entities} with sorted [start, end, label] tuples", () => {
    const docs = toSpacy([
      {
        text: "Alice met Bob in Paris",
        spans: [
          { start: 17, end: 22, label: "LOC" },
          { start: 0, end: 5, label: "PER" },
          { start: 10, end: 13, label: "PER" },
        ],
      },
    ])

    expect(docs).toEqual([
      {
        text: "Alice met Bob in Paris",
        entities: [
          [0, 5, "PER"],
          [10, 13, "PER"],
          [17, 22, "LOC"],
        ],
      },
    ])
  })

  it("drops overlapping spans, which spaCy rejects", () => {
    const [doc] = toSpacy([
      {
        text: "New York City",
        spans: [
          { start: 0, end: 13, label: "LOC" },
          { start: 4, end: 8, label: "LOC" },
        ],
      },
    ])
    expect(doc.entities).toEqual([[0, 13, "LOC"]])
  })
})
