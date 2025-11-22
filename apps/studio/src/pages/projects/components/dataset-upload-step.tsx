import { ArrowLeft, Loader2, CheckCircle, Info, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { ImageUploadArea, ImageGrid } from "@/components/ui/image-upload"

interface ImageFile {
  id: string
  name: string
  data: string
  width: number
  height: number
  file?: File
  size?: number
}

interface DatasetUploadStepProps {
  onBack: () => void
  onCreate: () => void
  isUploading: boolean
  isCreating: boolean
  uploadProgress: number
  images: ImageFile[]
  onFiles: (files: File[]) => void
  onRemoveImage: (index: number) => void
}

export function DatasetUploadStep({
  onBack,
  onCreate,
  isUploading,
  isCreating,
  uploadProgress,
  images,
  onFiles,
  onRemoveImage,
}: DatasetUploadStepProps) {
  const hasImages = images.length > 0

  return (
    <>
      <CardHeader>
        <CardTitle>Import Dataset</CardTitle>
        <CardDescription>
          Upload images for annotation. You can also add images later from the
          project dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Supported formats: PNG, JPG, GIF • Max size: 10MB per image
          </AlertDescription>
        </Alert>

        <ImageUploadArea
          onFiles={onFiles}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />

        {isUploading && uploadProgress > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Upload Progress</span>
              <span className="font-medium">{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        {hasImages && (
          <>
            <Separator />
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Selected Images</span>
                </div>
                <Badge variant="secondary">
                  {images.length} file{images.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              <ImageGrid images={images} onRemove={onRemoveImage} />
            </div>
          </>
        )}

        {!hasImages && !isUploading && (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No images selected yet</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isCreating}>
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back
        </Button>

        <Button
          onClick={onCreate}
          disabled={isUploading || isCreating || !hasImages}
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Creating Project...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-5 w-5" />
              Create Project
            </>
          )}
        </Button>
      </CardFooter>
    </>
  )
}
