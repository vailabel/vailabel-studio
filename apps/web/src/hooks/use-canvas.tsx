import { Point } from "@/lib/types"
import { useState } from "react"

export const useCanvas = () => {
  const [isDragging, setIsDragging] = useState(false)
  const [startPoint, setStartPoint] = useState<Point | null>(null)
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null)
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([])
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null)

  return {
    isDragging,
    setIsDragging,
    startPoint,
    setStartPoint,
    currentPoint,
    setCurrentPoint,
    polygonPoints,
    setPolygonPoints,
    panOffset,
    setPanOffset,
    isPanning,
    setIsPanning,
    lastPanPoint,
    setLastPanPoint,
  }
}
