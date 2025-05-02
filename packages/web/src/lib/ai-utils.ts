interface Detection {
  box: [number, number, number, number] // [x, y, width, height] in normalized coordinates
  class: string
  confidence: number
}

// Mock COCO classes that YOLOv8 can detect
const COCO_CLASSES = [
  "person",
  "bicycle",
  "car",
  "motorcycle",
  "airplane",
  "bus",
  "train",
  "truck",
  "boat",
  "traffic light",
  "fire hydrant",
  "stop sign",
  "parking meter",
  "bench",
  "bird",
  "cat",
  "dog",
  "horse",
  "sheep",
  "cow",
  "elephant",
  "bear",
  "zebra",
  "giraffe",
  "backpack",
  "umbrella",
  "handbag",
  "tie",
  "suitcase",
  "frisbee",
  "skis",
  "snowboard",
  "sports ball",
  "kite",
  "baseball bat",
  "baseball glove",
  "skateboard",
  "surfboard",
  "tennis racket",
  "bottle",
  "wine glass",
  "cup",
  "fork",
  "knife",
  "spoon",
  "bowl",
  "banana",
  "apple",
  "sandwich",
  "orange",
  "broccoli",
  "carrot",
  "hot dog",
  "pizza",
  "donut",
  "cake",
  "chair",
  "couch",
  "potted plant",
  "bed",
  "dining table",
  "toilet",
  "tv",
  "laptop",
  "mouse",
  "remote",
  "keyboard",
  "cell phone",
  "microwave",
  "oven",
  "toaster",
  "sink",
  "refrigerator",
  "book",
  "clock",
  "vase",
  "scissors",
  "teddy bear",
  "hair drier",
  "toothbrush",
]

// Mock function to simulate YOLOv8 detection
// In a real application, this would call a server endpoint
export async function detectObjects(imageData: string): Promise<Detection[]> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Generate random detections for demo purposes
  const numDetections = Math.floor(Math.random() * 5) + 1 // 1-5 detections
  const detections: Detection[] = []

  for (let i = 0; i < numDetections; i++) {
    // Generate random box coordinates (normalized 0-1)
    const x = Math.random() * 0.7 // Keep within reasonable bounds
    const y = Math.random() * 0.7
    const width = Math.random() * 0.3 + 0.1 // Ensure some minimum width
    const height = Math.random() * 0.3 + 0.1 // Ensure some minimum height

    // Random class and confidence
    const classIndex = Math.floor(Math.random() * COCO_CLASSES.length)
    const confidence = Math.random() * 0.3 + 0.7 // 0.7-1.0 confidence

    detections.push({
      box: [x, y, width, height],
      class: COCO_CLASSES[classIndex],
      confidence,
    })
  }

  return detections
}

// In a real application, you would implement model upload and management
export async function uploadCustomModel(modelFile: File): Promise<boolean> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Pretend we've uploaded and loaded the model
  return true
}

// Function to get available models
export async function getAvailableModels(): Promise<string[]> {
  // In a real app, this would fetch from the server
  return ["yolov8n.pt", "yolov8s.pt", "yolov8m.pt", "yolov8l.pt", "yolov8x.pt"]
}

// Function to select a model
export async function selectModel(modelName: string): Promise<boolean> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Pretend we've selected the model
  return true
}
