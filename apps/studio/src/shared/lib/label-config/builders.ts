import type { ConfigChoice, ControlTag, ObjectTag } from "./types"

// Small, pure constructors for labeling-config nodes. Shared by the per-template
// starter configs (generate.ts, genai-configs.ts) so the config shape lives in
// one place rather than being hand-written object-by-object.

/** A data object bound to "$<tag>" (e.g. an image / text / audio viewer). */
export function obj(tag: string): ObjectTag {
  return { tag, name: tag, value: `$${tag}`, valueKey: tag, attrs: {} }
}

/** A control tag bound to a single object by name. */
export function ctrl(
  tag: string,
  name: string,
  toName: string,
  choices: ConfigChoice[] = [],
  attrs: Record<string, string> = {}
): ControlTag {
  return { tag, name, toName, toNames: [toName], choices, attrs }
}

/** A choice/label option, optionally colored. */
export function ch(value: string, background?: string): ConfigChoice {
  return background ? { value, background } : { value }
}

/** A text object bound to a row field ($name); `title` is its panel header. */
export function textObj(name: string, title: string): ObjectTag {
  return { tag: "text", name, value: `$${name}`, valueKey: name, attrs: { title } }
}

/** A pairwise A/B preference control comparing two objects (left vs. right). */
export function pairwise(
  name: string,
  left: string,
  right: string,
  title: string
): ControlTag {
  return {
    tag: "pairwise",
    name,
    toName: left,
    toNames: [left, right],
    choices: [],
    attrs: title ? { title } : {},
  }
}
