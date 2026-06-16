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
