import { useCallback } from "react"
import type { Item } from "@/shared/types/core"
import { objectByName, type ControlTag, type LabelConfig } from "@/shared/lib/label-config/types"
import type { RankItems } from "@/shared/components/label-config/standalone-controls"
import { parseListEntries } from "@/features/studio/model/lib/structured-fields"
import { useDocumentText } from "../text/use-document-text"
import { inlineFieldText } from "./field-text"

/**
 * Entries for Rankers that order a List object. A list reads from its inline
 * row field, or — for file-backed items — from the item's own file.
 */
export function useRankLists(config: LabelConfig | null | undefined, doc: Item | null | undefined) {
  const listOf = useCallback(
    (control: ControlTag) => {
      const target = config ? objectByName(config, control.toName) : undefined
      return target?.tag === "list" ? target : undefined
    },
    [config]
  )
  const needsFile =
    !!doc &&
    !!config?.controls.some((control) => {
      const list = control.tag === "ranker" ? listOf(control) : undefined
      return list && inlineFieldText(doc, list.valueKey) === undefined
    })
  const { text: fileText } = useDocumentText(needsFile ? doc?.path : undefined, doc?.id)

  return useCallback(
    (control: ControlTag): RankItems | undefined => {
      const list = listOf(control)
      if (!list || !doc) return undefined
      const raw = inlineFieldText(doc, list.valueKey) ?? fileText
      const items = raw
        ? parseListEntries(raw).map((entry) => ({
            id: entry.id,
            label: entry.title,
            detail: entry.body || undefined,
          }))
        : []
      return { bucket: list.name, items }
    },
    [listOf, doc, fileText]
  )
}
