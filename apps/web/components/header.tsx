"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Sun, Moon, Menu as MenuIcon, Download } from "lucide-react"
import { Popover } from "@base-ui/react/popover"
import { useTheme } from "next-themes"
import { data, navLinks } from "@/app/data"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import GitHubButton from "./github-button"

export default function Header() {
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => setMounted(true), [])

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark")

  const isActive = (path: string) =>
    pathname === path || pathname?.startsWith(`${path}/`)

  const linkClass = (match: string) =>
    cn(
      "text-sm font-medium transition-colors",
      isActive(match)
        ? "text-foreground"
        : "text-muted-foreground hover:text-foreground"
    )

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt={`${data.appName} logo`}
            width={32}
            height={32}
            className="h-8 w-8 rounded-md"
          />
          <span className="text-base font-semibold tracking-tight">
            {data.appName}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={linkClass(link.match)}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <GitHubButton repoUrl={data.repoUrl} />
          {mounted && (
            <button
              onClick={toggleTheme}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}
          <Link
            href="/#download"
            className={buttonVariants({ size: "sm", className: "ml-1" })}
          >
            <Download size={16} />
            Download
          </Link>
        </div>

        {/* Mobile nav */}
        <div className="flex items-center md:hidden">
          <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <Popover.Trigger
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Toggle menu"
            >
              <MenuIcon className="h-5 w-5" />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner side="bottom" align="end" sideOffset={10}>
                <Popover.Popup className="z-50 flex w-60 flex-col gap-1 rounded-2xl border border-border bg-popover p-3 text-popover-foreground shadow-xl animate-fade-in">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                        isActive(link.match)
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                      onClick={() => setMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <Link
                    href="/#download"
                    onClick={() => setMenuOpen(false)}
                    className={buttonVariants({
                      size: "sm",
                      className: "mt-1 w-full",
                    })}
                  >
                    <Download size={16} />
                    Download
                  </Link>
                  <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
                    <GitHubButton repoUrl={data.repoUrl} />
                    {mounted && (
                      <button
                        onClick={toggleTheme}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="Toggle dark mode"
                      >
                        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                      </button>
                    )}
                  </div>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </div>
    </header>
  )
}
