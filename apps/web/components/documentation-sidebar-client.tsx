"use client"

import Link from "next/link"
import { useState } from "react"
import type React from "react"

interface Doc {
  slug: string
  title: string
  category?: string
}

interface SidebarProps {
  docs: Doc[]
}

export function DocumentationSidebarClient({ docs }: SidebarProps) {
  // Group docs by category
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
  const [search, setSearch] = useState("")
  const filteredDocsByCategory = search.trim()
    ? Object.fromEntries(
        sortedCategories.map((category) => [
          category,
          docsByCategory[category].filter(
            (doc) =>
              doc.title.toLowerCase().includes(search.toLowerCase()) ||
              doc.slug.toLowerCase().includes(search.toLowerCase())
          ),
        ])
      )
    : docsByCategory
  return (
    <>
      <div className="relative w-full max-w-xs mb-6">
        <input
          type="text"
          placeholder="Search docs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded border border-gray-200 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div>
        {sortedCategories.map((category) => {
          const docsInCategory = filteredDocsByCategory[category] || []
          if (docsInCategory.length === 0) return null
          return (
            <div key={category} className="mb-4">
              <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">
                {category}
              </h3>
              <ul className="space-y-1">
                {docsInCategory.map((doc) => (
                  <li key={doc.slug}>
                    <Link
                      href={`/documentation/${doc.slug}`}
                      className="block px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-sm text-gray-800 dark:text-gray-100"
                    >
                      {doc.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
        {search.trim() &&
          Object.values(filteredDocsByCategory).flat().length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400 px-2 py-4">
              No documentation found.
            </div>
          )}
      </div>
    </>
  )
}
