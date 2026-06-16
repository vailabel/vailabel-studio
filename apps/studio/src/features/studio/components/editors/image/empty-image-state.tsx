import { memo } from "react"

/** Placeholder shown in the canvas area when a project has no images. */
export const EmptyImageState = memo(() => (
  <div className="flex h-full items-center justify-center bg-muted">
    <p className="text-muted-foreground">No images in this project</p>
  </div>
))

EmptyImageState.displayName = "EmptyImageState"
