// 3D boxes in the sensor frame: center (x, y, z), size along the box's own
// axes (length → heading, width → left, height → up) and yaw about z.

export interface Cuboid {
  x: number
  y: number
  z: number
  length: number
  width: number
  height: number
  /** Heading in radians, counter-clockwise from +x. */
  yaw: number
}

/** A point expressed in the cuboid's own frame (yaw undone, center at 0). */
function local(cuboid: Cuboid, px: number, py: number): [number, number] {
  const dx = px - cuboid.x
  const dy = py - cuboid.y
  const cos = Math.cos(-cuboid.yaw)
  const sin = Math.sin(-cuboid.yaw)
  return [dx * cos - dy * sin, dx * sin + dy * cos]
}

/** Is (px, py) inside the cuboid's footprint? */
export function inFootprint(cuboid: Cuboid, px: number, py: number): boolean {
  const [lx, ly] = local(cuboid, px, py)
  return Math.abs(lx) <= cuboid.length / 2 && Math.abs(ly) <= cuboid.width / 2
}

/** Number of points inside the cuboid. */
export function pointsInside(cuboid: Cuboid, positions: Float32Array): number {
  let count = 0
  const zMin = cuboid.z - cuboid.height / 2
  const zMax = cuboid.z + cuboid.height / 2
  for (let i = 0; i < positions.length; i += 3) {
    const z = positions[i + 2]
    if (z < zMin || z > zMax) continue
    if (inFootprint(cuboid, positions[i], positions[i + 1])) count++
  }
  return count
}

/**
 * Fit the vertical extent of a footprint to the points standing on it: from
 * the lowest to the highest point inside, ignoring the ground below `ground`.
 * Falls back to `fallbackHeight` metres above the lowest point when empty.
 */
export function fitHeight(
  footprint: Omit<Cuboid, "z" | "height">,
  positions: Float32Array,
  fallbackHeight = 1.5
): Cuboid {
  let zMin = Infinity
  let zMax = -Infinity
  const probe = { ...footprint, z: 0, height: 0 }
  for (let i = 0; i < positions.length; i += 3) {
    if (!inFootprint(probe, positions[i], positions[i + 1])) continue
    const z = positions[i + 2]
    if (z < zMin) zMin = z
    if (z > zMax) zMax = z
  }
  if (!Number.isFinite(zMin)) return { ...footprint, z: fallbackHeight / 2, height: fallbackHeight }
  const height = Math.max(0.2, zMax - zMin)
  return { ...footprint, z: zMin + height / 2, height }
}

/** Footprint from two dragged corners in the top view (yaw 0). */
export function footprintFromDrag(
  a: [number, number],
  b: [number, number]
): Omit<Cuboid, "z" | "height"> {
  return {
    x: (a[0] + b[0]) / 2,
    y: (a[1] + b[1]) / 2,
    length: Math.abs(b[0] - a[0]),
    width: Math.abs(b[1] - a[1]),
    yaw: 0,
  }
}

/** The four footprint corners (counter-clockwise), for drawing. */
export function footprintCorners(cuboid: Cuboid): Array<[number, number]> {
  const cos = Math.cos(cuboid.yaw)
  const sin = Math.sin(cuboid.yaw)
  const hl = cuboid.length / 2
  const hw = cuboid.width / 2
  return [
    [hl, hw],
    [-hl, hw],
    [-hl, -hw],
    [hl, -hw],
  ].map(([lx, ly]) => [cuboid.x + lx * cos - ly * sin, cuboid.y + lx * sin + ly * cos])
}
