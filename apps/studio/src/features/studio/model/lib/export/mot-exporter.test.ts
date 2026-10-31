import type { Label } from "@/shared/types/core"
import type { Track, TrackKeyframe } from "@/shared/types/video"
import { toMot, type MotVideo } from "./mot-exporter"

const kf = (
  frame: number,
  x: number,
  extra: Partial<TrackKeyframe> = {}
): TrackKeyframe => ({
  frame,
  shape: [
    { x, y: 10 },
    { x: x + 20, y: 40 },
  ],
  outside: false,
  occluded: false,
  ...extra,
})

const track = (id: string, labelName: string, keyframes: TrackKeyframe[]): Track => ({
  id,
  projectId: "p1",
  videoId: "v1",
  labelId: null,
  labelName,
  color: "#fff",
  type: "box",
  keyframes,
  createdAt: "",
  updatedAt: "",
})

const video = (tracks: Track[], frameCount = 4): MotVideo => ({
  meta: { name: "clip.mp4", fps: 25, width: 640, height: 480, frameCount },
  tracks,
})

const labels = [{ id: "l1", name: "person" } as Label, { id: "l2", name: "car" } as Label]

describe("toMot", () => {
  it("writes gt.txt, labels.txt and seqinfo.ini under the video folder", () => {
    const files = toMot([video([track("t-a", "car", [kf(0, 0)])])], labels)
    expect(files.map((file) => file.name)).toEqual([
      "clip/gt/gt.txt",
      "clip/gt/labels.txt",
      "clip/seqinfo.ini",
    ])
    expect(files[1].content).toBe("person\ncar\n")
    expect(files[2].content).toContain("seqLength=4")
    expect(files[2].content).toContain("frameRate=25")
    expect(files[2].content).toContain("imWidth=640")
  })

  it("uses 1-based frames, integer track ids and 1-based class ids", () => {
    const [gt] = toMot(
      [
        video(
          [
            track("t-a", "car", [kf(0, 0), kf(2, 10)]),
            track("t-b", "person", [kf(1, 100)]),
          ],
          3
        ),
      ],
      labels
    )

    expect(gt.content.trim().split("\n")).toEqual([
      "1,1,0,10,20,30,1,2,1",
      "2,1,5,10,20,30,1,2,1",
      "2,2,100,10,20,30,1,1,1",
      "3,1,10,10,20,30,1,2,1",
      "3,2,100,10,20,30,1,1,1",
    ])
  })

  it("marks occluded frames with visibility 0 and skips outside frames", () => {
    const [gt] = toMot(
      [
        video([
          track("t-a", "car", [
            kf(0, 0),
            kf(1, 0, { occluded: true }),
            kf(2, 0, { outside: true }),
          ]),
        ]),
      ],
      labels
    )

    expect(gt.content.trim().split("\n")).toEqual([
      "1,1,0,10,20,30,1,2,1",
      "2,1,0,10,20,30,1,2,0",
    ])
  })

  it("falls back to the last keyframe when the frame count is unknown", () => {
    const files = toMot([video([track("t-a", "car", [kf(0, 0), kf(4, 0)])], 0)], labels)
    expect(files[0].content.trim().split("\n")).toHaveLength(5)
    expect(files[2].content).toContain("seqLength=5")
  })
})
