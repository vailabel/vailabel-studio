import { memo, useEffect, useMemo, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import type { PDFDocumentProxy } from "pdfjs-dist"
import type { Annotation, Item } from "@/shared/types/core"
import type { ControlTag, ObjectTag } from "@/shared/lib/label-config/types"
import { resultsForControl, type StoredResult } from "@/shared/lib/label-config/result"
import { toErrorMessage } from "@/shared/lib/errors"
import { useMediaUrl } from "./media-source"
import { RegionSurface } from "./region-surface"
import { RegionToolbar } from "./region-toolbar"
import { needsRegionToolbar, useRegionTools, type RegionTools } from "./region-tools"
import type { RasterSize } from "./use-brush-draw"

/** Pages are rasterized at this width (px) — sharp at typical zoom levels. */
const RENDER_WIDTH = 1400

/** pdf.js, loaded on first use with its worker bundled by Vite. */
async function loadPdfJs() {
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  return pdfjs
}

interface ObjectPdfPagesProps {
  object: ObjectTag
  doc: Item
  /** Region controls bound to the PDF. */
  controls: ControlTag[]
  annotations: Annotation[]
  onCreateRegion: (control: ControlTag, value: Record<string, unknown>, color: string) => void
  onDeleteRegion: (annotationId: string) => void
}

// PDF region labeling: every page is rasterized (lazily, as it scrolls into
// view) and becomes a region surface, so all image tools work on documents.
// Each region's value carries `page` — the 0-based page index.
export const ObjectPdfPages = memo(
  ({ object, doc, controls, annotations, onCreateRegion, onDeleteRegion }: ObjectPdfPagesProps) => {
    const url = useMediaUrl(doc, object.valueKey)
    const tools = useRegionTools(controls)
    const [pdf, setPdf] = useState<{ url: string; doc: PDFDocumentProxy } | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
      if (!url) return
      let cancelled = false
      let task: ReturnType<Awaited<ReturnType<typeof loadPdfJs>>["getDocument"]> | undefined
      void (async () => {
        try {
          const pdfjs = await loadPdfJs()
          const data = await fetch(url).then((response) => response.arrayBuffer())
          if (cancelled) return
          task = pdfjs.getDocument({ data })
          const loaded = await task.promise
          if (!cancelled) setPdf({ url, doc: loaded })
        } catch (nextError) {
          if (!cancelled) setError(toErrorMessage(nextError))
        }
      })()
      return () => {
        cancelled = true
        void task?.destroy()
      }
    }, [url])

    // Results grouped per page, then per control.
    const byPage = useMemo(() => {
      const pages = new Map<number, Record<string, StoredResult[]>>()
      for (const control of controls) {
        for (const result of resultsForControl(annotations, control.name)) {
          const page = Number(result.value.page) || 0
          const entry = pages.get(page) ?? {}
          ;(entry[control.name] ??= []).push(result)
          pages.set(page, entry)
        }
      }
      return pages
    }, [controls, annotations])

    if (error) return <p className="px-6 py-5 text-sm text-destructive">{error}</p>
    if (!pdf || pdf.url !== url) {
      return (
        <div className="flex items-center gap-2 px-6 py-5 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading PDF…
        </div>
      )
    }

    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {needsRegionToolbar(tools) && <RegionToolbar tools={tools} />}
        <div className="min-h-0 flex-1 overflow-auto bg-muted p-4">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
            {Array.from({ length: pdf.doc.numPages }, (_, index) => (
              <PdfPage
                key={index}
                pdf={pdf.doc}
                index={index}
                tools={tools}
                resultsByControl={byPage.get(index) ?? EMPTY}
                onCreateRegion={onCreateRegion}
                onDeleteRegion={onDeleteRegion}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }
)

ObjectPdfPages.displayName = "ObjectPdfPages"

const EMPTY: Record<string, StoredResult[]> = {}

interface PdfPageProps {
  pdf: PDFDocumentProxy
  index: number
  tools: RegionTools
  resultsByControl: Record<string, StoredResult[]>
  onCreateRegion: ObjectPdfPagesProps["onCreateRegion"]
  onDeleteRegion: ObjectPdfPagesProps["onDeleteRegion"]
}

const PdfPage = memo(
  ({ pdf, index, tools, resultsByControl, onCreateRegion, onDeleteRegion }: PdfPageProps) => {
    const holderRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [aspect, setAspect] = useState(1.294)
    const [visible, setVisible] = useState(false)
    const [size, setSize] = useState<RasterSize | null>(null)
    const extra = useMemo(() => ({ page: index }), [index])

    // Reserve the page's height before it renders, so scrolling stays stable.
    useEffect(() => {
      let cancelled = false
      void pdf.getPage(index + 1).then((page) => {
        const viewport = page.getViewport({ scale: 1 })
        if (!cancelled) setAspect(viewport.height / viewport.width)
      })
      return () => {
        cancelled = true
      }
    }, [pdf, index])

    useEffect(() => {
      const holder = holderRef.current
      if (!holder) return
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
          }
        },
        { rootMargin: "600px" }
      )
      observer.observe(holder)
      return () => observer.disconnect()
    }, [])

    useEffect(() => {
      if (!visible) return
      let cancelled = false
      void (async () => {
        const page = await pdf.getPage(index + 1)
        const base = page.getViewport({ scale: 1 })
        const viewport = page.getViewport({ scale: RENDER_WIDTH / base.width })
        const canvas = canvasRef.current
        if (cancelled || !canvas) return
        canvas.width = Math.round(viewport.width)
        canvas.height = Math.round(viewport.height)
        await page.render({ canvas, viewport }).promise
        if (!cancelled) setSize({ width: canvas.width, height: canvas.height })
      })()
      return () => {
        cancelled = true
      }
    }, [visible, pdf, index])

    return (
      <div ref={holderRef}>
        <p className="mb-1 text-xs text-muted-foreground">Page {index + 1}</p>
        <RegionSurface
          tools={tools}
          resultsByControl={resultsByControl}
          size={size}
          extra={extra}
          onCreateRegion={onCreateRegion}
          onDeleteRegion={onDeleteRegion}
        >
          <canvas
            ref={canvasRef}
            className="block w-full rounded bg-white shadow-sm"
            style={size ? undefined : { aspectRatio: `1 / ${aspect}` }}
          />
        </RegionSurface>
      </div>
    )
  }
)

PdfPage.displayName = "PdfPage"
