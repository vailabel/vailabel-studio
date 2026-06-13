import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Home, ArrowLeft } from "lucide-react"

const NotFound = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
    <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300 ease-out">
      <Card className="text-center">
        <CardHeader>
          <div
            className="text-6xl font-extrabold text-primary mb-4 animate-in fade-in zoom-in-95 duration-300 ease-out fill-mode-both"
            style={{ animationDelay: "100ms" }}
          >
            404
          </div>
          <CardTitle className="text-2xl">
            <span
              className="inline-block animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
              style={{ animationDelay: "200ms" }}
            >
              Page Not Found
            </span>
          </CardTitle>
          <CardDescription>
            <span
              className="inline-block animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
              style={{ animationDelay: "300ms" }}
            >
              The page you're looking for doesn't exist or has been moved.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="flex flex-col sm:flex-row gap-3 justify-center animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
            style={{ animationDelay: "400ms" }}
          >
            <Button className="w-full sm:w-auto" render={<a href="#/" />}>
              <Home className="w-4 h-4 mr-2" />
              Go to Home
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              render={<a href="javascript:history.back()" />}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
)

export default NotFound
