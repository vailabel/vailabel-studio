"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AnimatedSidebarProps {
  docsByCategory: Record<string, Array<{ slug: string; title: string; category?: string }>>
  sortedCategories: string[]
}

export function AnimatedSidebar({ docsByCategory, sortedCategories }: AnimatedSidebarProps) {
  const pathname = usePathname()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const categoryVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
  }

  return (
    <ScrollArea className="h-full py-6 pr-4">
      <motion.div className="space-y-6" initial="hidden" animate="visible" variants={containerVariants}>
        {sortedCategories.map((category) => (
          <motion.div key={category} className="space-y-2" variants={categoryVariants}>
            <h3 className="font-medium text-sm text-muted-foreground">{category}</h3>
            <nav className="space-y-1">
              {docsByCategory[category].map((doc) => {
                const isActive = pathname === `/documentation/${doc.slug}`
                const isHovered = hoveredItem === doc.slug

                return (
                  <div key={doc.slug} className="relative">
                    {(isActive || isHovered) && (
                      <motion.div
                        layoutId="sidebar-highlight"
                        className="absolute inset-0 rounded-md bg-accent"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                    <Link
                      href={`/documentation/${doc.slug}`}
                      className={cn(
                        "block text-sm rounded-md px-3 py-2 relative z-10 transition-colors",
                        isActive
                          ? "text-accent-foreground font-medium"
                          : "text-foreground/70 hover:text-accent-foreground",
                      )}
                      onMouseEnter={() => setHoveredItem(doc.slug)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      {doc.title}
                    </Link>
                  </div>
                )
              })}
            </nav>
          </motion.div>
        ))}
      </motion.div>
    </ScrollArea>
  )
}
