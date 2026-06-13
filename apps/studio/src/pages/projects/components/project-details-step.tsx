import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { UseFormReturn } from "react-hook-form"
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
