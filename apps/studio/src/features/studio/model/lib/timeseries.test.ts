import { decimateIndices, parseTimeSeries } from "./timeseries"

describe("parseTimeSeries", () => {
  it("reads a CSV with a numeric time column and several channels", () => {
    const series = parseTimeSeries(
      "time,velocity,temp\n0,1.5,20\n1,2.5,21\n2,3.5,22"
    )

    expect(series.time).toEqual([0, 1, 2])
    expect(series.isDate).toBe(false)
    expect(series.channels.map((channel) => channel.name)).toEqual([
      "velocity",
      "temp",
    ])
    expect(series.channels[0]).toMatchObject({
      values: [1.5, 2.5, 3.5],
      min: 1.5,
      max: 3.5,
    })
  })

  it("parses date strings into epoch milliseconds", () => {
    const series = parseTimeSeries("date;value\n2026-01-01;1\n2026-01-02;2")

    expect(series.isDate).toBe(true)
    expect(series.time[1] - series.time[0]).toBe(86_400_000)
  })

  it("accepts space-separated date-times", () => {
    const series = parseTimeSeries(
      "time,v\n2026-01-01 00:00:00,1\n2026-01-01 00:01:00,2"
    )

    expect(series.isDate).toBe(true)
    expect(series.time[1] - series.time[0]).toBe(60_000)
  })

  it("honours an explicit time column and separator", () => {
    const series = parseTimeSeries("a|when|b\n1|10|5\n2|20|6", {
      timeColumn: "when",
      separator: "|",
    })

    expect(series.time).toEqual([10, 20])
    expect(series.channels.map((channel) => channel.name)).toEqual(["a", "b"])
  })

  it("falls back to the row index when there is no time column", () => {
    const series = parseTimeSeries("x,y\n5,6\n7,8")

    expect(series.time).toEqual([0, 1])
    expect(series.channels).toHaveLength(2)
  })

  it("skips non-numeric columns and keeps gaps as NaN", () => {
    const series = parseTimeSeries(
      "time,label,value\n0,walk,1\n1,run,\n2,run,3"
    )

    expect(series.channels.map((channel) => channel.name)).toEqual(["value"])
    expect(series.channels[0].values[1]).toBeNaN()
  })

  it("reads both JSON shapes", () => {
    const columns = parseTimeSeries('{"time":[0,1],"v":[3,4]}')
    const rows = parseTimeSeries('[{"time":0,"v":3},{"time":1,"v":4}]')

    expect(columns).toEqual(rows)
    expect(rows.channels[0].values).toEqual([3, 4])
  })
})

describe("decimateIndices", () => {
  it("returns every index for a short series", () => {
    expect(decimateIndices([1, 2, 3], 10)).toEqual([0, 1, 2])
  })

  it("keeps spikes that striding would drop", () => {
    const values = Array.from({ length: 10_000 }, () => 0)
    values[4321] = 99

    const picked = decimateIndices(values, 200)

    expect(picked.length).toBeLessThanOrEqual(200)
    expect(picked).toContain(4321)
    expect(picked).toEqual([...picked].sort((a, b) => a - b))
  })
})
