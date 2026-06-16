import type { ObjectTag } from "@/shared/lib/label-config/types"

/**
 * Literal-value config objects (no `$field`) rendered as static instruction
 * blocks above the interactive viewer — lightweight multimodal context.
 */
export const StaticObjects = ({ objects }: { objects: ObjectTag[] }) => {
  if (objects.length === 0) return null
  return (
    <div className="shrink-0 space-y-2 border-b border-border bg-muted/30 px-6 py-3">
      {objects.map((object) =>
        object.tag === "hypertext" ? (
          <div
            key={object.name}
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: object.value }}
          />
        ) : (
          <p key={object.name} className="text-sm">
            {object.value}
          </p>
        )
      )}
    </div>
  )
}
