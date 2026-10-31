// Real, openly licensed media bundled under public/samples (credits in
// public/samples/CREDITS.md). Files come in pools; a template gets the pool
// whose `match` fits its words (id, label, description, label names), so an
// OCR template gets receipts and a diarization template gets two speakers,
// with no per-template table.

/** A bundled file, by its path under public/samples. */
export interface SampleAsset {
  path: string
  /** Pixel size, for images. */
  width?: number
  height?: number
  /** Clip metadata, for videos (what the video importer would probe). */
  video?: { fps: number; duration: number; width: number; height: number }
}

/** Interchangeable files, and the template words that call for them. */
export interface SamplePool {
  match?: RegExp
  assets: SampleAsset[]
}

const image = (name: string, width: number, height: number): SampleAsset => ({
  path: `images/${name}`,
  width,
  height,
})

const STREETS = [
  image("street-new-york.jpg", 960, 720),
  image("street-taipei.jpg", 960, 720),
  image("street-washington-1974.jpg", 960, 646),
]

export const IMAGE_POOLS: SamplePool[] = [
  {
    match: /mammo|bi-?rads/,
    assets: [
      image("mammogram-1.jpg", 960, 629),
      image("mammogram-2.jpg", 697, 960),
      image("mammogram-3.jpg", 613, 960),
      image("mammogram-4.jpg", 683, 960),
    ],
  },
  {
    match: /x-?ray|medical|radiolog|lesion|nodule|diagnos/,
    assets: [
      image("chest-xray-1.jpg", 839, 960),
      image("chest-xray-2.jpg", 960, 779),
      image("chest-xray-3.jpg", 960, 720),
    ],
  },
  {
    match: /invoice/,
    assets: [
      image("invoice-grammes-1904.jpg", 960, 542),
      image("invoice-costello-1903.jpg", 960, 779),
      image("receipt-switzerland.jpg", 720, 960),
    ],
  },
  {
    match: /ocr|receipt|transcri/,
    assets: [
      image("receipt-switzerland.jpg", 720, 960),
      image("receipt-hong-kong.jpg", 720, 960),
      image("advert-borden-1918.jpg", 960, 655),
    ],
  },
  {
    match: /multi-?page|letter|document/,
    assets: [
      image("letter-roosevelt-1899.jpg", 960, 719),
      image("letter-alvarez-1901.jpg", 960, 645),
      image("letter-boatmens-bank-1898.jpg", 748, 960),
    ],
  },
  {
    match: /keypoint|pose|landmark/,
    assets: [image("people-walking.jpg", 619, 939), ...STREETS.slice(0, 2)],
  },
  { assets: STREETS },
]

/** Photos in pairs of one subject, for tasks that compare images: a row
 *  shows a pair plus others, so "same subject" and "unrelated" both occur. */
export const IMAGE_GALLERY: SampleAsset[][] = [
  [image("dog-1.jpg", 960, 720), image("dog-2.jpg", 960, 720)],
  [image("cat-1.jpg", 719, 960), image("cat-2.jpg", 960, 640)],
  [image("bicycle-1.jpg", 960, 640), image("bicycle-2.jpg", 960, 720)],
]

const audio = (name: string): SampleAsset => ({ path: `audio/${name}.mp3` })

export const AUDIO_POOLS: SamplePool[] = [
  {
    match: /speaker|diariz/,
    assets: [
      audio("apollo-13-we-have-a-problem"),
      audio("apollo-11-one-small-step"),
    ],
  },
  {
    match: /sound event|event a/,
    assets: [audio("dog-barking-rome"), audio("rain-and-thunder")],
  },
  {
    match: /music/,
    assets: [audio("speech-music-rain"), audio("apollo-11-one-small-step")],
  },
  {
    assets: [
      audio("librivox-winnie-the-pooh"),
      audio("apollo-13-we-have-a-problem"),
    ],
  },
]

const video = (name: string, fps: number, duration: number): SampleAsset => ({
  path: `video/${name}.mp4`,
  video: { fps, duration, width: 640, height: 360 },
})

export const VIDEO_POOLS: SamplePool[] = [
  {
    match: /skate|flip|trick/,
    assets: [
      video("skateboard-kickflip", 24, 7),
      video("skateboard-shove-it", 30, 6.59),
    ],
  },
  {
    assets: [
      video("pedestrians-madrid", 24, 10),
      video("traffic-ljubljana", 25, 10),
    ],
  },
]

const series = (name: string): SampleAsset => ({
  path: `timeseries/${name}.csv`,
})

export const TIMESERIES_POOLS: SamplePool[] = [
  {
    match: /activity|run|walk/,
    assets: [series("activity-1"), series("activity-2")],
  },
  {
    match: /forecast|stock|trend/,
    assets: [series("wti-crude-oil-2024"), series("henry-hub-gas-2024")],
  },
  {
    match: /signal|quality/,
    assets: [series("ecg-noisy"), series("ecg-normal")],
  },
  {
    match: /abnormal|pattern|ecg/,
    assets: [series("ecg-normal"), series("ecg-pvc")],
  },
  {
    assets: [series("potomac-river-flow"), series("james-river-flow")],
  },
]

export const PDF_POOLS: SamplePool[] = [
  {
    assets: [
      { path: "pdf/invoices-1903-1904.pdf" },
      { path: "pdf/irs-form-w9.pdf" },
      { path: "pdf/new-york-times-1912-04-15.pdf" },
    ],
  },
]

export const POINT_CLOUD_POOLS: SamplePool[] = [
  {
    assets: [
      { path: "pointcloud/toronto-street-1.pcd" },
      { path: "pointcloud/toronto-street-2.pcd" },
    ],
  },
]

/** CT series: a folder of slice files each. */
export const DICOM_SERIES = [
  { folder: "dicom/lidc-1", name: "LIDC-IDRI-0001 chest CT", slices: 12 },
  { folder: "dicom/lidc-2", name: "LIDC-IDRI-0002 chest CT", slices: 12 },
]

/** The first pool whose words appear in `hint`, else the catch-all last one. */
export function pickPool(pools: SamplePool[], hint: string): SampleAsset[] {
  const fit = pools.find((pool) => pool.match?.test(hint))
  return (fit ?? pools[pools.length - 1]).assets
}

/** The file's own name, used for the copy in a project's sample folder. */
export const assetName = (asset: SampleAsset) =>
  asset.path.slice(asset.path.lastIndexOf("/") + 1)
