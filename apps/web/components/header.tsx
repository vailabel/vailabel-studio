"use client"
import Link from "next/link"
import { Sun, Moon, Menu as MenuIcon } from "lucide-react"
import { Popover } from "@base-ui/react/popover"
import { useTheme } from "next-themes"
import { data } from "@/app/data"
import { usePathname } from "next/navigation"
import GitHubButton from "./github-button"
import { useEffect, useState } from "react"
import Image from "next/image"

const navLinks = [
  { href: "/docs/getting-started", label: "Docs", match: "/docs" },
  { href: "/blogs", label: "Blog", match: "/blogs" },
  { href: "/updates", label: "Updates", match: "/updates" },
]

export default function Header() {
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleDarkMode = () => setTheme(theme === "dark" ? "light" : "dark")

  const isActive = (path: string) =>
    pathname === path || pathname?.startsWith(`${path}/`)

  const linkClass = (match: string) =>
    isActive(match)
      ? "text-gray-900 dark:text-white font-semibold"
      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"

  return (
    <header className="sticky top-0 z-50 surface border-b border-black/5 dark:border-white/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/logo.png"
              alt="Logo"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-xl font-bold brand-accent">
              Vision AI Label Studio
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass(link.match)}>
                {link.label}
              </Link>
            ))}
            <GitHubButton repoUrl={data.repoUrl} />
            {mounted && (
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-full surface text-gray-700 dark:text-gray-300 hover:shadow-md transition-shadow"
                aria-label="Toggle dark mode"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}
          </div>

          {/* Mobile nav */}
          <div className="md:hidden flex items-center">
            <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
              <Popover.Trigger
                className="p-2 rounded-md text-gray-700 dark:text-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                aria-label="Toggle menu"
              >
                <MenuIcon className="h-6 w-6" />
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner
                  side="bottom"
                  align="end"
                  sideOffset={8}
                  className="z-50"
                >
                  <Popover.Popup className="surface rounded-2xl shadow-xl p-4 w-56 flex flex-col gap-2 animate-fade-in">
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={linkClass(link.match)}
                        onClick={() => setMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                    <div className="pt-2 border-t border-black/5 dark:border-white/10">
                      <GitHubButton repoUrl={data.repoUrl} />
                    </div>
                    {mounted && (
                      <button
                        onClick={toggleDarkMode}
                        className="mt-1 flex items-center gap-2 p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        aria-label="Toggle dark mode"
                      >
                        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                        <span className="text-sm">
                          {theme === "dark" ? "Light mode" : "Dark mode"}
                        </span>
                      </button>
                    )}
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </div>
      </div>
    </header>
  )
}
