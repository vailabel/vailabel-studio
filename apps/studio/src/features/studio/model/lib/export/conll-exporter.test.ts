import { bioTags, flatSpans, tokenize, toConll } from "./conll-exporter"

describe("tokenize", () => {
  it("splits words and punctuation and keeps character offsets", () => {
    const text = "Hi, New York!\nBye"
    const tokens = tokenize(text)

    expect(tokens.map((token) => token.text)).toEqual([
      "Hi",
      ",",
      "New",
      "York",
      "!",
      "Bye",
    ])
    for (const token of tokens) {
      expect(text.slice(token.start, token.end)).toBe(token.text)
    }
  })

  it("keeps non-ASCII letters inside words", () => {
    expect(tokenize("Café São-Paulo").map((token) => token.text)).toEqual([
      "Café",
      "São",
      "-",
      "Paulo",
    ])
  })
})

describe("bioTags", () => {
  it("tags the first token of a span B- and the rest I-", () => {
    const text = "Alice moved to New York City ."
    const tokens = tokenize(text)
    const tags = bioTags(tokens, [
      { start: 0, end: 5, label: "PER" },
      { start: 15, end: 28, label: "LOC" },
    ])
    expect(tags).toEqual(["B-PER", "O", "O", "B-LOC", "I-LOC", "I-LOC", "O"])
  })

  it("starts a new B- for adjacent spans with the same label", () => {
    const tokens = tokenize("Paris London")
    const tags = bioTags(tokens, [
      { start: 0, end: 5, label: "LOC" },
      { start: 6, end: 12, label: "LOC" },
    ])
    expect(tags).toEqual(["B-LOC", "B-LOC"])
  })

  it("drops spans nested inside or overlapping an earlier span", () => {
    const flat = flatSpans([
      { start: 4, end: 8, label: "B" },
      { start: 0, end: 10, label: "A" },
      { start: 9, end: 12, label: "C" },
      { start: 12, end: 14, label: "D" },
    ])
    expect(flat.map((span) => span.label)).toEqual(["A", "D"])
  })
})

describe("toConll", () => {
  it("opens each document with -DOCSTART- and splits sentences", () => {
    const out = toConll([
      {
        text: "Bob ran. He stopped\nhere",
        spans: [{ start: 0, end: 3, label: "PER" }],
      },
      { text: "Ok", spans: [] },
    ])

    expect(out).toBe(
      [
        "-DOCSTART- -X- O",
        "",
        "Bob -X- _ B-PER",
        "ran -X- _ O",
        ". -X- _ O",
        "",
        "He -X- _ O",
        "stopped -X- _ O",
        "",
        "here -X- _ O",
        "",
        "-DOCSTART- -X- O",
        "",
        "Ok -X- _ O",
        "",
      ].join("\n")
    )
  })
})
