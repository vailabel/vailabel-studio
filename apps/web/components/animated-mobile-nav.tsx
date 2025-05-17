"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AnimatedMobileNavProps {
  docs: Array<{ slug: string; title: string; category?: string }>
  docsByCategory: Record<string, Array<{ slug: string; title: string; category?: string }>>
  sortedCategories: string[]
  onItemClick?: () => void
}

export function AnimatedMobileNav({ docs, docsByCategory, sortedCategories, onItemClick }: AnimatedMobileNavProps) {
  const pathname = usePathname()

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 },
  }

  return (
    <ScrollArea className="h-[calc(100vh-8rem)]">
      <motion.div className="space-y-6 pb-8" initial="hidden" animate="visible" variants={containerVariants}>
        {sortedCategories.map((category) => (
          <div key={category} className="space-y-2">
            <motion.h3 className="font-medium text-sm text-muted-foreground px-3" variants={itemVariants}>
              {category}
            </motion.h3>
            <nav className="space-y-1">
              {docsByCategory[category].map((doc) => {
                const isActive = pathname === `/documentation/${doc.slug}`

                return (
                  <motion.div key={doc.slug} variants={itemVariants}>
                    <Link
                      href={`/documentation/${doc.slug}`}
                      className={cn(
                        "block text-sm rounded-md px-3 py-2 transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground font-medium"
                          : "hover:bg-accent/50 hover:text-accent-foreground",
                      )}
                      onClick={onItemClick}
                    >
                      {doc.title}
                    </Link>
                  </motion.div>
                )
              })}
            </nav>
          </div>
        ))}
      </motion.div>
    </ScrollArea>
  )
}
