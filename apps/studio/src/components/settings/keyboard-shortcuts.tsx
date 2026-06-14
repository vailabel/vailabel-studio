import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Undo2, Pencil, Check } from "lucide-react"
import { Combobox } from "@/components/ui/combobox"
import { Kbd } from "@/components/ui/kbd"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  SettingsSection,
} from "@/components/settings/settings-ui"
import {
  DEFAULT_KEYBOARD_SHORTCUTS,
  type KeyboardShortcut,
} from "@/viewmodels/settings-viewmodel"

interface KeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[]
  onChange: (shortcuts: KeyboardShortcut[]) => Promise<unknown> | unknown
}

export function KeyboardShortcuts({
  shortcuts,
  onChange,
}: KeyboardShortcutsProps) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editValue, setEditValue] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")

  const categories = [
    "All",
    ...Array.from(
      new Set(
        [...DEFAULT_KEYBOARD_SHORTCUTS, ...shortcuts].map(
          (item) => item.category
        )
      )
    ),
  ]

  const handleEdit = (idx: number) => {
    setEditingIdx(idx)
    setEditValue(shortcuts[idx].key)
  }

  const handleEditSave = (idx: number) => {
    const next = shortcuts.map((shortcut, index) =>
      index === idx ? { ...shortcut, key: editValue } : shortcut
    )
    void onChange(next)
    setEditingIdx(null)
    setEditValue("")
  }

  const handleRestoreDefaults = () => {
    void onChange([...DEFAULT_KEYBOARD_SHORTCUTS])
    setEditingIdx(null)
    setEditValue("")
  }

  const filteredShortcuts =
    selectedCategory === "All"
      ? shortcuts
      : shortcuts.filter((item) => item.category === selectedCategory)

  return (
    <SettingsSection
      title="Keyboard Shortcuts"
      description="Customize shortcuts for a faster workflow"
      action={
        <Button size="sm" variant="outline" onClick={handleRestoreDefaults} className="gap-2">
          <Undo2 className="h-4 w-4" />
          Restore Defaults
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Category</span>
          <Combobox
            options={categories.map((category) => ({
              label: category,
              value: category,
            }))}
            value={selectedCategory}
            onChange={setSelectedCategory}
            placeholder="Filter by category"
            className="w-48"
          />
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Category</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Shortcut</TableHead>
                <TableHead className="w-20 text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShortcuts.map((shortcut) => {
                const realIndex = shortcuts.indexOf(shortcut)
                const isEditing = editingIdx === realIndex
                return (
                  <TableRow key={shortcut.action}>
                    <TableCell className="text-muted-foreground">
                      {shortcut.category}
                    </TableCell>
                    <TableCell className="font-medium">
                      {shortcut.action}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editValue}
                          onChange={(event) => setEditValue(event.target.value)}
                          onBlur={() => handleEditSave(realIndex)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") handleEditSave(realIndex)
                            if (event.key === "Escape") setEditingIdx(null)
                          }}
                          autoFocus
                          className="h-8 w-32"
                        />
                      ) : (
                        <Kbd>{shortcut.key}</Kbd>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() =>
                          isEditing
                            ? handleEditSave(realIndex)
                            : handleEdit(realIndex)
                        }
                        aria-label={`Edit shortcut for ${shortcut.action}`}
                      >
                        {isEditing ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Pencil className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground">
          Click the pencil to edit a shortcut, then press Enter to save or Escape
          to cancel.
        </p>
      </div>
    </SettingsSection>
  )
}
