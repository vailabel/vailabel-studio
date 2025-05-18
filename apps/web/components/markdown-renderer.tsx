"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import "highlight.js/styles/github.css"
import "highlight.js/styles/github-dark.css"

export function MarkdownRenderer({ children }: { children: string }) {
  return (
    <div className={"hljs-dark"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}
        components={
          {
            a: ({ node, ...props }) => {
              const { href } = props as any
              if (href.startsWith("http")) {
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
          } as any
        }
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
