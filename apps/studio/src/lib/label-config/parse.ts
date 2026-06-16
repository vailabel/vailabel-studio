import {
  CONTROL_TAGS,
  OBJECT_TAGS,
  type ConfigChoice,
  type ControlTag,
  type LabelConfig,
  type ObjectTag,
} from "./types"

// Parse a labeling configuration from either Label Studio-style XML or our
// native JSON form. Returns a normalized { objects, controls } schema. Throws on
// malformed XML/JSON so the create flow can surface the error.
export function parseLabelConfig(input: string): LabelConfig {
  const trimmed = (input ?? "").trim()
  if (!trimmed) return { objects: [], controls: [] }
  return trimmed.startsWith("{") || trimmed.startsWith("[")
    ? parseJsonConfig(trimmed)
    : parseXmlConfig(trimmed)
}

function lowerAttrs(element: Element): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (let i = 0; i < element.attributes.length; i++) {
    const attribute = element.attributes[i]
    attrs[attribute.name.toLowerCase()] = attribute.value
  }
  return attrs
}

function choicesOf(element: Element): ConfigChoice[] {
  const choices: ConfigChoice[] = []
  for (let i = 0; i < element.children.length; i++) {
    const child = element.children[i]
    const tag = child.tagName.toLowerCase()
    if (tag !== "label" && tag !== "choice") continue
    const value = child.getAttribute("value")
    if (!value) continue
    choices.push({
      value,
      background: child.getAttribute("background") ?? undefined,
      alias: child.getAttribute("alias") ?? undefined,
      hotkey: child.getAttribute("hotkey") ?? undefined,
    })
  }
  return choices
}

function parseXmlConfig(xml: string): LabelConfig {
  const doc = new DOMParser().parseFromString(xml, "text/xml")
  const error = doc.querySelector("parsererror")
  if (error) {
    throw new Error(
      error.textContent?.replace(/\s+/g, " ").trim() || "Invalid XML config"
    )
  }

  const objects: ObjectTag[] = []
  const controls: ControlTag[] = []
  const all = doc.getElementsByTagName("*")
  for (let i = 0; i < all.length; i++) {
    const element = all[i]
    const tag = element.tagName.toLowerCase()
    const attrs = lowerAttrs(element)

    if (OBJECT_TAGS.has(tag)) {
      const value = attrs.value ?? ""
      objects.push({
        tag,
        name: attrs.name ?? "",
        value,
        valueKey: value.replace(/^\$/, ""),
        attrs,
      })
    } else if (CONTROL_TAGS.has(tag)) {
      const toName = attrs.toname ?? ""
      const toNames = toName
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
      controls.push({
        tag,
        name: attrs.name ?? "",
        toName: toNames[0] ?? "",
        toNames,
        choices: choicesOf(element),
        attrs,
      })
    }
  }
  return { objects, controls }
}

interface JsonObject {
  tag: string
  name?: string
  value?: string
  attrs?: Record<string, string>
}
interface JsonControl {
  tag: string
  name?: string
  toName?: string
  toNames?: string[]
  labels?: string[]
  choices?: Array<string | ConfigChoice>
  attrs?: Record<string, string>
}

/** Lowercase attribute keys so the renderer reads them consistently with XML. */
function lowerKeys(attrs?: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(attrs ?? {})) {
    out[key.toLowerCase()] = value
  }
  return out
}

function parseJsonConfig(text: string): LabelConfig {
  const raw = JSON.parse(text) as {
    objects?: JsonObject[]
    controls?: JsonControl[]
  }
  const objects: ObjectTag[] = (raw.objects ?? []).map((object) => {
    const value = object.value ?? ""
    return {
      tag: String(object.tag).toLowerCase(),
      name: object.name ?? "",
      value,
      valueKey: value.replace(/^\$/, ""),
      attrs: lowerKeys(object.attrs),
    }
  })
  const controls: ControlTag[] = (raw.controls ?? []).map((control) => {
    const toNames =
      control.toNames ??
      (control.toName ? [control.toName] : []).filter(Boolean)
    const choices: ConfigChoice[] = (
      control.choices ?? control.labels ?? []
    ).map((choice) =>
      typeof choice === "string" ? { value: choice } : choice
    )
    return {
      tag: String(control.tag).toLowerCase(),
      name: control.name ?? "",
      toName: toNames[0] ?? "",
      toNames,
      choices,
      attrs: lowerKeys(control.attrs),
    }
  })
  return { objects, controls }
}
