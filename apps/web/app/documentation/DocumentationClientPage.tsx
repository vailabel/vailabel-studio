"use client"

import { redirect } from "next/navigation"
import Link from "next/link"
import { FileText, FolderPlus, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import { AnimatedLayout } from "@/components/animated-layout"
import { useEffect, useState } from "react"

export default function DocumentationClientPage() {
  const [docFiles, setDocFiles] = useState<string[]>([])
  const [docsFound, setDocsFound] = useState<boolean>(false)

  useEffect(() => {
    const fetchDocs = async () => {
      // Try multiple possible locations for docs
      const possibleDocsDirs = [
        `${process.cwd()}/docs`,
        `${process.cwd()}/app/docs`,
        `${process.cwd()}/public/docs`,
      ]

      for (const docsDir of possibleDocsDirs) {
        try {
          const files = await fetch(`/api/readDir?dir=${docsDir}`).then((res) =>
            res.json()
          )
          const filteredFiles = files
            .filter((f: string) => f.endsWith(".md"))
            .sort()

          if (filteredFiles.length > 0) {
            setDocsFound(true)
            setDocFiles(filteredFiles)
            // Get the first document and redirect to it
            const firstDocSlug = filteredFiles[0].replace(/\.md$/, "")
            redirect(`/documentation/${firstDocSlug}`)
            return
          }
        } catch (error) {
          // Continue to the next possible location
          console.log(`No docs found in ${docsDir}`)
        }
      }
    }

    fetchDocs()
  }, [])

  // Fallback content if no docs are found
  return (
    <AnimatedLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <motion.div
          className="mb-6 p-6 rounded-full bg-muted"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <FileText className="h-12 w-12 text-muted-foreground" />
        </motion.div>

        <motion.h1
          className="text-3xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          Documentation Not Found
        </motion.h1>

        <motion.p
          className="text-muted-foreground mb-8 max-w-md"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          No documentation files were found. You need to create a docs directory
          with markdown files.
        </motion.p>

        <div className="space-y-4 max-w-md text-left bg-card border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-medium">How to add documentation:</h2>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <motion.li
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <strong>1.</strong> Create a{" "}
              <code className="bg-muted px-1 py-0.5 rounded text-xs">
                /docs
              </code>{" "}
              directory in your project root
            </motion.li>
            <motion.li
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <strong>2.</strong> Add markdown files with{" "}
              <code className="bg-muted px-1 py-0.5 rounded text-xs">.md</code>{" "}
              extension
            </motion.li>
            <motion.li
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <strong>3.</strong> Include frontmatter for metadata (optional):
              <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-x-auto">
                {`---
title: Getting Started
description: Learn how to get started
category: Basics
---

# Content goes here`}
              </pre>
            </motion.li>
          </ol>
          <Link
            href="/"
            className="w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition group"
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            Return to Home
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </AnimatedLayout>
  )
}
