import { useEffect, useState, useRef } from "react"
import { useDataAccess } from "@/hooks/use-data-access"
import type { Project, ImageData } from "@vailabel/core/src/models/types"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import ImageWithLoader from "@/components/image-loader"
import { useNavigate } from "react-router-dom"

const TaskSchema = z.object({
  name: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
  projectId: z.string().min(1, "Project is required"),
  imageIds: z.array(z.string()).min(1, "Select at least one image"),
})
type TaskFormValues = z.infer<typeof TaskSchema>

type AnnotationTask = {
  id: string
  name: string
  description: string
  projectId: string
  imageIds: string[]
  createdAt: string
}

export default function CreateTaskPage() {
  const dataAccess = useDataAccess()
  const [projects, setProjects] = useState<Project[]>([])
  const [images, setImages] = useState<ImageData[]>([])
  const [error, setError] = useState<string | null>(null)
  const taskNameRef = useRef<HTMLInputElement>(null)
  const selectAllRef = useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()

  // react-hook-form setup
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(TaskSchema),
    defaultValues: { name: "", description: "", projectId: "", imageIds: [] },
  })
  const watchedProjectId = watch("projectId")
  const watchedImageIds = watch("imageIds")

  // Load projects on mount
  useEffect(() => {
    dataAccess
      .getProjects()
      .then(setProjects)
      .catch((e) => setError(e.message || "Failed to load projects"))
  }, [dataAccess])

  // Load images when project changes
  useEffect(() => {
    if (!watchedProjectId) return
    dataAccess
      .getImages(watchedProjectId)
      .then(setImages)
      .catch((e) => setError(e.message || "Failed to load images"))
  }, [watchedProjectId, dataAccess])

  // Indeterminate state for select all
  useEffect(() => {
    if (!selectAllRef.current) return
    const input = selectAllRef.current.querySelector(
      'input[type="checkbox"]'
    ) as HTMLInputElement | null
    if (!input) return
    if (images.length === 0) {
      input.indeterminate = false
    } else if (
      watchedImageIds?.length > 0 &&
      watchedImageIds.length < images.length
    ) {
      input.indeterminate = true
    } else {
      input.indeterminate = false
    }
  }, [watchedImageIds, images.length])

  // Save tasks to localStorage
  const saveTasks = (newTasks: AnnotationTask[]) => {
    localStorage.setItem("annotationTasks", JSON.stringify(newTasks))
  }

  // Create a new task
  const onSubmit = (data: TaskFormValues) => {
    const saved = localStorage.getItem("annotationTasks")
    let tasks: AnnotationTask[] = []
    if (saved) {
      try {
        tasks = JSON.parse(saved)
      } catch {
        tasks = []
      }
    }
    const newTask: AnnotationTask = {
      id: Date.now().toString(),
      name: data.name,
      description: data.description || "",
      projectId: data.projectId,
      imageIds: data.imageIds,
      createdAt: new Date().toISOString(),
    }
    const updated = [newTask, ...tasks]
    saveTasks(updated)
    reset()
    setError(null)
    navigate("/tasks")
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Create Annotation Task</h1>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Task Name</label>
          <Input {...register("name")} ref={taskNameRef} className="w-full" />
          {errors.name && (
            <div className="text-red-500 text-xs mt-1">
              {errors.name.message}
            </div>
          )}
        </div>
        <div>
          <label className="block mb-1 font-medium">Description</label>
          <Textarea {...register("description")} className="w-full" rows={2} />
          {errors.description && (
            <div className="text-red-500 text-xs mt-1">
              {errors.description.message}
            </div>
          )}
        </div>
        <div>
          <label className="block mb-1 font-medium">Project</label>
          <Select
            value={watchedProjectId}
            onValueChange={(val) => {
              setValue("projectId", val)
              setValue("imageIds", [])
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.projectId && (
            <div className="text-red-500 text-xs mt-1">
              {errors.projectId.message}
            </div>
          )}
        </div>
        <div>
          <label className="block mb-1 font-medium">Select Images</label>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    ref={selectAllRef}
                    checked={
                      images.length > 0 &&
                      watchedImageIds?.length === images.length
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setValue(
                          "imageIds",
                          images.map((img) => img.id)
                        )
                      } else {
                        setValue("imageIds", [])
                      }
                    }}
                    aria-label="Select all images"
                  />
                </TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {images.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-gray-400 text-center">
                    No images in this project.
                  </TableCell>
                </TableRow>
              ) : (
                images.map((img) => (
                  <TableRow key={img.id}>
                    <TableCell>
                      <Checkbox
                        checked={watchedImageIds?.includes(img.id)}
                        onCheckedChange={(checked) => {
                          let newImageIds = watchedImageIds || []
                          if (checked) {
                            newImageIds = [...newImageIds, img.id]
                          } else {
                            newImageIds = newImageIds.filter(
                              (id) => id !== img.id
                            )
                          }
                          setValue("imageIds", newImageIds)
                        }}
                        aria-label={`Select image ${img.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      {img.url ? (
                        <ImageWithLoader imageId={img.id} alt={img.name} />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400">
                          N/A
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{img.name}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {errors.imageIds && (
            <div className="text-red-500 text-xs mt-1">
              {errors.imageIds.message}
            </div>
          )}
          {/* Selected Images Preview */}
          {watchedImageIds && watchedImageIds.length > 0 && (
            <div className="mt-3">
              <div className="font-medium mb-1 text-xs text-gray-500">
                Selected Images:
              </div>
              <div className="flex flex-wrap gap-2">
                {images
                  .filter((img) => watchedImageIds.includes(img.id))
                  .map((img) => (
                    <div key={img.id} className="flex flex-col items-center">
                      {img.url ? (
                        <ImageWithLoader imageId={img.id} alt={img.name} />
                      ) : (
                        <div className="w-14 h-14 bg-gray-200 rounded flex items-center justify-center text-gray-400">
                          N/A
                        </div>
                      )}
                      <span className="text-xs mt-1 max-w-[56px] truncate">
                        {img.name}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/tasks")}
          >
            Cancel
          </Button>
          <Button type="submit">Create</Button>
        </div>
      </form>
    </div>
  )
}
