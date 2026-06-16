// CodeMirror "code view" for the native JSON labeling config — the Code tab of
// labeling-interface-editor.tsx. Adds JSON syntax highlighting plus
// schema-driven autocomplete, inline lint (gutter underlines), and hover docs
// wired to LABEL_CONFIG_SCHEMA. Drop-in for the old <Textarea>: `value` is a
// string and `onChange` emits a string (CodeMirror hands back the doc string
// directly — no event.target unwrapping).
import { useMemo, useSyncExternalStore } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { oneDark } from "@codemirror/theme-one-dark"
import { jsonSchema } from "codemirror-json-schema"
import { LABEL_CONFIG_SCHEMA } from "@/shared/lib/label-config/config-schema"

// The app's ThemeProvider only exposes "dark" | "light" | "system" and never a
// resolved value, so we read the resolved theme straight from the `.dark` class
// the provider writes onto <html>, via useSyncExternalStore + a MutationObserver.
function subscribeToHtmlClass(callback: () => void): () => void {
  const observer = new MutationObserver(callback)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  })
  return () => observer.disconnect()
}

function readHtmlIsDark(): boolean {
  return document.documentElement.classList.contains("dark")
}

function useResolvedDark(): boolean {
  return useSyncExternalStore(subscribeToHtmlClass, readHtmlIsDark, () => false)
}

export interface JsonConfigEditorProps {
  value: string
  onChange: (next: string) => void
}

export function JsonConfigEditor({ value, onChange }: JsonConfigEditorProps) {
  const isDark = useResolvedDark()

  // Build the extension array once — the schema is static, and recreating
  // extension objects per render can trip CodeMirror's instanceof checks.
  // jsonSchema() already bundles json() highlighting, the JSON parse linter, the
  // schema linter, and schema-aware completion + hover — so it's the whole setup.
  const extensions = useMemo(
    () => [
      jsonSchema(
        LABEL_CONFIG_SCHEMA as unknown as Parameters<typeof jsonSchema>[0]
      ),
    ],
    []
  )

  return (
    <div className="overflow-hidden rounded-md border border-border text-xs">
      <CodeMirror
        value={value}
        onChange={onChange}
        theme={isDark ? oneDark : "light"}
        height="18rem"
        extensions={extensions}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          bracketMatching: true,
          closeBrackets: true,
          highlightActiveLine: true,
          indentOnInput: true,
          autocompletion: true,
          lintKeymap: true,
        }}
      />
    </div>
  )
}

export default JsonConfigEditor
