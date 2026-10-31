import { keyframeAt, rectAtFrame, upsertKeyframe } from "./video-regions"

const box = { x: 10, y: 10, width: 20, height: 20 }

describe("video rectangle sequences", () => {
  it("interpolates between keyframes", () => {
    const sequence = [keyframeAt(0, 25, box), keyframeAt(10, 25, { ...box, x: 30 })]
    expect(rectAtFrame(sequence, 5)).toMatchObject({ x: 20, width: 20, keyframe: false })
    expect(rectAtFrame(sequence, 10)).toMatchObject({ x: 30, keyframe: true })
  })

  it("hides the box after a disabled keyframe and before the first one", () => {
    const sequence = [keyframeAt(5, 25, box), keyframeAt(8, 25, box, false)]
    expect(rectAtFrame(sequence, 2)).toBeNull()
    expect(rectAtFrame(sequence, 9)).toBeNull()
  })

  it("replaces a keyframe on the same frame and keeps order", () => {
    const sequence = upsertKeyframe(
      [keyframeAt(10, 25, box), keyframeAt(0, 25, box)],
      keyframeAt(10, 25, { ...box, x: 50 })
    )
    expect(sequence.map((kf) => [kf.frame, kf.x])).toEqual([
      [0, 10],
      [10, 50],
    ])
    expect(sequence[1].time).toBe(0.4)
  })
})
