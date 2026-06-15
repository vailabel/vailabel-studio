import { Download, ArrowRight } from "lucide-react"
import { data } from "@/app/data"
import { Card } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function BlogSidebar() {
  return (
    <aside className="w-full flex-shrink-0 lg:w-80">
      <div className="sticky top-24 flex flex-col gap-6">
        {/* Promo */}
        <div className="overflow-hidden rounded-2xl border border-border bg-primary p-6 text-center text-primary-foreground shadow-sm">
          <span className="mb-2 inline-block text-xs font-bold uppercase tracking-widest text-primary-foreground/70">
            Get started
          </span>
          <p className="text-lg font-semibold">Try {data.appName}</p>
          <p className="mt-2 text-sm text-primary-foreground/80">
            A local-first labeling studio with an offline AI copilot — free and
            open source.
          </p>
          <a
            href={data.productionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ size: "sm", variant: "secondary" }),
              "mt-4 w-full bg-background text-foreground hover:bg-background/90"
            )}
          >
            Learn more
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        {/* Download */}
        <Card className="p-6 text-center">
          <p className="text-lg font-semibold">Download the desktop app</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Get the full power of {data.appName} on your computer.
          </p>
          <a
            href="https://github.com/vailabel/vailabel-studio/releases"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: "sm" }), "mt-4 w-full")}
          >
            <Download className="h-4 w-4" />
            Download now
          </a>
        </Card>
      </div>
    </aside>
  )
}
