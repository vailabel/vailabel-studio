import { PCDLoader } from "three/examples/jsm/loaders/PCDLoader.js"
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js"
import type { BufferGeometry } from "three"

// Point cloud files → flat typed arrays. Coordinates are the sensor frame as
// stored (LiDAR convention: x forward, y left, z up). PCD and PLY go through
// three.js's loaders; KITTI's .bin is raw float32 (x, y, z, intensity).

export interface PointCloud {
  /** xyz triplets. */
  positions: Float32Array
  /** One value per point when the file carries intensity / reflectance. */
  intensity?: Float32Array
  /** rgb triplets in 0..1 when the file carries color. */
  colors?: Float32Array
  count: number
}

export type PointCloudFormat = "pcd" | "ply" | "bin"

export function formatOf(path: string): PointCloudFormat | undefined {
  const ext = /\.([a-z0-9]+)$/i.exec(path)?.[1]?.toLowerCase()
  return ext === "pcd" || ext === "ply" || ext === "bin" ? ext : undefined
}

/** KITTI velodyne scan: float32 x, y, z, reflectance per point. */
export function parseKittiBin(buffer: ArrayBuffer): PointCloud {
  const raw = new Float32Array(buffer, 0, Math.floor(buffer.byteLength / 16) * 4)
  const count = raw.length / 4
  const positions = new Float32Array(count * 3)
  const intensity = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = raw[i * 4]
    positions[i * 3 + 1] = raw[i * 4 + 1]
    positions[i * 3 + 2] = raw[i * 4 + 2]
    intensity[i] = raw[i * 4 + 3]
  }
  return { positions, intensity, count }
}

function fromGeometry(geometry: BufferGeometry): PointCloud {
  const position = geometry.getAttribute("position")
  const positions = Float32Array.from(position.array as ArrayLike<number>)
  const intensity = geometry.getAttribute("intensity")
  const color = geometry.getAttribute("color")
  return {
    positions,
    intensity: intensity ? Float32Array.from(intensity.array as ArrayLike<number>) : undefined,
    colors: color ? Float32Array.from(color.array as ArrayLike<number>) : undefined,
    count: position.count,
  }
}

export function parsePointCloud(buffer: ArrayBuffer, format: PointCloudFormat): PointCloud {
  switch (format) {
    case "bin":
      return parseKittiBin(buffer)
    case "pcd":
      return fromGeometry(new PCDLoader().parse(buffer).geometry)
    case "ply":
      return fromGeometry(new PLYLoader().parse(buffer))
  }
}

/** Keep at most `max` points (uniform stride) so huge scans stay interactive. */
export function decimate(cloud: PointCloud, max: number): PointCloud {
  if (cloud.count <= max) return cloud
  const step = cloud.count / max
  const positions = new Float32Array(max * 3)
  const intensity = cloud.intensity ? new Float32Array(max) : undefined
  const colors = cloud.colors ? new Float32Array(max * 3) : undefined
  for (let i = 0; i < max; i++) {
    const from = Math.floor(i * step)
    positions.set(cloud.positions.subarray(from * 3, from * 3 + 3), i * 3)
    if (intensity) intensity[i] = cloud.intensity![from]
    if (colors) colors.set(cloud.colors!.subarray(from * 3, from * 3 + 3), i * 3)
  }
  return { positions, intensity, colors, count: max }
}

/** Axis-aligned bounds of the cloud. */
export function boundsOf(positions: Float32Array) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < positions.length; i += 3) {
    for (let axis = 0; axis < 3; axis++) {
      const v = positions[i + axis]
      if (v < min[axis]) min[axis] = v
      if (v > max[axis]) max[axis] = v
    }
  }
  return { min, max }
}
