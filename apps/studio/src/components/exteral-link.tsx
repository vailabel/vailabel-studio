import { isElectron } from "@/lib/constants"
import { ExternalLink as LucideExternalLink } from "lucide-react"
import React from "react"

interface ExternalLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  children: React.ReactNode
  icon?: boolean
}

export const ExternalLink: React.FC<ExternalLinkProps> = ({
  href,
  children,
  icon = true,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isElectron()) {
      e.preventDefault()
      window.ipc?.invoke?.("command:openExternalLink", href).catch((error) => {
        console.error("Failed to open external link:", error)
      })
    }
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      {...props}
      className={
        "inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium " +
        (props.className || "")
      }
    >
      {children}
      {icon && <LucideExternalLink className="h-3 w-3 ml-1" />}
    </a>
  )
}

export default ExternalLink
