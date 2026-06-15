"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { data } from "@/app/data"
import { GithubIcon } from "@/components/icons/github-icon"
import { buttonVariants } from "@/components/ui/button"
import { Container } from "@/components/ui/section"
import { cn } from "@/lib/utils"

export default function CTASection() {
  return (
    <Container className="py-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-primary px-6 py-16 text-center md:py-20"
      >
        <div className="absolute inset-0 -z-0 bg-grid opacity-20" />
        <div className="relative z-10 mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold text-primary-foreground md:text-4xl">
            Start labeling in minutes
          </h2>
          <p className="mt-4 text-lg text-primary-foreground/80">
            Download {data.appName} for free and put an offline AI copilot to
            work on your dataset today.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/#download"
              className={buttonVariants({
                size: "lg",
                variant: "secondary",
                className: "bg-background text-foreground hover:bg-background/90",
              })}
            >
              Download now
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={data.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              )}
            >
              <GithubIcon className="h-4 w-4" />
              Star on GitHub
            </a>
          </div>
        </div>
      </motion.div>
    </Container>
  )
}
