import * as React from "react"

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  { hasError: boolean }
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI.
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // You can replace this with your own error logging service
    // @ts-expect-error: Custom global for error logging
    if (
      typeof window !== "undefined" &&
      typeof window.logErrorToMyService === "function"
    ) {
      // @ts-expect-error: Custom global for error logging
      window.logErrorToMyService(
        error,
        info.componentStack,
        // captureOwnerStack is not standard, so we check for its existence
        typeof (React as unknown as { captureOwnerStack?: () => unknown })
          .captureOwnerStack === "function"
          ? (
              React as unknown as { captureOwnerStack: () => unknown }
            ).captureOwnerStack()
          : undefined
      )
    }
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback || null
    }
    return this.props.children
  }
}
