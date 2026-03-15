import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Undo2, Pencil } from "lucide-react"
import { Combobox } from "@/components/ui/combobox"
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
      new Set([...DEFAULT_KEYBOARD_SHORTCUTS, ...shortcuts].map((item) => item.category))
    ),
  ]

  const handleEdit = (idx: number) => {
    setEditingIdx(idx)
    setEditValue(shortcuts[idx].key)
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value)
  }

  const handleEditSave = (idx: number) => {
    const nextShortcuts = shortcuts.map((shortcut, index) =>
      index === idx ? { ...shortcut, key: editValue } : shortcut
    )
    void onChange(nextShortcuts)
    setEditingIdx(null)
    setEditValue("")
  }

  const handleRestoreDefaults = () => {
    void onChange([...DEFAULT_KEYBOARD_SHORTCUTS])
    setEditingIdx(null)
    setEditValue("")
  }

  const filteredShortcuts: KeyboardShortcut[] =
    selectedCategory === "All"
      ? shortcuts
      : shortcuts.filter(
          (s: KeyboardShortcut) => s.category === selectedCategory
        )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Custom Keyboard Shortcuts</h3>
        <Button size="sm" variant="outline" onClick={handleRestoreDefaults}>
          <Undo2 className="w-4 h-4 mr-1" /> Restore Default
        </Button>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <label htmlFor="shortcut-category" className="text-sm font-medium">
          Category:
        </label>
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
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border rounded">
          <thead>
            <tr className="bg-muted">
              <th className="p-2 text-left font-semibold">Category</th>
              <th className="p-2 text-left font-semibold">Action</th>
              <th className="p-2 text-left font-semibold">Shortcut</th>
              <th className="p-2 text-left font-semibold">Edit</th>
            </tr>
          </thead>
          <tbody>
            {filteredShortcuts.map((s: KeyboardShortcut) => (
              <tr key={s.action} className="border-b last:border-b-0">
                <td className="p-2">{s.category}</td>
                <td className="p-2">{s.action}</td>
                <td className="p-2">
                  {editingIdx === shortcuts.indexOf(s) ? (
                    <Input
                      value={editValue}
                      onChange={handleEditChange}
                      onBlur={() => handleEditSave(shortcuts.indexOf(s))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          handleEditSave(shortcuts.indexOf(s))
                        if (e.key === "Escape") setEditingIdx(null)
                      }}
                      autoFocus
                      className="w-32"
                    />
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded bg-muted border text-xs">
                      {s.key}
                    </span>
                  )}
                </td>
                <td className="p-2">
                  {editingIdx === shortcuts.indexOf(s) ? null : (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(shortcuts.indexOf(s))}
                      aria-label={`Edit shortcut for ${s.action}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
