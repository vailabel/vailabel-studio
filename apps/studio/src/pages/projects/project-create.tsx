import { memo } from "react"
import { ArrowLeft, FolderOpen, Loader2, Info, ImageIcon } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ImageGrid } from "@/components/ui/image-upload"
import { ProjectCreateHeader } from "./components/project-create-header"
import { useProjectCreateViewModel } from "@/viewmodels/project-create-viewmodel"

export const ProjectCreate = memo(() => {
  const viewModel = useProjectCreateViewModel()
  const hasImages = viewModel.images.length > 0

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <ProjectCreateHeader />

        <div className="mx-auto max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>New Project</CardTitle>
              <CardDescription>
                Open a folder of images and start annotating. Images are
                referenced in place — nothing is copied or duplicated.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project name</Label>
                <Input
                  id="project-name"
                  value={viewModel.name}
                  onChange={(event) => viewModel.setName(event.target.value)}
                  placeholder="My dataset"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-description">
                  Description{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="project-description"
                  value={viewModel.description}
                  onChange={(event) =>
                    viewModel.setDescription(event.target.value)
                  }
                  placeholder="What is this dataset about?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Images</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={viewModel.openImageFolder}
                  disabled={viewModel.isScanning}
                >
                  {viewModel.isScanning ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <FolderOpen className="mr-2 h-5 w-5" />
                  )}
                  {viewModel.isScanning
                    ? "Scanning folder..."
                    : hasImages
                      ? "Choose a different folder"
                      : "Open Image Folder"}
                </Button>

                {viewModel.folderPath && (
                  <p className="truncate text-xs text-muted-foreground">
                    {viewModel.folderPath}
                  </p>
                )}
              </div>

              {hasImages ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Selected Images</span>
                    <Badge variant="secondary">
                      {viewModel.images.length} file
                      {viewModel.images.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <ImageGrid
                    images={viewModel.images}
                    onRemove={viewModel.removeImage}
                  />
                </div>
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Labels are created as you annotate — no need to define them
                    up front. Existing LabelMe <code>.json</code> sidecars in the
                    folder are imported automatically.
                  </AlertDescription>
                </Alert>
              )}

              {viewModel.error ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    {viewModel.error instanceof Error
                      ? viewModel.error.message
                      : "Something went wrong while preparing the project."}
                  </AlertDescription>
                </Alert>
              ) : null}
            </CardContent>

            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={viewModel.cancel}
                disabled={viewModel.isCreating}
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Cancel
              </Button>

              <Button
                onClick={() => void viewModel.createProject()}
                disabled={!viewModel.canCreate || viewModel.isCreating}
              >
                {viewModel.isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create & Start Annotating"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
})

ProjectCreate.displayName = "ProjectCreate"
