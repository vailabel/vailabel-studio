import { parseLabelConfig } from "./parse"

describe("parseLabelConfig (XML)", () => {
  const xml = `<View>
    <Image name="img" value="$image"/>
    <RectangleLabels name="box" toName="img">
      <Label value="Car" background="#f00"/>
      <Label value="Person"/>
    </RectangleLabels>
    <Choices name="quality" toName="img">
      <Choice value="clear"/>
      <Choice value="blurry"/>
    </Choices>
    <TextArea name="notes" toName="img"/>
  </View>`

  it("extracts object tags with resolved value keys", () => {
    const config = parseLabelConfig(xml)
    expect(config.objects).toHaveLength(1)
    expect(config.objects[0]).toMatchObject({
      tag: "image",
      name: "img",
      value: "$image",
      valueKey: "image",
    })
  })

  it("extracts control tags bound to objects with their choices", () => {
    const config = parseLabelConfig(xml)
    const names = config.controls.map((c) => c.tag)
    expect(names).toEqual(["rectanglelabels", "choices", "textarea"])
    const box = config.controls[0]
    expect(box.toName).toBe("img")
    expect(box.choices.map((c) => c.value)).toEqual(["Car", "Person"])
    expect(box.choices[0].background).toBe("#f00")
  })

  it("parses comma-separated toName into toNames", () => {
    const config = parseLabelConfig(
      `<View><Text name="a" value="$a"/><Text name="b" value="$b"/>` +
        `<Choices name="c" toName="a,b"><Choice value="x"/></Choices></View>`
    )
    expect(config.controls[0].toNames).toEqual(["a", "b"])
    expect(config.controls[0].toName).toBe("a")
  })

  it("throws on malformed XML", () => {
    expect(() => parseLabelConfig("<View><Image></View>")).toThrow()
  })

  it("returns empty config for empty input", () => {
    expect(parseLabelConfig("")).toEqual({ objects: [], controls: [] })
  })
})

describe("parseLabelConfig (JSON)", () => {
  it("parses the native JSON form with label shorthand", () => {
    const config = parseLabelConfig(
      JSON.stringify({
        objects: [{ tag: "Text", name: "t", value: "$text" }],
        controls: [
          { tag: "Choices", name: "c", toName: "t", labels: ["yes", "no"] },
        ],
      })
    )
    expect(config.objects[0]).toMatchObject({ tag: "text", valueKey: "text" })
    expect(config.controls[0].choices.map((c) => c.value)).toEqual(["yes", "no"])
    expect(config.controls[0].toNames).toEqual(["t"])
  })
})
