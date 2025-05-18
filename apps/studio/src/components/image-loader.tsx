import { useStorage } from "@/hooks/use-stoage"
import { useEffect, useState, useRef } from "react"

// Strategy interface for image loading
export interface ImageLoadStrategy {
  load(imageId: string): Promise<string>
}

// Default strategy implementation
export class DefaultImageLoadStrategy implements ImageLoadStrategy {
  private loadImage: (id: string) => Promise<string | Buffer | Uint8Array>
  constructor(
    loadImage: (id: string) => Promise<string | Buffer | Uint8Array>
  ) {
    this.loadImage = loadImage
  }
  async load(imageId: string): Promise<string> {
    const data = await this.loadImage(imageId)
    if (typeof data === "string") {
      return data
    } else if (typeof Buffer !== "undefined" && Buffer.isBuffer(data)) {
      const uint8 = Uint8Array.from(data)
      const ab = new ArrayBuffer(uint8.byteLength)
      new Uint8Array(ab).set(uint8)
      const blob = new Blob([ab], { type: "image/png" })
      return URL.createObjectURL(blob)
    } else if (data instanceof Uint8Array) {
      const ab = new ArrayBuffer(data.byteLength)
      new Uint8Array(ab).set(data)
      const blob = new Blob([ab], { type: "image/png" })
      return URL.createObjectURL(blob)
    }
    throw new Error("Unsupported image data type")
  }
}

interface ImageWithLoaderProps {
  imageId: string
  alt: string
  strategy?: ImageLoadStrategy
}

const ImageWithLoader = ({ imageId, alt, strategy }: ImageWithLoaderProps) => {
  const { loadImage } = useStorage()
  const [src, setSrc] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError(null)
    const loader = strategy || new DefaultImageLoadStrategy(loadImage)
    loader
      .load(imageId)
      .then((imgSrc) => {
        if (isMounted) {
          setSrc(imgSrc)
          if (imgSrc.startsWith("blob:")) blobUrlRef.current = imgSrc
          setLoading(false)
        }
      })
      .catch(() => {
        if (isMounted) {
          setError("Failed to load image")
          setLoading(false)
        }
      })
    return () => {
      isMounted = false
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [imageId, strategy, loadImage])

  if (loading) return <div className="w-full h-48 bg-gray-200 animate-pulse" />
  if (error)
    return (
      <div className="w-full h-48 bg-red-200 flex items-center justify-center">
        {error}
      </div>
    )
  return <img src={src} alt={alt} className="w-full h-48 object-cover" />
}

export default ImageWithLoader
