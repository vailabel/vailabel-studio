import { useEffect, useState } from "react"
import type {
  Project,
  ImageData,
  Annotation,
} from "@vailabel/core/src/models/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { Combobox } from "@/components/ui/combobox"

interface Task {
  id: string
  name: string
  description: string
  projectId: string
  imageIds: string[]
  createdAt: string
}

export default function TaskPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [images, setImages] = useState<ImageData[]>([])
  const [selectedImage, setSelectedImage] = useState<string>("")
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [error, setError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Image Annotation Tasks</h1>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-2">
        <span className="font-semibold text-lg">Tasks</span>
        <Button asChild className="w-full md:w-auto">
          <Link to="/tasks/create">+ Create Task</Link>
        </Button>
      </div>
      {/* Task List */}
      <div className="mb-8">
        {tasks.length === 0 ? (
          <div className="text-gray-400 text-center py-8 border rounded bg-muted/30">
            No tasks created yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasks.map((task) => (
              <Card key={task.id} className="transition-shadow hover:shadow-lg">
                <CardContent className="p-4 flex flex-col gap-1">
                  <div
                    className="font-medium text-lg truncate"
                    title={task.name}
                  >
                    {task.name}
                  </div>
                  {task.description && (
                    <div
                      className="text-xs text-gray-500 mb-1 line-clamp-2"
                      title={task.description}
                    >
                      {task.description}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mb-1">
                    Project:{" "}
                    {projects.find((p) => p.id === task.projectId)?.name ||
                      task.projectId}
                  </div>
                  <div className="text-xs text-gray-500">
                    Images: {task.imageIds.length}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Created: {new Date(task.createdAt).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {/* Project/Image/Annotation selection */}
      <div className="mt-8">
        <div className="mb-4 flex flex-col md:flex-row gap-4">
          <div className="flex-1 min-w-[180px]">
            <label className="block mb-1 font-medium">Project</label>
            <Combobox
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              value={selectedProject}
              onChange={(val) => {
                setSelectedProject(val)
                setSelectedImage("")
                setAnnotations([])
              }}
              placeholder="Select project"
              className="w-full"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block mb-1 font-medium">Image</label>
            <Combobox
              options={images.map((img) => ({
                value: img.id,
                label: img.name,
              }))}
              value={selectedImage}
              onChange={setSelectedImage}
              placeholder="Select image"
              className="w-full"
              disabled={!selectedProject}
            />
          </div>
        </div>
        {selectedImage && (
          <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 shadow">
            <h2 className="font-semibold mb-2">Annotations</h2>
            {annotations.length === 0 ? (
              <div className="text-gray-400">No annotations yet.</div>
            ) : (
              <ul className="space-y-2">
                {annotations.map((a) => (
                  <li key={a.id} className="border-b pb-2">
                    <div className="text-sm font-medium">
                      {a.name || a.type}
                    </div>
                    <div className="text-xs text-gray-500">Type: {a.type}</div>
                  </li>
                ))}
              </ul>
            )}
            {/* Annotation UI/tools would go here */}
          </div>
        )}
      </div>
    </div>
  )
}
