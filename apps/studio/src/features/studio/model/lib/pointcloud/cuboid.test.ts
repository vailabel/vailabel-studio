import { fitHeight, footprintCorners, footprintFromDrag, inFootprint, pointsInside } from "./cuboid"
import { decimate, parseKittiBin, parsePointCloud } from "./point-cloud"

const box = { x: 0, y: 0, z: 1, length: 4, width: 2, height: 2, yaw: 0 }

describe("cuboid geometry", () => {
  it("tests footprint membership with yaw", () => {
    expect(inFootprint(box, 1.9, 0.9)).toBe(true)
    expect(inFootprint(box, 0, 1.5)).toBe(false)
    const turned = { ...box, yaw: Math.PI / 2 }
    expect(inFootprint(turned, 0, 1.5)).toBe(true)
  })

  it("counts points inside, respecting height", () => {
    const points = Float32Array.from([0, 0, 1, 0, 0, 5, 3, 0, 1])
    expect(pointsInside(box, points)).toBe(1)
  })

  it("fits height to the points on the footprint", () => {
    const points = Float32Array.from([0, 0, 0.5, 0.5, 0.2, 2.5, 9, 9, 10])
    const fitted = fitHeight({ x: 0, y: 0, length: 2, width: 2, yaw: 0 }, points)
    expect(fitted.height).toBeCloseTo(2)
    expect(fitted.z).toBeCloseTo(1.5)
  })

  it("builds a footprint from a drag and its corners", () => {
    const fp = footprintFromDrag([2, 1], [-2, -1])
    expect(fp).toEqual({ x: 0, y: 0, length: 4, width: 2, yaw: 0 })
    expect(footprintCorners({ ...fp, z: 0, height: 1 })[0]).toEqual([2, 1])
  })
})

describe("point cloud parsing", () => {
  it("reads KITTI float32 scans", () => {
    const cloud = parseKittiBin(Float32Array.from([1, 2, 3, 0.5, 4, 5, 6, 0.25]).buffer)
    expect(cloud.count).toBe(2)
    expect(Array.from(cloud.positions)).toEqual([1, 2, 3, 4, 5, 6])
    expect(Array.from(cloud.intensity!)).toEqual([0.5, 0.25])
  })

  it("decimates to a point budget", () => {
    const cloud = parseKittiBin(new Float32Array(400).buffer)
    expect(decimate(cloud, 10).count).toBe(10)
  })
})

describe("PCD parsing", () => {
  it("reads an ASCII PCD with intensity through three.js", () => {
    const pcd = [
      "VERSION 0.7",
      "FIELDS x y z intensity",
      "SIZE 4 4 4 4",
      "TYPE F F F F",
      "COUNT 1 1 1 1",
      "WIDTH 2",
      "HEIGHT 1",
      "VIEWPOINT 0 0 0 1 0 0 0",
      "POINTS 2",
      "DATA ascii",
      "1 2 3 0.5",
      "4 5 6 0.25",
    ].join("\n")
    const cloud = parsePointCloud(new TextEncoder().encode(pcd).buffer as ArrayBuffer, "pcd")
    expect(cloud.count).toBe(2)
    expect(Array.from(cloud.positions)).toEqual([1, 2, 3, 4, 5, 6])
    expect(cloud.intensity && Array.from(cloud.intensity)).toEqual([0.5, 0.25])
  })
})
