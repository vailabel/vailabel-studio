import { memo } from "react"
import { Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { ProjectEditForm } from "@/viewmodels/project-detail-viewmodel"
import { ProjectEditSchema } from "@/viewmodels/project-detail-viewmodel"

interface EditProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (formData: ProjectEditForm) => Promise<void>
  isLoading: boolean
  projectName: string
  projectDescription?: string
}

export const EditProjectModal = memo(({
  isOpen,
  onClose,
  onSave,
  isLoading,
  projectName,
  projectDescription = "",
}: EditProjectModalProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProjectEditForm>({
    resolver: zodResolver(ProjectEditSchema),
    defaultValues: {
      name: projectName,
      description: projectDescription,
    },
  })

  const handleClose = () => {
    reset()
    onClose()
  }

  const onSubmit = async (formData: ProjectEditForm) => {
    await onSave(formData)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Edit Project
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name" className="text-sm font-medium">
              Project Name *
            </Label>
            <Input
              id="project-name"
              {...register("name")}
              placeholder="Enter project name"
              className="h-10"
              maxLength={100}
            />
            {errors.name && (
              <p className="text-red-500 text-xs flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <span>⚠</span>
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="project-description"
              {...register("description")}
              placeholder="Enter project description (optional)"
              className="min-h-[80px] resize-none"
              maxLength={500}
            />
            {errors.description && (
              <p className="text-red-500 text-xs flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <span>⚠</span>
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
})

EditProjectModal.displayName = "EditProjectModal"
