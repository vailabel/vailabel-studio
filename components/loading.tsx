import { motion } from "framer-motion"

export default function Loading() {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-4">
      <motion.div
        className="relative flex items-center justify-center h-12 w-12"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
      >
        <div className="absolute h-12 w-12 border-2 border-blue-500 rounded-full"></div>
        <div className="absolute h-10 w-10 border-2 border-t-blue-500 border-transparent rounded-full"></div>
      </motion.div>
      <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
        Loading projects...
      </p>
    </div>
  )
}
