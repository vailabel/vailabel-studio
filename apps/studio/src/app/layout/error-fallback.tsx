import React from "react"
import { Button } from "@/shared/ui/button"
import { RefreshCw } from "lucide-react"

interface ErrorFallbackProps {
  error?: Error
  resetErrorBoundary?: () => void
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
}) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6">
      <div className="mb-6 flex flex-col items-center">
        <svg
          width="96"
          height="96"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="40"
            cy="40"
            r="38"
            stroke="#fff"
            strokeWidth="4"
            fill="#e53e3e"
          />
          <rect x="36" y="20" width="8" height="28" rx="4" fill="#fff" />
          <rect x="36" y="54" width="8" height="8" rx="4" fill="#fff" />
        </svg>
      </div>
      <h1 className="text-4xl md:text-5xl font-bold tracking-wide mt-2">
        Oops! Something went wrong
      </h1>
      <p className="text-warning mt-4 text-lg md:text-xl max-w-xl text-center">
        {error?.message || "An unexpected error occurred."}
      </p>
      {error?.stack && (
        <pre className="bg-muted text-warning p-4 rounded-lg mt-6 max-w-2xl overflow-x-auto text-xs md:text-sm font-mono shadow-lg whitespace-pre-wrap">
          {error.stack}
        </pre>
      )}
      <div className="flex gap-4 mt-8">
        <Button
          onClick={() => window.location.reload()}
          className="bg-primary text-primary-foreground text-lg font-semibold shadow-md hover:bg-primary/90 transition-transform duration-200"
        >
          <RefreshCw className="inline-block w-5 h-5 mr-2 align-text-bottom" />{" "}
          Reload Page
        </Button>
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="text-foreground border-input hover:bg-muted"
        >
          ← Back
        </Button>
        {resetErrorBoundary && (
          <Button
            variant="secondary"
            onClick={resetErrorBoundary}
            className="ml-2"
          >
            Try Again
          </Button>
        )}
      </div>
      <p className="mt-8 text-muted-foreground text-base">
        If this keeps happening, please{" "}
        <a
          href="https://github.com/vailabel/vailabel-studio/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80 transition-colors"
        >
          report an issue
        </a>
        .
      </p>
    </div>
  )
}

export default ErrorFallback
