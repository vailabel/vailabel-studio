import Link from "next/link"
import Image from "next/image"
import { Mail, MessageSquare } from "lucide-react"
import { data } from "@/app/data"
import { GithubIcon } from "@/components/icons/github-icon"
import { Container } from "@/components/ui/section"

const columns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Download", href: "/#download" },
      { label: "Features", href: "/#features" },
      { label: "Roadmap", href: "/#roadmap" },
      { label: "Updates", href: "/updates" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/docs/getting-started" },
      { label: "AI & GPU Setup", href: "/docs/ai-gpu-setup" },
      { label: "Tutorials", href: "/docs/tutorials" },
      { label: "Blog", href: "/blogs" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "GitHub", href: data.repoUrl },
      { label: "Discord", href: data.discordUrl },
      { label: "Contributing", href: data.contributingUrl },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "License (GPL-3.0)", href: data.licenseUrl },
      { label: "Privacy Policy", href: data.privacyUrl },
      { label: "Terms of Use", href: data.termsUrl },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <Container className="py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-6">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/logo.png"
                alt={`${data.appName} logo`}
                width={32}
                height={32}
                className="h-8 w-8 rounded-md"
              />
              <span className="text-base font-semibold tracking-tight">
                {data.appName}
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              {data.appDescription}
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href={data.repoUrl}
                aria-label="GitHub"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <GithubIcon size={20} />
              </a>
              <a
                href={data.discordUrl}
                aria-label="Discord"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <MessageSquare className="h-5 w-5" />
              </a>
              <a
                href={`mailto:${data.email}`}
                aria-label="Email"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-foreground">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {data.appName}. Open source under
            GPL-3.0.
          </p>
          <p className="text-sm text-muted-foreground">
            Built with Tauri, React &amp; Rust.
          </p>
        </div>
      </Container>
    </footer>
  )
}
