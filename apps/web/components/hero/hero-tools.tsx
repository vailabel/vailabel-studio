import { Square, Hexagon, Pencil, Wand2, Layers } from "lucide-react"
import type { ReactNode } from "react"

export type LabelingTool = {
  name: string
  icon: ReactNode
  image: string
  color: string
  description: string
}

export const labelingTools: LabelingTool[] = [
  {
    name: "Box Tool",
    icon: <Square className="w-5 h-5" />,
    image: "/demo-cars.svg",
    color: "bg-blue-500",
    description: "Create bounding boxes around objects for quick labeling",
  },
  {
    name: "Polygon Tool",
    icon: <Hexagon className="w-5 h-5" />,
    image: "/demo-people.svg",
    color: "bg-purple-500",
    description:
      "Draw precise polygons for irregular shapes and detailed annotations",
  },
  {
    name: "Brush Tool",
    icon: <Pencil className="w-5 h-5" />,
    image: "/demo-nature.svg",
    color: "bg-green-500",
    description: "Free-form drawing for pixel-perfect segmentation masks",
  },
  {
    name: "AI Assist",
    icon: <Wand2 className="w-5 h-5" />,
    image: "/demo-warehouse.svg",
    color: "bg-amber-500",
    description:
      "Auto-label with local ONNX models (YOLO-family), GPU-accelerated",
  },
  {
    name: "Layer Manager",
    icon: <Layers className="w-5 h-5" />,
    image: "/demo-layers.svg",
    color: "bg-pink-500",
    description: "Organize and manage annotation layers for complex projects",
  },
]
