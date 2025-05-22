import React, { useState } from "react"
import { Button } from "@/components/ui/button"

export function ErrorBoundary({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [error, setError] = useState<Error | null>(null)

  // Custom error handler for child components
  const ErrorCatcher = React.useCallback(
    (props: { children: React.ReactNode }) => {
      try {
        return <>{props.children}</>
      } catch (err) {
        // Display the actual error object as JSON if not an Error instance
        if (err instanceof Error) {
          setError(err)
        } else {
          setError(
            new Error(typeof err === "string" ? err : JSON.stringify(err))
          )
        }
        return null
      }
    },
    []
  )

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-6">
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
        <p className="text-yellow-600 dark:text-yellow-200 mt-4 text-lg md:text-xl max-w-xl text-center">
          {error.message}
        </p>
        <pre className="bg-black/10 dark:bg-black/40 text-yellow-700 dark:text-yellow-200 p-4 rounded-lg mt-6 max-w-2xl overflow-x-auto text-xs md:text-sm font-mono shadow-lg">
          {typeof error.stack === "string" && error.stack.trim() !== ""
            ? error.stack
            : JSON.stringify(error, null, 2)}
        </pre>
        <div className="flex gap-4 mt-8">
          <Button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white text-lg font-semibold shadow-md hover:bg-blue-500 transition-transform duration-200"
          >
            🔄 Reload Page
          </Button>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="text-gray-900 dark:text-white border-gray-300 dark:border-white hover:bg-gray-100 dark:hover:bg-white/10"
          >
            ← Back
          </Button>
        </div>
        <p className="mt-8 text-gray-500 dark:text-gray-300 text-base">
          If this keeps happening, please{" "}
          <a
            href="https://github.com/vailabel/vailabel-studio/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-300 underline hover:text-blue-400 dark:hover:text-blue-200 transition-colors"
          >
            report an issue
          </a>
          .
        </p>
      </div>
    )
  }
  return <ErrorCatcher>{children}</ErrorCatcher>
}
