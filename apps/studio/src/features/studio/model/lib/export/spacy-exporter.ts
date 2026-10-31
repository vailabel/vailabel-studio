import { flatSpans, type NerDoc } from "./conll-exporter"

export interface SpacyDoc {
  text: string
  /** `[start, end, label]` character offsets (spaCy's training-data tuples). */
  entities: Array<[number, number, string]>
}

/**
 * spaCy JSON training data: `[{text, entities: [[start, end, label]]}]`.
 * Overlapping spans are flattened because `Doc.ents` rejects overlaps.
 */
export function toSpacy(docs: NerDoc[]): SpacyDoc[] {
  return docs.map((doc) => ({
    text: doc.text,
    entities: flatSpans(doc.spans).map(
      (span): [number, number, string] => [span.start, span.end, span.label]
    ),
  }))
}
