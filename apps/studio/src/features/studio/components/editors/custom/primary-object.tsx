import type { ObjectTag } from "@/shared/lib/label-config/types"
import { Notice } from "./config-notice"
import { OBJECT_VIEWERS, type ObjectViewerProps } from "./object-viewers"

interface PrimaryObjectProps extends Omit<ObjectViewerProps, "object"> {
  /** The interactive viewer object, or undefined when the config has no $data object. */
  primary: ObjectTag | undefined
}

/**
 * Renders the config's primary (interactive) object through the viewer
 * registry, keeping the editor body free of per-object-type branching.
 */
export const PrimaryObject = ({ primary, ...viewerProps }: PrimaryObjectProps) => {
  if (!primary) {
    return (
      <Notice icon="info" title="No data object">
        Add an object with a <code>$</code> value (e.g. an Image or Text) to
        display the item.
      </Notice>
    )
  }

  const Viewer = OBJECT_VIEWERS[primary.tag]
  if (!Viewer) {
    return (
      <Notice icon="info" title="Unsupported object">
        Object “{primary.tag}” isn’t supported yet.
      </Notice>
    )
  }
  return <Viewer object={primary} {...viewerProps} />
}
