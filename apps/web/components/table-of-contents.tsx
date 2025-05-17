"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { FileText } from "lucide-react"

interface TableOfContentsProps {
  content: string
  className?: string
}

interface Heading {
  id: string
  text: string
  level: number
}

export function TableOfContents({ content, className }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [activeId, setActiveId] = useState<string>("")

  // Extract headings from markdown content
  useEffect(() => {
    const extractedHeadings: Heading[] = []
    const lines = content.split("\n")

    lines.forEach((line) => {
      const match = line.match(/^(#{2,4})\s+(.+)$/)
      if (match) {
        const level = match[1].length
        const text = match[2]
        const id = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")

        extractedHeadings.push({ id, text, level })
      }
    })

    setHeadings(extractedHeadings)
  }, [content])

  // Track active heading based on scroll position
  useEffect(() => {
    if (headings.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: "0px 0px -80% 0px" }
    )

    headings.forEach(({ id }) => {
      const element = document.getElementById(id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => {
      headings.forEach(({ id }) => {
        const element = document.getElementById(id)
        if (element) {
          observer.unobserve(element)
        }
      })
    }
  }, [headings])

  if (headings.length === 0) {
    return null
  }

  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
        <FileText className="h-4 w-4" />
        <span>On this page</span>
      </div>
      <nav>
        <ul className="space-y-1 text-sm">
          {headings.map((heading) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                className={cn(
                  "block py-1 transition-colors hover:text-foreground",
                  heading.level === 2
                    ? "pl-0"
                    : heading.level === 3
                      ? "pl-4"
                      : "pl-6",
                  activeId === heading.id
                    ? "font-medium text-primary"
                    : "text-muted-foreground"
                )}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
