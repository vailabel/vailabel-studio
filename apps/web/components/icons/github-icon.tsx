import type { SVGProps } from "react"

/**
 * GitHub logo mark. lucide-react v1 removed brand icons, so we ship our own.
 * API mirrors a lucide icon: pass `size` and/or `className`.
 */
export function GithubIcon({
  size = 24,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.2 3.438 9.61 8.205 11.16.6.11.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.72-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.755-1.333-1.755-1.09-.74.083-.725.083-.725 1.205.084 1.84 1.236 1.84 1.236 1.07 1.832 2.807 1.303 3.492.996.108-.775.42-1.305.762-1.605-2.665-.3-5.466-1.325-5.466-5.896 0-1.302.468-2.366 1.235-3.2-.124-.302-.535-1.52.117-3.166 0 0 1.008-.322 3.3 1.222a11.5 11.5 0 0 1 3.003-.404c1.02.005 2.047.138 3.006.404 2.29-1.544 3.296-1.222 3.296-1.222.654 1.646.243 2.864.12 3.166.77.834 1.233 1.898 1.233 3.2 0 4.583-2.805 5.593-5.478 5.887.43.372.814 1.102.814 2.222 0 1.605-.015 2.9-.015 3.293 0 .32.216.694.825.576C20.565 21.896 24 17.487 24 12.29 24 5.78 18.627.5 12 .5Z" />
    </svg>
  )
}
