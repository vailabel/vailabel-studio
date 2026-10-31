import { memo, useEffect, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import type { PointCloud } from "@/features/studio/model/lib/pointcloud/point-cloud"
import { boundsOf } from "@/features/studio/model/lib/pointcloud/point-cloud"
import type { Cuboid } from "@/features/studio/model/lib/pointcloud/cuboid"

export interface ViewCuboid extends Cuboid {
  id: string
  color: string
}

interface PointCloudViewportProps {
  cloud: PointCloud
  cuboids: ViewCuboid[]
  selectedId: string | null
}

/** Height-ramp color (blue low → red high), or intensity when present. */
function pointColors(cloud: PointCloud): Float32Array {
  if (cloud.colors) return cloud.colors
  const colors = new Float32Array(cloud.count * 3)
  const color = new THREE.Color()
  let lo = Infinity
  let hi = -Infinity
  const value = (i: number) => (cloud.intensity ? cloud.intensity[i] : cloud.positions[i * 3 + 2])
  for (let i = 0; i < cloud.count; i++) {
    const v = value(i)
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  const span = hi - lo || 1
  for (let i = 0; i < cloud.count; i++) {
    color.setHSL(0.66 - ((value(i) - lo) / span) * 0.66, 0.9, 0.55)
    colors.set([color.r, color.g, color.b], i * 3)
  }
  return colors
}

function cuboidObject(cuboid: ViewCuboid, selected: boolean): THREE.Object3D {
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(cuboid.length, cuboid.width, cuboid.height))
  const lines = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: selected ? "#ffffff" : cuboid.color })
  )
  lines.position.set(cuboid.x, cuboid.y, cuboid.z)
  lines.rotation.z = cuboid.yaw
  // Heading marker: a short line from the center to the front face.
  const heading = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(cuboid.length / 2, 0, 0),
  ])
  lines.add(new THREE.Line(heading, new THREE.LineBasicMaterial({ color: cuboid.color })))
  return lines
}

/**
 * Perspective 3D view of a point cloud (orbit / pan / zoom with the mouse) with
 * its cuboids as wireframes. Plain three.js on a ref'd canvas; the scene is
 * rebuilt only when the cloud changes, the boxes when the cuboids change.
 */
export const PointCloudViewport = memo(({ cloud, cuboids, selectedId }: PointCloudViewportProps) => {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{ scene: THREE.Scene; boxes: THREE.Group; render: () => void } | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setClearColor("#0b0f19")
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 5000)
    camera.up.set(0, 0, 1)

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(cloud.positions, 3))
    geometry.setAttribute("color", new THREE.BufferAttribute(pointColors(cloud), 3))
    scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.06, vertexColors: true })))
    scene.add(new THREE.AxesHelper(2))
    const boxes = new THREE.Group()
    scene.add(boxes)

    const { min, max } = boundsOf(cloud.positions)
    const center = new THREE.Vector3((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2)
    const radius = Math.max(max[0] - min[0], max[1] - min[1], 1)
    camera.position.set(center.x - radius * 0.6, center.y - radius * 0.6, center.z + radius * 0.5)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(center)
    const render = () => renderer.render(scene, camera)
    controls.addEventListener("change", render)
    controls.update()

    const resize = () => {
      const { clientWidth, clientHeight } = host
      if (!clientWidth || !clientHeight) return
      renderer.setSize(clientWidth, clientHeight)
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
      render()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()
    sceneRef.current = { scene, boxes, render }

    return () => {
      observer.disconnect()
      controls.dispose()
      geometry.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      sceneRef.current = null
    }
  }, [cloud])

  useEffect(() => {
    const current = sceneRef.current
    if (!current) return
    for (const child of [...current.boxes.children]) {
      current.boxes.remove(child)
      child.traverse((node) => {
        if (node instanceof THREE.LineSegments || node instanceof THREE.Line) {
          node.geometry.dispose()
          ;(node.material as THREE.Material).dispose()
        }
      })
    }
    for (const cuboid of cuboids) current.boxes.add(cuboidObject(cuboid, cuboid.id === selectedId))
    current.render()
  }, [cuboids, selectedId, cloud])

  return <div ref={hostRef} className="h-full w-full" />
})

PointCloudViewport.displayName = "PointCloudViewport"
