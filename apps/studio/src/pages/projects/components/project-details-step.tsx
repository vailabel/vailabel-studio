import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { LabelManager } from "@/components/ui/label-manager"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UseFormReturn } from "react-hook-form"
import { PROJECT_TYPES } from "@/viewmodels/project-create-viewmodel"
import type { ProjectDetailForm } from "@/viewmodels/project-create-viewmodel"

interface ProjectDetailsStepProps {
  form: UseFormReturn<ProjectDetailForm>
  onNext: () => void
  onAddLabel: (label: { name: string; color: string }) => void
  onRemoveLabel: (index: number) => void
  watchedLabels: Array<{ name: string; color: string }>
  watchedDescription: string
}

export function ProjectDetailsStep({
  form,
  onNext,
  onAddLabel,
  onRemoveLabel,
  watchedLabels,
  watchedDescription,
}: ProjectDetailsStepProps) {
  return (
    <>
      <CardHeader>
        <CardTitle>Project Details</CardTitle>
        <CardDescription>
          Provide basic information about your annotation project
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={onNext} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter a descriptive name for your project"
                      maxLength={100}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Choose a clear, descriptive name for your project
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your project goals, dataset characteristics, or any specific requirements..."
                      maxLength={500}
                      {...field}
                    />
                  </FormControl>
                  <div className="flex justify-between items-center">
                    <FormDescription>
                      Optional - Help others understand your project
                    </FormDescription>
                    <span className="text-xs text-muted-foreground">
                      {watchedDescription.length}/500
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose the type of annotation project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={PROJECT_TYPES.IMAGE_ANNOTATION}>
                        Image Annotation
                      </SelectItem>
                      <SelectItem value={PROJECT_TYPES.VIDEO_ANNOTATION}>
                        Video Annotation
                      </SelectItem>
                      <SelectItem value={PROJECT_TYPES.TEXT_ANNOTATION}>
                        Text Annotation
                      </SelectItem>
                      <SelectItem value={PROJECT_TYPES.AUDIO_ANNOTATION}>
                        Audio Annotation
                      </SelectItem>
                      <SelectItem value={PROJECT_TYPES.DOCUMENT_ANNOTATION}>
                        Document Annotation
                      </SelectItem>
                      <SelectItem value={PROJECT_TYPES.OBJECT_DETECTION}>
                        Object Detection
                      </SelectItem>
                      <SelectItem value={PROJECT_TYPES.SEGMENTATION}>
                        Segmentation
                      </SelectItem>
                      <SelectItem value={PROJECT_TYPES.CLASSIFICATION}>
                        Classification
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the type of annotation task for this project
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="labels"
              render={() => (
                <FormItem>
                  <FormLabel>Labels</FormLabel>
                  <FormControl>
                    <LabelManager
                      labels={watchedLabels}
                      onAddLabel={onAddLabel}
                      onRemoveLabel={onRemoveLabel}
                    />
                  </FormControl>
                  <FormDescription>
                    Add labels to categorize your annotations. At least one
                    label is required.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          onClick={onNext}
          disabled={watchedLabels.length === 0}
        >
          Next: Import Dataset
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </CardFooter>
    </>
  )
}
