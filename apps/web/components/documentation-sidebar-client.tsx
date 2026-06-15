"use client"

import Link from "next/link"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface Doc {
  slug: string
  title: string
  category?: string
}

interface SidebarProps {
  docs: Doc[]
}

export function DocumentationSidebarClient({ docs }: SidebarProps) {
  const pathname = usePathname()
  const [search, setSearch] = useState("")

  const docsByCategory = docs.reduce(
    (acc, doc) => {
      const category = doc.category || "General"
      if (!acc[category]) acc[category] = []
      acc[category].push(doc)
      return acc
    },
    {} as Record<string, Doc[]>
  )
  const sortedCategories = Object.keys(docsByCategory).sort((a, b) => {
    if (a === "General") return -1
    if (b === "General") return 1
    return a.localeCompare(b)
  })

  const q = search.trim().toLowerCase()
  const filteredDocsByCategory = q
    ? Object.fromEntries(
        sortedCategories.map((category) => [
          category,
          docsByCategory[category].filter(
            (doc) =>
              doc.title.toLowerCase().includes(q) ||
              doc.slug.toLowerCase().includes(q)
          ),
        ])
      )
    : docsByCategory

  return (
    <div className="py-6">
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search docs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <nav className="space-y-6">
        {sortedCategories.map((category) => {
          const docsInCategory = filteredDocsByCategory[category] || []
          if (docsInCategory.length === 0) return null
          return (
            <div key={category}>
              <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {category}
              </h3>
              <ul className="space-y-0.5">
                {docsInCategory.map((doc) => {
                  const active = pathname === `/docs/${doc.slug}`
                  return (
                    <li key={doc.slug}>
                      <Link
                        href={`/docs/${doc.slug}`}
                        className={cn(
                          "block rounded-lg px-2 py-1.5 text-sm transition-colors",
                          active
                            ? "bg-primary/10 font-medium text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        {doc.title}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
        {q && Object.values(filteredDocsByCategory).flat().length === 0 && (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            No documentation found.
          </p>
        )}
      </nav>
    </div>
  )
}
