import Link from "next/link"
import { Sun, Moon } from "lucide-react"

export default function Header({
  darkMode,
  toggleDarkMode,
}: {
  darkMode: boolean
  toggleDarkMode: () => void
}) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold">Vision AI Label Studio</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/documentation"
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              Docs
            </Link>
            <Link href="/blogs">Blog</Link>
            <Link
              href="/updates"
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              Updates
            </Link>
            <a
              href="#"
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              GitHub
            </a>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
