import { memo } from "react"
import { Card } from "@/components/ui/card"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ProjectDetailSchema,
  useProjectCreateViewModel,
  PROJECT_TYPES,
} from "@/viewmodels/project-create-viewmodel"
import type { ProjectDetailForm } from "@/viewmodels/project-create-viewmodel"
import { ProjectCreateHeader } from "./components/project-create-header"
import { ProjectStepper } from "./components/project-stepper"
import { ProjectDetailsStep } from "./components/project-details-step"
import { DatasetUploadStep } from "./components/dataset-upload-step"
import { ProjectProgressIndicator } from "./components/project-progress-indicator"

const steps = [
  { label: "Project Details", description: "Basic information and labels" },
  { label: "Import Dataset", description: "Upload your images" },
]

export const ProjectCreate = memo(() => {
  const viewModel = useProjectCreateViewModel()

  const form = useForm<ProjectDetailForm>({
    resolver: zodResolver(ProjectDetailSchema),
    defaultValues: {
      name: "",
      description: "",
      type: PROJECT_TYPES.IMAGE_ANNOTATION,
      labels: [],
    },
  })

  const watchedLabels = form.watch("labels") || []
  const watchedDescription = form.watch("description") || ""

  const handleNextStep = form.handleSubmit(() => {
    viewModel.goToNextStep()
  })

  const handleCreateProject = async () => {
    const formData = form.getValues()
    const validationErrors = viewModel.validateForm(formData)

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    await viewModel.createProject(formData)
  }

  const handleAddLabel = (label: { name: string; color: string }) => {
    const currentLabels = form.getValues("labels") || []
    form.setValue("labels", [...currentLabels, label], { shouldValidate: true })
  }

  const handleRemoveLabel = (index: number) => {
    const currentLabels = form.getValues("labels") || []
    const newLabels = currentLabels.filter((_, i) => i !== index)
    form.setValue("labels", newLabels, { shouldValidate: true })
  }

  const stepIndex = viewModel.step === "details" ? 0 : 1

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <ProjectCreateHeader />

        <ProjectStepper steps={steps} currentStep={stepIndex} />

        <div className="max-w-5xl mx-auto">
          <Card>
            {viewModel.step === "details" && (
              <ProjectDetailsStep
                form={form}
                onNext={handleNextStep}
                onAddLabel={handleAddLabel}
                onRemoveLabel={handleRemoveLabel}
                watchedLabels={watchedLabels}
                watchedDescription={watchedDescription}
              />
            )}

            {viewModel.step === "dataset" && (
              <DatasetUploadStep
                onBack={viewModel.goToPreviousStep}
                onCreate={handleCreateProject}
                isUploading={viewModel.isUploading}
                isCreating={viewModel.isCreating}
                uploadProgress={viewModel.uploadProgress}
                images={viewModel.images}
                onFiles={viewModel.handleFiles}
                onRemoveImage={viewModel.handleRemoveImage}
              />
            )}
          </Card>
        </div>

        <ProjectProgressIndicator
          currentStep={stepIndex}
          totalSteps={steps.length}
          stepLabel={stepIndex === 0 ? "Project Setup" : "Dataset Import"}
        />
      </div>
    </div>
  )
})

ProjectCreate.displayName = "ProjectCreate"
