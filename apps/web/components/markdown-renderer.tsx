"use client"

import React, { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import "highlight.js/styles/github.css"
import "highlight.js/styles/github-dark.css"

export function MarkdownRenderer({ children }: { children: string }) {
  return (
    <article className="prose dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-headings:font-semibold prose-h2:text-2xl prose-h3:text-xl prose-img:rounded-lg prose-img:shadow-md prose-a:text-primary hover:prose-a:text-primary/80 prose-blockquote:border-l-primary/50 prose-blockquote:bg-muted/50 prose-blockquote:py-1 prose-blockquote:pl-6 prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-pre:bg-zinc-900 dark:prose-pre:bg-zinc-900/90 prose-pre:text-zinc-50 prose-pre:rounded-lg prose-pre:p-4 prose-pre:shadow-sm">
      <div className={"hljs-dark"}>
        <style>{`pre { padding: 0 !important; }`}</style>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}
          components={
            {
              a: ({ node, ...props }: { node?: any; href?: string }) => {
                const { href } = props as any
                if (href && href.startsWith("http")) {
                  return (
                    <a
                      {...props}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    />
                  )
                }
                return <a {...props} />
              },
              code({
                node,
                inline,
                className,
                children,
                ...props
              }: {
                node?: any
                inline?: boolean
                className?: string
                children?: React.ReactNode
              }) {
                const [copied, setCopied] = useState(false)
                const codeString = String(children).replace(/\n$/, "")
                const handleCopy = async () => {
                  try {
                    await navigator.clipboard.writeText(codeString)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1200)
                  } catch (e) {
                    setCopied(false)
                  }
                }
                if (inline || className === undefined) {
                  // Inline code or code without a language class: no block style, no copy button
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  )
                }
                // Block code: show copy button and block style
                return (
                  <div className="relative group">
                    <button
                      onClick={handleCopy}
                      className="absolute top-2 right-2 z-10 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-80 hover:opacity-100 transition-opacity"
                      type="button"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <code
                      className={
                        (className || "") +
                        " block p-4 rounded bg-gray-900 overflow-x-auto border border-gray-700 relative"
                      }
                      {...props}
                    >
                      {children}
                    </code>
                  </div>
                )
              },
            } as any
          }
        >
          {children}
        </ReactMarkdown>
      </div>
    </article>
  )
}
