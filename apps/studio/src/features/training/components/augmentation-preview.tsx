import { useState } from "react"
import { ImageOff, Shuffle } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import { cn } from "@/shared/lib/utils"
import {
  augSeedStyle,
  enabledAugList,
  makeAugSeed,
  type AugSeed,
  type Augmentation,
} from "@/shared/components/training/training-config"

/** One augmented image tile: the sample with a seed's transform + filter. */
function AugTile({
  url,
  seed,
  aug,
  className,
}: {
  url: string
  seed: AugSeed
  aug: Augmentation
  className?: string
}) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <img
        src={url}
        alt=""
        draggable={false}
        className="pointer-events-none h-full w-full object-cover select-none"
        style={augSeedStyle(seed, aug)}
      />
    </div>
  )
}

/**
 * Roboflow-style live augmentation preview: shows the sample image before and
 * after the current augmentation, plus a few shuffleable variations so the user
 * sees the variety the model will train on. The transforms are a CSS
 * approximation for preview only — ultralytics does the real augmentation at
 * train time.
 */
export function AugmentationPreview({
  sampleUrl,
  aug,
}: {
  sampleUrl: string | null
  aug: Augmentation
}) {
  // Four stable variants; magnitudes derive from `aug` at render time so sliders
  // update smoothly. Shuffle re-rolls the random factors.
  const [seeds, setSeeds] = useState<AugSeed[]>(() =>
    Array.from({ length: 4 }, makeAugSeed)
  )
  const shuffle = () => setSeeds(Array.from({ length: 4 }, makeAugSeed))

  const enabled = enabledAugList(aug)

  if (!sampleUrl) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center">
        <ImageOff className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium">No preview</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Augmentation preview is available for image datasets once the project
          has at least one image.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <figure className="space-y-1.5">
          <figcaption className="text-xs font-medium text-muted-foreground">
            Original
          </figcaption>
          <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
            <img
              src={sampleUrl}
              alt="Original sample"
              draggable={false}
              className="pointer-events-none h-full w-full object-cover select-none"
            />
          </div>
        </figure>

        <figure className="space-y-1.5">
          <figcaption className="text-xs font-medium text-muted-foreground">
            Augmented
          </figcaption>
          <div className="relative aspect-video overflow-hidden rounded-md">
            {aug.mosaic > 0 ? (
              <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5">
                {seeds.map((s, i) => (
                  <AugTile key={i} url={sampleUrl} seed={s} aug={aug} />
                ))}
              </div>
            ) : (
              <AugTile
                url={sampleUrl}
                seed={seeds[0]}
                aug={aug}
                className="h-full w-full"
              />
            )}
            {aug.mixup > 0 && (
              <img
                src={sampleUrl}
                alt=""
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full object-cover select-none"
                style={{
                  ...augSeedStyle(seeds[1], aug),
                  opacity: Math.min(0.6, aug.mixup),
                }}
              />
            )}
          </div>
        </figure>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Variations</p>
        <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={shuffle}>
          <Shuffle className="size-3.5" />
          Shuffle
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {seeds.slice(1).map((s, i) => (
          <AugTile
            key={i}
            url={sampleUrl}
            seed={s}
            aug={aug}
            className="aspect-video rounded-md"
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {enabled.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            No augmentation — the model trains on the raw images.
          </span>
        ) : (
          enabled.map((label) => (
            <Badge key={label} variant="secondary" className="font-normal">
              {label}
            </Badge>
          ))
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Augmentations are applied randomly each epoch during training — no extra
        images are stored on disk.
      </p>
    </div>
  )
}
