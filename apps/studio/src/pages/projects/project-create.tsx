import { memo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, ArrowRight, Loader2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Stepper } from "@/components/ui/stepper"
import { ImageUploadArea, ImageGrid } from "@/components/ui/image-upload"
import { LabelManager } from "@/components/ui/label-manager"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ProjectDetailSchema, useProjectCreateViewModel } from "@/viewmodels/project-create-viewmodel"
import type { ProjectDetailForm } from "@/viewmodels/project-create-viewmodel"

const steps = [
  { label: "Project Details", description: "Basic information and labels" },
  { label: "Import Dataset", description: "Upload your images" },
]

export const ProjectCreate = memo(() => {
  const viewModel = useProjectCreateViewModel()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
  } = useForm<ProjectDetailForm>({
    resolver: zodResolver(ProjectDetailSchema),
    defaultValues: { name: "", description: "", labels: [] },
  })

  const watchedLabels = watch("labels") || []

  const handleNextStep = handleSubmit(() => {
    viewModel.goToNextStep()
  })

  const handleCreateProject = async () => {
    const formData = getValues()
    const validationErrors = viewModel.validateForm(formData)
    
    if (Object.keys(validationErrors).length > 0) {
      // Handle validation errors
      return
    }
    
    await viewModel.createProject(formData)
  }

  const handleAddLabel = (label: { name: string; color: string }) => {
    const currentLabels = getValues("labels") || []
    setValue("labels", [...currentLabels, label], { shouldValidate: true })
  }

  const handleRemoveLabel = (index: number) => {
    const currentLabels = getValues("labels") || []
    const newLabels = currentLabels.filter((_, i) => i !== index)
    setValue("labels", newLabels, { shouldValidate: true })
  }

  const stepIndex = viewModel.step === "details" ? 0 : 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Create New Project
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Set up your annotation project with labels and images
          </p>
        </motion.div>

        {/* Stepper */}
        <Stepper steps={steps} currentStep={stepIndex} />

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <AnimatePresence mode="wait">
                {viewModel.step === "details" && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-8"
                  >
                    <form onSubmit={handleNextStep} className="space-y-8">
                      {/* Project Name */}
                      <div className="space-y-2">
                        <Label htmlFor="project-name" className="text-base font-semibold">
                          Project Name *
                        </Label>
                        <Input
                          id="project-name"
                          {...register("name")}
                          placeholder="Enter project name"
                          className="h-12 text-base"
                          maxLength={100}
                        />
                        {errors.name && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-red-500 text-sm flex items-center gap-1"
                          >
                            <span>⚠</span>
                            {errors.name.message}
                          </motion.div>
                        )}
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <Label htmlFor="project-desc" className="text-base font-semibold">
                          Description
                        </Label>
                        <Textarea
                          id="project-desc"
                          {...register("description")}
                          placeholder="Describe your project (optional)"
                          className="min-h-[100px] text-base resize-none"
                          maxLength={500}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {watch("description")?.length || 0}/500 characters
                        </p>
                      </div>

                      {/* Labels */}
                      <LabelManager
                        labels={watchedLabels}
                        onAddLabel={handleAddLabel}
                        onRemoveLabel={handleRemoveLabel}
                      />
                      {errors.labels && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-sm flex items-center gap-1"
                        >
                          <span>⚠</span>
                          {errors.labels.message}
                        </motion.div>
                      )}

                      {/* Next Button */}
                      <div className="flex justify-end pt-4">
                        <Button
                          type="submit"
                          size="lg"
                          className="px-8 py-3 text-base font-semibold"
                          disabled={watchedLabels.length === 0}
                        >
                          Next: Import Dataset
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {viewModel.step === "dataset" && (
                  <motion.div
                    key="dataset"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-8"
                  >
                    {/* Image Upload */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base font-semibold">Images *</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Upload images for annotation. Supported formats: PNG, JPG, GIF
                        </p>
                      </div>
                      
                      <ImageUploadArea
                        onFiles={viewModel.handleFiles}
                        isUploading={viewModel.isUploading}
                      />
                    </div>

                    {/* Image Grid */}
                    <ImageGrid
                      images={viewModel.images}
                      onRemove={viewModel.handleRemoveImage}
                    />

                    {/* Action Buttons */}
                    <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={viewModel.goToPreviousStep}
                        className="px-8 py-3 text-base font-semibold"
                      >
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Back
                      </Button>
                      
                      <Button
                        onClick={handleCreateProject}
                        disabled={viewModel.isUploading || viewModel.isCreating || viewModel.images.length === 0}
                        size="lg"
                        className="px-8 py-3 text-base font-semibold"
                      >
                        {viewModel.isCreating ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Creating Project...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-5 w-5" />
                            Create Project
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Progress Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-gray-800/60 rounded-full backdrop-blur-sm">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Step {stepIndex + 1} of {steps.length}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  )
})

ProjectCreate.displayName = "ProjectCreate"