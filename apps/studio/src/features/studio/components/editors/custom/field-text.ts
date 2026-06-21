import type { Item } from "@/shared/types/core"

/**
 * Inline text for a config object's field when the item carries its data on the
 * row itself — tabular / LLM-eval imports store each field in `item.data`. Coerced
 * to a string so a missing column reads as empty rather than spinning on a
 * non-existent file. Returns undefined for file-backed items, signalling the
 * caller to read the document from disk instead.
 */
export function inlineFieldText(doc: Item, valueKey?: string): string | undefined {
  return doc.data && valueKey ? String(doc.data[valueKey] ?? "") : undefined
}
