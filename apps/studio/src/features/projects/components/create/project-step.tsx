import { memo } from "react"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"
import { Textarea } from "@/shared/ui/textarea"

/** Step 1 — name and describe the project. */
export const ProjectStep = memo(
  ({
    name,
    description,
    onNameChange,
    onDescriptionChange,
  }: {
    name: string
    description: string
    onNameChange: (value: string) => void
    onDescriptionChange: (value: string) => void
  }) => (
    <FieldGroup className="mx-auto max-w-xl">
      <Field>
        <FieldLabel htmlFor="project-name">Project name</FieldLabel>
        <Input
          id="project-name"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="My dataset"
          autoFocus
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="project-description">Description</FieldLabel>
        <Textarea
          id="project-description"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="What is this dataset about?"
          rows={3}
        />
        <FieldDescription>Optional.</FieldDescription>
      </Field>
    </FieldGroup>
  )
)

ProjectStep.displayName = "ProjectStep"
