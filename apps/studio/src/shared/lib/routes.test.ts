import { isPathActive, paths } from "./routes"

describe("paths", () => {
  it("builds the studio link with and without an item", () => {
    expect(paths.studio("p1")).toBe("/projects/p1/studio")
    expect(paths.studio("p1", "i9")).toBe("/projects/p1/studio/i9")
  })
})

describe("isPathActive", () => {
  it("matches the route itself and anything nested under it", () => {
    expect(isPathActive("/projects", "/projects")).toBe(true)
    expect(isPathActive("/projects/detail/1", "/projects")).toBe(true)
  })

  it("does not treat a shared prefix as a match", () => {
    expect(isPathActive("/labels-archive", "/labels")).toBe(false)
  })

  it("only matches the root exactly", () => {
    expect(isPathActive("/", "/")).toBe(true)
    expect(isPathActive("/projects", "/")).toBe(false)
  })
})
