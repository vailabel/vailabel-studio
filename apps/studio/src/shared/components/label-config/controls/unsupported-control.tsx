import { memo } from "react"
import { Field } from "./field"
import { controlTitle } from "./control-helpers"
import type { ControlWidgetProps } from "./types"

// Fallback for a control tag with no registered widget yet.
export const UnsupportedControl = memo(({ control }: ControlWidgetProps) => (
  <Field title={controlTitle(control)}>
    <p className="text-xs text-muted-foreground">
      Control “{control.tag}” isn’t supported yet.
    </p>
  </Field>
))

UnsupportedControl.displayName = "UnsupportedControl"
