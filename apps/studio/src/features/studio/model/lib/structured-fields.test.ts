import { paragraphRuns, parseListEntries, parseUtterances } from "./structured-fields"

describe("parseUtterances", () => {
  it("reads Label Studio paragraphs JSON", () => {
    expect(
      parseUtterances(JSON.stringify([{ author: "Agent", text: "Hi" }]))
    ).toEqual([{ author: "Agent", text: "Hi" }])
  })

  it("reads chat messages, including a wrapper object", () => {
    expect(
      parseUtterances(
        JSON.stringify({ messages: [{ role: "user", content: "Hello" }] })
      )
    ).toEqual([{ author: "user", text: "Hello" }])
  })

  it("honours custom name / text keys", () => {
    expect(
      parseUtterances(JSON.stringify([{ who: "A", said: "x" }]), "who", "said")
    ).toEqual([{ author: "A", text: "x" }])
  })

  it("falls back to Speaker: text lines, folding continuations", () => {
    expect(parseUtterances("User: hi\nthere\nBot: hello")).toEqual([
      { author: "User", text: "hi\nthere" },
      { author: "Bot", text: "hello" },
    ])
  })
})

describe("parseListEntries", () => {
  it("reads objects and assigns missing ids", () => {
    expect(
      parseListEntries(
        JSON.stringify([{ id: "a", title: "First", body: "x" }, { title: "Second" }])
      )
    ).toEqual([
      { id: "a", title: "First", body: "x" },
      { id: "2", title: "Second", body: "" },
    ])
  })

  it("reads one entry per line", () => {
    expect(parseListEntries("one\n\ntwo")).toEqual([
      { id: "1", title: "one", body: "" },
      { id: "2", title: "two", body: "" },
    ])
  })
})

describe("paragraphRuns", () => {
  const span = (start: number, startOffset: number, end: number, endOffset: number) => ({
    id: "s",
    start,
    startOffset,
    end,
    endOffset,
    label: "L",
    color: "red",
  })

  it("marks a span inside one paragraph", () => {
    const runs = paragraphRuns("hello world", 0, [span(0, 6, 0, 11)])
    expect(runs.map((run) => [run.text, !!run.span])).toEqual([
      ["hello ", false],
      ["world", true],
    ])
  })

  it("covers whole middle paragraphs of a multi-paragraph span", () => {
    const runs = paragraphRuns("middle", 1, [span(0, 3, 2, 1)])
    expect(runs).toHaveLength(1)
    expect(runs[0].span).toBeDefined()
  })

  it("leaves untouched paragraphs as one plain run", () => {
    expect(paragraphRuns("x", 3, [span(0, 0, 1, 1)])).toEqual([{ text: "x" }])
  })
})
