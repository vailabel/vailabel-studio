import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Undo2, Pencil } from "lucide-react"
import { Combobox } from "@/components/ui/combobox"
import { useSetting, useUpdateSettings } from "@/hooks/useFastAPIQuery"

interface KeyboardShortcut {
  category: string
  action: string
  key: string
}

const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  { category: "File", action: "Open File", key: "Ctrl+O" },
  { category: "File", action: "Save File", key: "Ctrl+S" },
  { category: "Edit", action: "Undo", key: "Ctrl+Z" },
  { category: "Edit", action: "Redo", key: "Ctrl+Y" },
  { category: "Edit", action: "Delete Selection", key: "Del" },
  { category: "Annotation", action: "Add Bounding Box", key: "B" },
  { category: "Annotation", action: "Add Polygon", key: "P" },
  { category: "Annotation", action: "Add Point", key: "O" },
  { category: "Navigation", action: "Zoom In", key: "+" },
  { category: "Navigation", action: "Zoom Out", key: "-" },
  { category: "Navigation", action: "Pan", key: "Space" },
]

const CATEGORIES = [
  "All",
  ...Array.from(new Set(DEFAULT_SHORTCUTS.map((s) => s.category))),
]

export function KeyboardShortcuts() {
  const { data: shortcutsSetting } = useSetting("keyboardShortcuts")
  const updateSettingsMutation = useUpdateSettings()
  const [shortcuts, setShortcuts] =
    useState<KeyboardShortcut[]>(DEFAULT_SHORTCUTS)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editValue, setEditValue] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")

  // Load shortcuts from settings when data is available
  useEffect(() => {
    if (shortcutsSetting && typeof shortcutsSetting.value === "string") {
      try {
        const parsed = JSON.parse(shortcutsSetting.value)
        if (Array.isArray(parsed)) {
          setShortcuts(parsed as KeyboardShortcut[])
        }
      } catch {
        // ignore parse error, fallback to default
      }
    }
  }, [shortcutsSetting])

  // Save to settings whenever shortcuts change
  useEffect(() => {
    const saveShortcuts = async () => {
      try {
        await updateSettingsMutation.mutateAsync({
          key: "keyboardShortcuts",
          value: JSON.stringify(shortcuts),
        })
      } catch (error) {
        console.error("Failed to save keyboard shortcuts:", error)
      }
    }
    saveShortcuts()
  }, [shortcuts, updateSettingsMutation])

  const handleEdit = (idx: number) => {
    setEditingIdx(idx)
    setEditValue(shortcuts[idx].key)
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value)
  }

  const handleEditSave = (idx: number) => {
    setShortcuts((prev: KeyboardShortcut[]) =>
      prev.map((s: KeyboardShortcut, i: number) =>
        i === idx ? { ...s, key: editValue } : s
      )
    )
    setEditingIdx(null)
    setEditValue("")
  }

  const handleRestoreDefaults = () => {
    setShortcuts([...DEFAULT_SHORTCUTS])
    setEditingIdx(null)
    setEditValue("")
    // updateSetting will be called by useEffect
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
          options={CATEGORIES.map((cat) => ({ label: cat, value: cat }))}
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
