"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { FileText } from "lucide-react"

interface AnimatedTableOfContentsProps {
  content: string
  className?: string
}

interface Heading {
  id: string
  text: string
  level: number
}

export function AnimatedTableOfContents({ content, className }: AnimatedTableOfContentsProps) {
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
      { rootMargin: "0px 0px -80% 0px" },
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

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 },
  }

  return (
    <motion.div
      className={cn("rounded-lg border bg-card p-4", className)}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
        <FileText className="h-4 w-4" />
        <span>On this page</span>
      </div>
      <nav>
        <motion.ul className="space-y-1 text-sm" variants={containerVariants}>
          {headings.map((heading) => (
            <motion.li key={heading.id} variants={itemVariants}>
              <a
                href={`#${heading.id}`}
                className={cn(
                  "block py-1 transition-colors hover:text-foreground relative",
                  heading.level === 2 ? "pl-0" : heading.level === 3 ? "pl-4" : "pl-6",
                )}
              >
                <span className={cn(activeId === heading.id ? "font-medium text-primary" : "text-muted-foreground")}>
                  {heading.text}
                </span>
                {activeId === heading.id && (
                  <AnimatePresence>
                    <motion.span
                      className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary"
                      layoutId="active-toc-indicator"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ duration: 0.2 }}
                    />
                  </AnimatePresence>
                )}
              </a>
            </motion.li>
          ))}
        </motion.ul>
      </nav>
    </motion.div>
  )
}
