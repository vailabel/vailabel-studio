import {
  adjacentKeyframe,
  iou,
  isKeyframe,
  predictShapeAt,
  removeKeyframe,
  sampleTrackAt,
  upsertKeyframe,
} from "./track-engine"
import type { Track, TrackKeyframe, VideoPoint } from "@/types/video"

const boxKf = (frame: number, x: number, y: number): TrackKeyframe => ({
  frame,
  shape: [
    { x, y },
    { x: x + 10, y: y + 10 },
  ],
  outside: false,
  occluded: false,
})

const makeTrack = (keyframes: TrackKeyframe[]): Track => ({
  id: "t1",
  projectId: "p1",
  videoId: "v1",
  labelId: null,
  labelName: "car",
  color: "#fff",
  type: "box",
  keyframes,
  createdAt: "",
  updatedAt: "",
})

describe("track-engine interpolation", () => {
  it("interpolates the midpoint between two keyframes", () => {
    const track = makeTrack([boxKf(0, 0, 0), boxKf(10, 100, 50)])
    const sampled = sampleTrackAt(track, 5)
    expect(sampled).not.toBeNull()
    expect(sampled!.keyframe).toBe(false)
    expect(sampled!.shape[0]).toEqual({ x: 50, y: 25 })
    expect(sampled!.shape[1]).toEqual({ x: 60, y: 35 })
  })

  it("flags exact keyframe hits", () => {
    const track = makeTrack([boxKf(0, 0, 0), boxKf(10, 100, 50)])
    expect(sampleTrackAt(track, 0)!.keyframe).toBe(true)
    expect(sampleTrackAt(track, 10)!.keyframe).toBe(true)
    expect(isKeyframe(track, 10)).toBe(true)
    expect(isKeyframe(track, 5)).toBe(false)
  })

  it("is invisible before the first keyframe and holds after the last", () => {
    const track = makeTrack([boxKf(5, 0, 0)])
    expect(sampleTrackAt(track, 0)).toBeNull()
    expect(sampleTrackAt(track, 99)).not.toBeNull()
  })

  it("hides an outside span until the next keyframe", () => {
    const gone = { ...boxKf(5, 0, 0), outside: true }
    const track = makeTrack([boxKf(0, 0, 0), gone, boxKf(10, 100, 50)])
    expect(sampleTrackAt(track, 7)).toBeNull()
    expect(sampleTrackAt(track, 10)).not.toBeNull()
  })
})

describe("track-engine keyframe ops", () => {
  it("upserts and removes keyframes immutably and stays sorted", () => {
    const track = makeTrack([boxKf(0, 0, 0), boxKf(10, 100, 50)])
    const withMid = upsertKeyframe(track, 5, { shape: boxKf(5, 1, 1).shape })
    expect(withMid.map((k) => k.frame)).toEqual([0, 5, 10])

    const replaced = upsertKeyframe({ ...track, keyframes: withMid }, 5, {
      shape: [
        { x: 9, y: 9 },
        { x: 19, y: 19 },
      ],
    })
    expect(replaced.find((k) => k.frame === 5)!.shape[0]).toEqual({ x: 9, y: 9 })

    const removed = removeKeyframe({ ...track, keyframes: replaced }, 5)
    expect(removed.map((k) => k.frame)).toEqual([0, 10])
  })

  it("finds adjacent keyframes for navigation", () => {
    const track = makeTrack([boxKf(0, 0, 0), boxKf(10, 0, 0), boxKf(20, 0, 0)])
    expect(adjacentKeyframe(track, 10, "next")).toBe(20)
    expect(adjacentKeyframe(track, 10, "prev")).toBe(0)
    expect(adjacentKeyframe(track, 20, "next")).toBeNull()
  })
})

describe("track-engine tracking helpers", () => {
  it("predicts the next shape with constant velocity", () => {
    const track = makeTrack([boxKf(0, 0, 0), boxKf(10, 100, 0)])
    // velocity = 10 px/frame; at frame 15 => x0 = 150
    const predicted = predictShapeAt(track, 15) as VideoPoint[]
    expect(predicted[0].x).toBeCloseTo(150)
  })

  it("computes IoU of overlapping boxes", () => {
    const a = { x: 0, y: 0, width: 10, height: 10 }
    const b = { x: 5, y: 0, width: 10, height: 10 }
    // intersection 5x10=50, union 200-50=150
    expect(iou(a, b)).toBeCloseTo(50 / 150)
    expect(iou(a, { x: 100, y: 100, width: 10, height: 10 })).toBe(0)
  })
})
