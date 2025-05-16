import React, { useState } from "react"

export function ErrorBoundary({
  children,
}: {
  children: React.ReactNode
}) {
  const [error, setError] = useState<Error | null>(null)

  // Custom error handler for child components
  const ErrorCatcher = React.useCallback(
    (props: { children: React.ReactNode }) => {
      try {
        return <>{props.children}</>
      } catch (err) {
        setError(err as Error)
        return null
      }
    },
    []
  )

  if (error) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <h1 style={{ fontSize: 32, color: "#e53e3e" }}>Something went wrong</h1>
        <p style={{ color: "#555", marginTop: 16 }}>{error.message}</p>
        <button
          style={{
            marginTop: 24,
            padding: "8px 24px",
            borderRadius: 6,
            background: "#3182ce",
            color: "#fff",
            border: "none",
            fontSize: 16,
            cursor: "pointer",
          }}
          onClick={() => window.location.reload()}
        >
          Reload Page
        </button>
      </div>
    )
  }
  return <ErrorCatcher>{children}</ErrorCatcher>
}
