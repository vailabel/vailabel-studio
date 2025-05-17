import { motion } from "framer-motion"

const NotFound = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
    <motion.h1
      className="text-7xl font-extrabold text-indigo-600 drop-shadow-lg mb-4"
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
    >
      404
    </motion.h1>
    <motion.p
      className="text-2xl text-gray-700 dark:text-gray-200 mb-2"
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.5 }}
    >
      Page Not Found
    </motion.p>
    <motion.p
      className="text-base text-gray-500 dark:text-gray-400 mb-8"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.35, duration: 0.5 }}
    >
      Maybe this feature will be implemented in the future.
    </motion.p>
    <motion.a
      href="#/"
      className="px-6 py-2 rounded-full bg-indigo-600 text-white font-semibold shadow-lg hover:bg-indigo-700 transition-colors duration-200"
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.96 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4 }}
    >
      Go to Home
    </motion.a>
  </div>
)

export default NotFound
