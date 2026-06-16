import { memo } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/shared/lib/utils"

/**
 * Render model/LLM output as GitHub-flavored markdown, styled to match the app's
 * design tokens. There's no `@tailwindcss/typography` plugin in this project, so
 * every element is mapped explicitly — which also lets us force long content
 * (URLs, code, tables) to wrap or scroll instead of overflowing a narrow panel.
 */

// Defined once at module scope so the object identity is stable across renders.
const COMPONENTS: Components = {
  p: (props) => <p className="mb-2 last:mb-0" {...props} />,
  ul: (props) => (
    <ul className="mb-2 list-disc space-y-0.5 pl-4 last:mb-0" {...props} />
  ),
  ol: (props) => (
    <ol className="mb-2 list-decimal space-y-0.5 pl-4 last:mb-0" {...props} />
  ),
  li: (props) => <li className="leading-snug" {...props} />,
  a: ({ href, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
      {...props}
    />
  ),
  strong: (props) => <strong className="font-semibold" {...props} />,
  em: (props) => <em className="italic" {...props} />,
  h1: (props) => (
    <h3 className="mb-1 mt-3 text-sm font-semibold first:mt-0" {...props} />
  ),
  h2: (props) => (
    <h3 className="mb-1 mt-3 text-sm font-semibold first:mt-0" {...props} />
  ),
  h3: (props) => (
    <h4 className="mb-1 mt-2 text-sm font-semibold first:mt-0" {...props} />
  ),
  blockquote: (props) => (
    <blockquote
      className="mb-2 border-l-2 border-border pl-3 text-muted-foreground last:mb-0"
      {...props}
    />
  ),
  hr: () => <hr className="my-3 border-border" />,
  code: ({ className, children, ...props }) => {
    // react-markdown v10 dropped the `inline` prop: fenced blocks get a
    // `language-*` class (and a child of <pre>), inline code gets neither.
    const isBlock =
      typeof className === "string" && className.includes("language-")
    if (isBlock) {
      return (
        <code className={cn("font-mono text-xs", className)} {...props}>
          {children}
        </code>
      )
    }
    return (
      <code
        className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
        {...props}
      >
        {children}
      </code>
    )
  },
  pre: (props) => (
    <pre
      className="mb-2 overflow-x-auto rounded-md bg-muted p-2 text-xs last:mb-0"
      {...props}
    />
  ),
  table: (props) => (
    <div className="mb-2 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-xs" {...props} />
    </div>
  ),
  th: (props) => (
    <th
      className="border border-border px-2 py-1 text-left font-medium"
      {...props}
    />
  ),
  td: (props) => <td className="border border-border px-2 py-1" {...props} />,
}

function MarkdownImpl({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  return (
    // `min-w-0` + break-word let the renderer shrink inside a flex parent so long
    // tokens wrap instead of forcing the whole message column wider than the card.
    <div
      className={cn(
        "min-w-0 break-words text-sm leading-relaxed [overflow-wrap:anywhere]",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

export const Markdown = memo(MarkdownImpl)
