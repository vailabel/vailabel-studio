import { Task } from "@vailabel/core"

export const sampleTasks: Task[] = [
  {
    id: "task-1",
    name: "Label Dataset Images",
    description:
      "Label all images in the medical dataset with appropriate bounding boxes for tumor detection",
    status: "in-progress",
    assignedTo: "John Doe",
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    projectId: "project-1",
    labels: [
      { id: "label-1", name: "Medical", color: "#ef4444" },
      { id: "label-2", name: "High Priority", color: "#f97316" },
    ],
    annotations: [],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
  },
  {
    id: "task-2",
    name: "Review Annotation Quality",
    description:
      "Review and validate the quality of annotations created by the AI model",
    status: "pending",
    assignedTo: "Jane Smith",
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
    projectId: "project-1",
    labels: [
      { id: "label-3", name: "QA", color: "#3b82f6" },
      { id: "label-4", name: "Review", color: "#8b5cf6" },
    ],
    annotations: [],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: "task-3",
    name: "Setup AI Model Training",
    description:
      "Configure and train the new YOLO model for object detection using the labeled dataset",
    status: "blocked",
    assignedTo: "Bob Johnson",
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Overdue by 1 day
    projectId: "project-2",
    labels: [
      { id: "label-5", name: "AI/ML", color: "#10b981" },
      { id: "label-6", name: "Training", color: "#f59e0b" },
    ],
    annotations: [],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: "task-4",
    name: "Export Annotations",
    description:
      "Export all completed annotations in COCO format for external validation",
    status: "completed",
    assignedTo: "Alice Wilson",
    dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    projectId: "project-1",
    labels: [
      { id: "label-7", name: "Export", color: "#6366f1" },
      { id: "label-8", name: "Completed", color: "#10b981" },
    ],
    annotations: [],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: "task-5",
    name: "Update Documentation",
    description:
      "Update the project documentation with the latest annotation guidelines and best practices",
    status: "pending",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    projectId: "project-1",
    labels: [{ id: "label-9", name: "Documentation", color: "#8b5cf6" }],
    annotations: [],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
]
