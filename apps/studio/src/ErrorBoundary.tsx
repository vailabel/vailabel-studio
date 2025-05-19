import React, { useState } from "react"
import { motion } from "framer-motion"

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
        setError(err as Error)
        return null
      }
    },
    []
  )

  if (error) {
    return (
      <motion.div
        className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-400 via-gray-800 to-gray-900 text-white"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <motion.div
          initial={{ rotate: -10, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 10 }}
          className="mb-6"
        >
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
        </motion.div>
        <motion.h1
          className="text-4xl md:text-5xl font-bold tracking-wide mt-2"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Oops! Something went wrong
        </motion.h1>
        <motion.p
          className="text-yellow-200 mt-4 text-lg md:text-xl max-w-xl text-center"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {error.message}
        </motion.p>
        <motion.pre
          className="bg-black/40 text-yellow-200 p-4 rounded-lg mt-6 max-w-2xl overflow-x-auto text-xs md:text-sm font-mono shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {error.stack}
        </motion.pre>
        <motion.button
          className="mt-8 px-8 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-400 text-white text-lg font-semibold shadow-md hover:scale-105 hover:from-blue-500 hover:to-blue-300 transition-transform duration-200"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => window.location.reload()}
        >
          🔄 Reload Page
        </motion.button>
        <motion.p
          className="mt-8 text-gray-300 text-base"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          If this keeps happening, please{" "}
          <a
            href="https://github.com/vailabeling/vailabeling/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-300 underline hover:text-blue-200 transition-colors"
          >
            report an issue
          </a>
          .
        </motion.p>
      </motion.div>
    )
  }
  return <ErrorCatcher>{children}</ErrorCatcher>
}
