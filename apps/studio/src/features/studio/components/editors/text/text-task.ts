import type { Task } from "@/shared/types/modality"

/** Which interaction layer a text task uses. Pure derivation from the task. */
export interface TextTaskFlags {
  isRelation: boolean
  isQA: boolean
  /** Character-span selection (ner / question_answering / relation_extraction). */
  isSpanTask: boolean
  /** Whole-document classes (text_classification / taxonomy). */
  isClassTask: boolean
  /** taxonomy allows multiple document tags. */
  isMultiClass: boolean
  isTranslation: boolean
}

export function textTaskFlags(task: Task | undefined): TextTaskFlags {
  const isRelation = task === "relation_extraction"
  const isQA = task === "question_answering"
  return {
    isRelation,
    isQA,
    isSpanTask: task === "ner" || isQA || isRelation,
    isClassTask: task === "text_classification" || task === "taxonomy",
    isMultiClass: task === "taxonomy",
    isTranslation: task === "translation",
  }
}
