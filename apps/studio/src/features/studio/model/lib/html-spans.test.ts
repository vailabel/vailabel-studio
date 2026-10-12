import {
  highlightHtml,
  htmlToText,
  rangeToOffsets,
  sanitizeHtml,
} from "./html-spans"

const span = (start: number, end: number, id = "s1") => ({
  id,
  start,
  end,
  label: "Title",
  color: "#ef4444",
})

describe("sanitizeHtml", () => {
  it("keeps formatting and drops anything that can execute or navigate", () => {
    const clean = sanitizeHtml(
      `<h1 onclick="steal()" style="position:fixed">Hi</h1>
       <script>alert(1)</script><iframe src="https://x"></iframe>
       <a href="javascript:alert(1)">link</a><img src="x" onerror="alert(1)">`
    )

    expect(clean).toContain("<h1>Hi</h1>")
    expect(clean).toContain("<a>link</a>")
    expect(clean).not.toMatch(
      /script|iframe|onclick|onerror|style|javascript:|href/
    )
  })

  it("unwraps unknown tags but keeps their text", () => {
    expect(sanitizeHtml("<font><center>Old <b>web</b></center></font>")).toBe(
      "Old <b>web</b>"
    )
  })

  it("only keeps http(s) and inline image sources", () => {
    expect(sanitizeHtml('<img src="https://a/b.png" alt="pic">')).toBe(
      '<img src="https://a/b.png" alt="pic">'
    )
    expect(sanitizeHtml('<img src="file:///etc/passwd">')).toBe('<img alt="">')
  })
})

describe("highlightHtml", () => {
  it("wraps the addressed characters without changing the text", () => {
    const html = "<p>Hello brave world</p>"
    const marked = highlightHtml(html, [span(6, 11)])

    expect(marked).toContain('data-span-id="s1"')
    expect(marked).toContain(">brave</mark>")
    expect(htmlToText(marked)).toBe(htmlToText(html))
  })

  it("splits a span that crosses elements and labels it once", () => {
    const marked = highlightHtml("<p>Hello <b>brave</b> world</p>", [
      span(3, 13),
    ])

    expect(marked.match(/<mark/g)).toHaveLength(3)
    expect(marked.match(/data-label=/g)).toHaveLength(1)
  })

  it("lets the more specific span paint where two overlap", () => {
    const marked = highlightHtml("<p>abcdef</p>", [
      span(0, 6, "outer"),
      span(2, 4, "inner"),
    ])
    const doc = new DOMParser().parseFromString(marked, "text/html")
    const owners = [...doc.querySelectorAll("mark")].map(
      (mark) => `${mark.getAttribute("data-span-id")}:${mark.textContent}`
    )

    expect(owners).toEqual(["outer:ab", "inner:cd", "outer:ef"])
  })
})

describe("rangeToOffsets", () => {
  const mount = (html: string) => {
    const container = document.createElement("div")
    container.innerHTML = html
    document.body.appendChild(container)
    return container
  }

  it("maps a selection across elements to text offsets", () => {
    const container = mount("<p>Hello <b>brave</b> world</p>")
    const range = document.createRange()
    range.setStart(container.querySelector("b")!.firstChild!, 0)
    range.setEnd(container.querySelector("p")!.lastChild!, 6)

    expect(rangeToOffsets(container, range)).toEqual({ start: 6, end: 17 })
  })

  it("is stable when earlier text is already highlighted", () => {
    const container = mount(
      highlightHtml("<p>Hello brave world</p>", [span(0, 5)])
    )
    const tail = container.querySelector("p")!.lastChild!
    const range = document.createRange()
    range.setStart(tail, 1)
    range.setEnd(tail, 6)

    expect(rangeToOffsets(container, range)).toEqual({ start: 6, end: 11 })
  })

  it("rejects collapsed and outside ranges", () => {
    const container = mount("<p>Hello</p>")
    const collapsed = document.createRange()
    collapsed.setStart(container.firstChild!.firstChild!, 2)
    collapsed.collapse(true)
    const outside = document.createRange()
    outside.selectNodeContents(document.body)

    expect(rangeToOffsets(container, collapsed)).toBeNull()
    expect(rangeToOffsets(container, outside)).toBeNull()
  })
})
