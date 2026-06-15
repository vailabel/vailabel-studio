"use client"

import { motion } from "framer-motion"
import { Sparkles, Check } from "lucide-react"
import { data } from "@/app/data"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Container } from "@/components/ui/section"
import { GithubIcon } from "@/components/icons/github-icon"
import { cn } from "@/lib/utils"
import DownloadButton from "@/components/download-button"
import { HeroMockup } from "@/components/hero-mockup"

const trust = [
  "Free & open source",
  "Windows · macOS · Linux",
  "No account required",
]

export default function HeroSection() {
  return (
    <section id="download" className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <Container className="pb-12 pt-20 md:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Badge className="mb-5 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5" />
              Offline-first · AI-assisted · Open source
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl"
          >
            Label your data with an{" "}
            <span className="text-gradient">offline AI copilot</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl"
          >
            {data.appName} is a local-first desktop studio for image, video, and
            multi-modal annotation. Detect, segment, and QA your labels with
            on-device AI — your data never leaves your machine.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <DownloadButton />
            <a
              href={data.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              <GithubIcon className="h-4 w-4" />
              View on GitHub
            </a>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
          >
            {trust.map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-primary" />
                {t}
              </li>
            ))}
          </motion.ul>
        </div>

        <HeroMockup />
      </Container>
    </section>
  )
}
