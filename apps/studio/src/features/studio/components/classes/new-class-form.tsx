import { memo, useState, type FormEvent } from "react"
import { Loader2, Plus } from "lucide-react"
import type { Label } from "@/shared/types/core"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { toErrorMessage } from "@/shared/lib/errors"
import {
  findLabelByName,
  nextPaletteColor,
} from "@/features/studio/model/lib/label-palette"
import { ClassColorPicker } from "./class-color-picker"

interface NewClassFormProps {
  labels: Label[]
  onCreate: (input: { name: string; color: string }) => Promise<unknown>
  autoFocus?: boolean
}

/**
 * One-line "add a class" form: type a name, optionally pick a color, press
 * Enter. A distinct palette color is pre-picked so most users never touch it.
 */
export const NewClassForm = memo(
  ({ labels, onCreate, autoFocus }: NewClassFormProps) => {
    const [name, setName] = useState("")
    // Until the user picks a color, keep suggesting the next free palette color.
    const [pickedColor, setPickedColor] = useState<string | null>(null)
    const color = pickedColor ?? nextPaletteColor(labels)
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    const duplicate = findLabelByName(labels, name)

    const submit = async (event: FormEvent) => {
      event.preventDefault()
      const trimmed = name.trim()
      if (!trimmed || busy) return
      if (duplicate) {
        setError(`“${duplicate.name}” already exists.`)
        return
      }
      setBusy(true)
      setError(null)
      try {
        await onCreate({ name: trimmed, color })
        setName("")
        setPickedColor(null)
      } catch (createError) {
        setError(toErrorMessage(createError))
      } finally {
        setBusy(false)
      }
    }

    return (
      <form onSubmit={submit} className="space-y-1">
        <div className="flex items-center gap-2">
          <ClassColorPicker
            color={color}
            onChange={setPickedColor}
            label="Pick a color for the new class"
          />
          <Input
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
            placeholder="New class name, e.g. car"
            aria-label="New class name"
            autoFocus={autoFocus}
            className="h-8 flex-1"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setName("")
                setError(null)
                ;(event.target as HTMLInputElement).blur()
              }
            }}
          />
          <Button
            type="submit"
            size="sm"
            className="h-8"
            disabled={!name.trim() || busy}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Add
          </Button>
        </div>
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : duplicate && name.trim() ? (
          <p className="text-xs text-muted-foreground">
            “{duplicate.name}” already exists — pick it from the list below.
          </p>
        ) : null}
      </form>
    )
  }
)

NewClassForm.displayName = "NewClassForm"
