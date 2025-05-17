"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"

interface SearchResult {
  slug: string
  title: string
  excerpt: string
}

interface AnimatedSearchProps {
  className?: string
  placeholder?: string
  docs: Array<{ slug: string; title: string; category?: string }>
}

export function AnimatedSearch({
  className,
  placeholder = "Search documentation...",
  docs,
}: AnimatedSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const [results, setResults] = useState<SearchResult[]>([])

  // Simple search function - in a real app, you'd want a more sophisticated search
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const searchResults = docs
      .filter((doc) => doc.title.toLowerCase().includes(query.toLowerCase()))
      .map((doc) => ({
        slug: doc.slug,
        title: doc.title,
        excerpt: `Documentation for ${doc.title}`,
      }))
      .slice(0, 5)

    setResults(searchResults)
  }, [query, docs])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  return (
    <div className={className}>
      <button
        onClick={() => setIsOpen(true)}
        className="relative w-full flex items-center text-sm text-muted-foreground rounded-md border border-input px-3 py-2 bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Search className="mr-2 h-4 w-4" />
        <span>{placeholder}</span>
        <kbd className="pointer-events-none absolute right-2 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              className="fixed left-[50%] top-[20%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-background shadow-lg"
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search documentation..."
                  className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </div>
              <ScrollArea className="max-h-[300px] overflow-y-auto">
                <AnimatePresence>
                  {results.length > 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-2"
                    >
                      {results.map((result, index) => (
                        <motion.div
                          key={result.slug}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Link
                            href={`/documentation/${result.slug}`}
                            onClick={() => setIsOpen(false)}
                            className="block rounded-md px-3 py-2 hover:bg-accent hover:text-accent-foreground"
                          >
                            <h3 className="font-medium">{result.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {result.excerpt}
                            </p>
                          </Link>
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : query.trim() !== "" ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-6 text-center"
                    >
                      <p className="text-sm text-muted-foreground">
                        No results found.
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
