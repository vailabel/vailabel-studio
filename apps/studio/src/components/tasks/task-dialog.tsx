import React, { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {  Plus, Save, X } from "lucide-react"
import { Task } from "@/types/core"

const taskFormSchema = z.object({
  name: z.string().min(1, "Task name is required"),
  description: z.string().min(1, "Description is required"),
  status: z.enum(["pending", "in-progress", "completed", "blocked"]),
  assignedTo: z.string().optional(),
  dueDate: z.date().optional(),
  projectId: z.string().min(1, "Project is required"),
})

type TaskFormValues = z.infer<typeof taskFormSchema>

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task | null
  onSave: (
    task: Omit<Task, "id" | "createdAt" | "updatedAt"> & { id?: string }
  ) => void
  projects: Array<{ id: string; name: string }>
  users?: Array<{ id: string; name: string; email: string }>
}



export const TaskDialog: React.FC<TaskDialogProps> = ({
  open,
  onOpenChange,
  task,
  onSave,
  projects,
  users = [],
}) => {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "pending",
      assignedTo: "",
      projectId: "",
    },
  })

  useEffect(() => {
    if (task) {
      form.reset({
        name: task.name,
        description: task.description,
        status: task.status as
          | "pending"
          | "in-progress"
          | "completed"
          | "blocked",
        assignedTo: task.assignedTo || "",
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        projectId: task.projectId || projects[0]?.id || "",
      })
    } else {
      form.reset({
        name: "",
        description: "",
        status: "pending",
        assignedTo: "",
        dueDate: undefined,
        projectId: projects[0]?.id || "",
      })
    }
  }, [task, form, projects])

  const onSubmit = (values: TaskFormValues) => {
    const taskData = {
      ...values,
      id: task?.id,
      labels: task?.labels || [],
      annotations: task?.annotations || [],
    }
    onSave(taskData)
    onOpenChange(false)
    if (!task) {
      form.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            {task ? (
              <>
                <Save className="w-5 h-5 text-primary" />
                Edit Task
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 text-primary" />
                Create New Task
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-base">
            {task
              ? "Update the task details below to modify the existing task."
              : "Fill in the details below to create a new task for your project."}
          </DialogDescription>
        </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information Card */}
            <Card className="border-0 shadow-lg bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Task Name *
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter task name..."
                            className="h-10"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Project *
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Description *
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter task description..."
                          className="min-h-[120px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Task Configuration Card */}
            <Card className="border-0 shadow-lg bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">
                  Task Configuration
                </CardTitle>
              </CardHeader>
            </Card>

            <Separator />

            <DialogFooter className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button type="submit" className="gap-2 shadow-lg">
                {task ? (
                  <>
                    <Save className="w-4 h-4" />
                    Update Task
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Task
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  )
}

