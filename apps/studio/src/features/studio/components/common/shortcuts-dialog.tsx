import { memo, type ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog"
import type { CanvasTool } from "@/features/studio/model/types"
import { TOOL_CATALOG } from "@/features/studio/components/tool-catalog"

interface ShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Tools available in this project (others are hidden). Omit to show all. */
  allowedTools?: CanvasTool[]
}

const GENERAL: Array<{ title: string; rows: Array<[ReactNode, string]> }> = [
  {
    title: "Classes",
    rows: [
      [<Keys k={["1", "…", "9"]} />, "Draw new shapes with the Nth class"],
      [
        <Keys k={["Shift", "1–9"]} />,
        "Change the selected shape to the Nth class",
      ],
      [<Keys k={["Esc"]} />, "Stop using the class (ask after each shape)"],
    ],
  },
  {
    title: "Editing",
    rows: [
      [<Keys k={["Ctrl", "Z"]} />, "Undo"],
      [<Keys k={["Ctrl", "Shift", "Z"]} />, "Redo"],
      [<Keys k={["Delete"]} />, "Delete the selected shape"],
      [
        <Keys k={["←", "↑", "→", "↓"]} />,
        "Nudge the selected shape (Shift = 10px)",
      ],
      [<Keys k={["Enter"]} />, "Finish a polygon / line strip"],
    ],
  },
  {
    title: "View & navigation",
    rows: [
      [<Keys k={["←", "→"]} />, "Previous / next item (nothing selected)"],
      [<Keys k={["Space"]} />, "Hold and drag to pan"],
      [<Keys k={["+", "−"]} />, "Zoom in / out (or Ctrl + scroll)"],
      [<Keys k={["H"]} />, "Toggle crosshair"],
      [<Keys k={["X"]} />, "Toggle coordinates"],
      [<Keys k={["R"]} />, "Toggle ruler"],
      [<Keys k={["?"]} />, "Show this sheet"],
    ],
  },
]

/** Cheat sheet of every labeling shortcut, opened with `?` or the toolbar. */
export const ShortcutsDialog = memo(
  ({ open, onOpenChange, allowedTools }: ShortcutsDialogProps) => {
    const tools = allowedTools
      ? TOOL_CATALOG.filter((tool) => allowedTools.includes(tool.id))
      : TOOL_CATALOG

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>
              Label faster without leaving the keyboard. Press{" "}
              <Keys k={["?"]} /> any time to open this again.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 sm:grid-cols-2">
            {tools.length > 0 ? (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tools
                </h3>
                <ul className="space-y-1.5">
                  {tools.map((tool) => (
                    <li
                      key={tool.id}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Keys k={[tool.shortcut]} />
                      <tool.icon className="mt-0.5 size-4 flex-shrink-0 text-muted-foreground" />
                      <span>
                        <span className="font-medium">{tool.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {tool.description}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className="space-y-5">
              {GENERAL.map((section) => (
                <section key={section.title}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </h3>
                  <ul className="space-y-1.5">
                    {section.rows.map(([keys, text], index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span>{text}</span>
                        <span className="flex-shrink-0">{keys}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }
)

ShortcutsDialog.displayName = "ShortcutsDialog"

function Keys({ k }: { k: string[] }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {k.map((key, index) =>
        key === "…" ? (
          <span key={index} className="px-0.5 text-xs text-muted-foreground">
            …
          </span>
        ) : (
          <kbd
            key={index}
            className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 text-[11px] font-semibold text-muted-foreground"
          >
            {key}
          </kbd>
        )
      )}
    </span>
  )
}
