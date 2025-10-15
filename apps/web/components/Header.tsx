"use client"
import Link from "next/link"
import { Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { data } from "@/app/data"
import { usePathname } from "next/navigation"
import GitHubButton from "./GitHubButton"
import { useEffect, useState } from "react"
import Image from "next/image"

export default function Header() {
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleDarkMode = () => {
    if (theme === "dark") {
      setTheme("light")
    } else {
      setTheme("dark")
    }
  }

  const isActive = (path: string) => pathname === path

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-2">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/logo.png"
                alt="Logo"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="text-xl font-bold">Vision AI Label Studio</span>
            </Link>
          </div>
          {/* Desktop nav */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/"
              className={`${
                isActive("/")
                  ? "text-gray-900 dark:text-white font-semibold"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              Home
            </Link>
            <Link
              href="/docs/getting-started"
              className={`${
                isActive("/docs")
                  ? "text-gray-900 dark:text-white font-semibold"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              Docs
            </Link>
            <Link
              href="/blogs"
              className={`${
                isActive("/blogs")
                  ? "text-gray-900 dark:text-white font-semibold"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              Blog
            </Link>
            <Link
              href="/updates"
              className={`${
                isActive("/updates")
                  ? "text-gray-900 dark:text-white font-semibold"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              Updates
            </Link>
            <GitHubButton repoUrl={data.repoUrl} />
            {mounted && (
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle dark mode"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}
          </div>
          {/* Mobile nav */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
              aria-label="Toggle menu"
            >
              <svg
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
        {/* Mobile menu dropdown */}
        {menuOpen && (
          <div className="md:hidden flex flex-col space-y-2 pb-4 animate-fade-in">
            <Link
              href="/"
              className={`${
                isActive("/")
                  ? "text-gray-900 dark:text-white font-semibold"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
              onClick={() => setMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/docs/getting-started"
              className={`${
                isActive("/docs")
                  ? "text-gray-900 dark:text-white font-semibold"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
              onClick={() => setMenuOpen(false)}
            >
              Docs
            </Link>
            <Link
              href="/blogs"
              className={`$${
                isActive("/blogs")
                  ? "text-gray-900 dark:text-white font-semibold"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
              onClick={() => setMenuOpen(false)}
            >
              Blog
            </Link>
            <Link
              href="/updates"
              className={`$${
                isActive("/updates")
                  ? "text-gray-900 dark:text-white font-semibold"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
              onClick={() => setMenuOpen(false)}
            >
              Updates
            </Link>
            <GitHubButton repoUrl={data.repoUrl} />
            {mounted && (
              <div className="flex justify-center mt-4 mb-2">
                <button
                  onClick={toggleDarkMode}
                  className="p-3 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Toggle dark mode"
                  style={{ minWidth: 48, minHeight: 48 }}
                >
                  {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
