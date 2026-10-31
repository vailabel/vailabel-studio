import type { Annotation, Item } from "@/shared/types/core"
import type { LabelConfig } from "@/shared/lib/label-config/types"
import type { Track } from "@/shared/types/video"
import { toLabelStudioTasks, toLabelStudioVideoTasks } from "./label-studio-exporter"

const asItem = (fields: Partial<Item>): Item =>
  ({ width: 0, height: 0, ...fields }) as Item

const choice: Annotation = {
  id: "a1",
  name: "verdict",
  type: "result",
  coordinates: [],
  meta: {
    kind: "result",
    fromName: "verdict",
    toName: "prompt",
    resultType: "choices",
    value: { choices: ["good"] },
  },
} as Annotation

describe("toLabelStudioTasks", () => {
  it("emits the item's data, not just its name", () => {
    const items = [
      { id: "i1", name: "row", path: "", data: { prompt: "Hi", answer: "Yo" } },
    ].map(asItem)
    const [task] = toLabelStudioTasks(items, new Map([["i1", [choice]]]))

    expect(task.data).toEqual({ prompt: "Hi", answer: "Yo" })
    expect(task.annotations[0].result).toEqual([
      {
        id: "a1",
        from_name: "verdict",
        to_name: "prompt",
        type: "choices",
        value: { choices: ["good"] },
      },
    ])
  })

  it("maps object fields to the file path and keeps the legacy shape otherwise", () => {
    const config: LabelConfig = {
      objects: [{ tag: "image", name: "img", value: "$image", valueKey: "image", attrs: {} }],
      controls: [],
    }
    const items = [{ id: "i1", name: "a.jpg", path: "/ds/a.jpg" }].map(asItem)
    expect(toLabelStudioTasks(items, new Map(), config)[0].data).toEqual({
      image: "/ds/a.jpg",
    })
    expect(toLabelStudioTasks(items, new Map())[0].data).toEqual({ item: "a.jpg" })
  })
})

describe("toLabelStudioVideoTasks", () => {
  it("writes one videorectangle per track with 1-based percent keyframes", () => {
    const track: Track = {
      id: "t1",
      projectId: "p1",
      videoId: "v1",
      labelId: null,
      labelName: "car",
      color: "#fff",
      type: "box",
      keyframes: [
        {
          frame: 10,
          shape: [
            { x: 50, y: 25 },
            { x: 100, y: 75 },
          ],
          outside: true,
          occluded: false,
        },
        {
          frame: 0,
          shape: [
            { x: 0, y: 0 },
            { x: 20, y: 10 },
          ],
          outside: false,
          occluded: false,
        },
      ],
      createdAt: "",
      updatedAt: "",
    }
    const [task] = toLabelStudioVideoTasks([
      {
        meta: { path: "/v/clip.mp4", fps: 10, duration: 2, width: 200, height: 100, frameCount: 20 },
        tracks: [track],
      },
    ])

    expect(task.data).toEqual({ video: "/v/clip.mp4" })
    const [region] = task.annotations[0].result
    expect(region).toMatchObject({
      from_name: "box",
      to_name: "video",
      type: "videorectangle",
      value: { framesCount: 20, duration: 2, labels: ["car"] },
    })
    expect((region.value as { sequence: unknown[] }).sequence).toEqual([
      { frame: 1, enabled: true, rotation: 0, x: 0, y: 0, width: 10, height: 10, time: 0 },
      { frame: 11, enabled: false, rotation: 0, x: 25, y: 25, width: 25, height: 50, time: 1 },
    ])
  })
})
