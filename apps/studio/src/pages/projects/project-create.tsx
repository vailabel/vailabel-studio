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
import {
  ProjectDetailSchema,
  useProjectCreateViewModel,
  PROJECT_TYPES,
} from "@/viewmodels/project-create-viewmodel"
import type { ProjectDetailForm } from "@/viewmodels/project-create-viewmodel"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
    defaultValues: {
      name: "",
      description: "",
      type: PROJECT_TYPES.IMAGE_ANNOTATION,
      labels: [],
    },
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 blur-3xl -z-10" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground via-primary to-purple-600 bg-clip-text text-transparent mb-4">
              Create New Project
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Set up your annotation project with labels and images. Build
              powerful datasets for your AI models.
            </p>
          </div>
        </motion.div>

        {/* Stepper */}
        <Stepper steps={steps} currentStep={stepIndex} />

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-5xl mx-auto"
        >
          <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur-xl relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-xl pointer-events-none" />

            <CardContent className="p-8 md:p-12 relative">
              <AnimatePresence mode="wait">
                {viewModel.step === "details" && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-10"
                  >
                    <form onSubmit={handleNextStep} className="space-y-10">
                      {/* Project Name */}
                      <div className="space-y-3">
                        <Label
                          htmlFor="project-name"
                          className="text-lg font-semibold text-foreground flex items-center gap-2"
                        >
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          Project Name *
                        </Label>
                        <Input
                          id="project-name"
                          {...register("name")}
                          placeholder="Enter a descriptive name for your project"
                          className="h-14 text-base border-2 focus:border-primary/50 transition-all duration-200 bg-background/50 backdrop-blur-sm"
                          maxLength={100}
                        />
                        {errors.name && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-destructive text-sm flex items-center gap-2 bg-destructive/10 p-3 rounded-lg border border-destructive/20"
                          >
                            <span className="text-destructive">⚠</span>
                            {errors.name.message}
                          </motion.div>
                        )}
                      </div>

                      {/* Description */}
                      <div className="space-y-3">
                        <Label
                          htmlFor="project-desc"
                          className="text-lg font-semibold text-foreground flex items-center gap-2"
                        >
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          Description
                        </Label>
                        <Textarea
                          id="project-desc"
                          {...register("description")}
                          placeholder="Describe your project goals, dataset characteristics, or any specific requirements..."
                          className="min-h-[120px] text-base resize-none border-2 focus:border-primary/50 transition-all duration-200 bg-background/50 backdrop-blur-sm"
                          maxLength={500}
                        />
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-muted-foreground">
                            Optional - Help others understand your project
                          </p>
                          <p className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                            {watch("description")?.length || 0}/500
                          </p>
                        </div>
                      </div>

                      {/* Project Type */}
                      <div className="space-y-3">
                        <Label
                          htmlFor="project-type"
                          className="text-lg font-semibold text-foreground flex items-center gap-2"
                        >
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          Project Type *
                        </Label>
                        <Select
                          value={watch("type")}
                          onValueChange={(value) => setValue("type", value)}
                        >
                          <SelectTrigger className="h-14 text-base border-2 focus:border-primary/50 transition-all duration-200 bg-background/50 backdrop-blur-sm">
                            <SelectValue placeholder="Choose the type of annotation project" />
                          </SelectTrigger>
                          <SelectContent className="bg-background/95 backdrop-blur-xl border-2">
                            <SelectItem
                              value={PROJECT_TYPES.IMAGE_ANNOTATION}
                              className="py-3"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  Image Annotation
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Annotate objects in images
                                </span>
                              </div>
                            </SelectItem>
                            <SelectItem
                              value={PROJECT_TYPES.VIDEO_ANNOTATION}
                              className="py-3"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  Video Annotation
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Track objects across video frames
                                </span>
                              </div>
                            </SelectItem>
                            <SelectItem
                              value={PROJECT_TYPES.TEXT_ANNOTATION}
                              className="py-3"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  Text Annotation
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Label text entities and sentiment
                                </span>
                              </div>
                            </SelectItem>
                            <SelectItem
                              value={PROJECT_TYPES.AUDIO_ANNOTATION}
                              className="py-3"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  Audio Annotation
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Transcribe and label audio content
                                </span>
                              </div>
                            </SelectItem>
                            <SelectItem
                              value={PROJECT_TYPES.DOCUMENT_ANNOTATION}
                              className="py-3"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  Document Annotation
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Extract information from documents
                                </span>
                              </div>
                            </SelectItem>
                            <SelectItem
                              value={PROJECT_TYPES.OBJECT_DETECTION}
                              className="py-3"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  Object Detection
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Detect and classify objects
                                </span>
                              </div>
                            </SelectItem>
                            <SelectItem
                              value={PROJECT_TYPES.SEGMENTATION}
                              className="py-3"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  Segmentation
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Pixel-level image segmentation
                                </span>
                              </div>
                            </SelectItem>
                            <SelectItem
                              value={PROJECT_TYPES.CLASSIFICATION}
                              className="py-3"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  Classification
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Categorize images or content
                                </span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.type && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-destructive text-sm flex items-center gap-2 bg-destructive/10 p-3 rounded-lg border border-destructive/20"
                          >
                            <span className="text-destructive">⚠</span>
                            {errors.type.message}
                          </motion.div>
                        )}
                      </div>

                      {/* Labels */}
                      <div className="space-y-3">
                        <Label className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          Labels *
                        </Label>
                        <LabelManager
                          labels={watchedLabels}
                          onAddLabel={handleAddLabel}
                          onRemoveLabel={handleRemoveLabel}
                        />
                        {errors.labels && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-destructive text-sm flex items-center gap-2 bg-destructive/10 p-3 rounded-lg border border-destructive/20"
                          >
                            <span className="text-destructive">⚠</span>
                            {errors.labels.message}
                          </motion.div>
                        )}
                      </div>

                      {/* Next Button */}
                      <div className="flex justify-end pt-8 border-t border-border/50">
                        <Button
                          type="submit"
                          size="lg"
                          className="px-10 py-4 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="space-y-10"
                  >
                    {/* Image Upload */}
                    <div className="space-y-6">
                      <div>
                        <Label className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          Images (Optional)
                        </Label>
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                          Upload images for annotation. You can also add images
                          later from the project dashboard.
                          <br />
                          <span className="text-xs bg-muted/50 px-2 py-1 rounded-full mt-1 inline-block">
                            Supported formats: PNG, JPG, GIF • Max size: 10MB
                            per image
                          </span>
                        </p>
                      </div>

                      <ImageUploadArea
                        onFiles={viewModel.handleFiles}
                        isUploading={viewModel.isUploading}
                        uploadProgress={viewModel.uploadProgress}
                      />
                    </div>

                    {/* Image Grid */}
                    <ImageGrid
                      images={viewModel.images}
                      onRemove={viewModel.handleRemoveImage}
                    />

                    {/* Action Buttons */}
                    <div className="flex justify-between pt-8 border-t border-border/50">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={viewModel.goToPreviousStep}
                        className="px-8 py-4 text-base font-semibold border-2 hover:bg-muted/50 transition-all duration-200"
                      >
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Back
                      </Button>

                      <Button
                        onClick={handleCreateProject}
                        disabled={viewModel.isUploading || viewModel.isCreating}
                        size="lg"
                        className="px-10 py-4 text-base font-semibold bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-card/80 backdrop-blur-xl rounded-full border border-border/50 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-sm font-medium text-foreground">
                Step {stepIndex + 1} of {steps.length}
              </span>
            </div>
            <div className="w-px h-4 bg-border/50" />
            <div className="text-xs text-muted-foreground">
              {stepIndex === 0 ? "Project Setup" : "Dataset Import"}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
})

ProjectCreate.displayName = "ProjectCreate"
