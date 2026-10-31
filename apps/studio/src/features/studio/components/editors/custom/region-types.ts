// Shared geometry types for the image region editor (drawing hook + overlay).

/** A point in percentage coordinates of the image box: [x%, y%]. */
export type Pt = [number, number]

/** A persisted region rendered on the image, normalized from a stored result. */
export type Region =
  | {
      id: string
      tag: "rectanglelabels"
      x: number
      y: number
      width: number
      height: number
      label: string
      color: string
    }
  | { id: string; tag: "polygonlabels"; points: Pt[]; label: string; color: string }
  | { id: string; tag: "keypointlabels"; x: number; y: number; label: string; color: string }
  | {
      id: string
      tag: "ellipselabels"
      /** Center and radii, in % of the image box. */
      x: number
      y: number
      radiusX: number
      radiusY: number
      label: string
      color: string
    }
  | {
      id: string
      tag: "brushlabels"
      /** Coverage mask (one byte per pixel) at the raster size it was drawn. */
      mask: Uint8Array
      width: number
      height: number
      /** Top-left of the mask's bounding box, in % — where the chip sits. */
      anchor: Pt
      label: string
      color: string
    }
