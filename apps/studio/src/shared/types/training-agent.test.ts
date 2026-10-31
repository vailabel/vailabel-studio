import { runMetaOf } from "./training-agent"

describe("runMetaOf", () => {
  it("reads Studio's bookkeeping from a run config", () => {
    expect(
      runMetaOf({ epochs: 5, _studio: { agentId: "a1", auto: true } })
    ).toEqual({
      agentId: "a1",
      auto: true,
    })
  })

  it("is empty for runs created before the bookkeeping existed", () => {
    expect(runMetaOf({ epochs: 5 })).toEqual({})
    expect(runMetaOf(null)).toEqual({})
    expect(runMetaOf(undefined)).toEqual({})
    expect(runMetaOf({ _studio: "corrupt" })).toEqual({})
  })
})
