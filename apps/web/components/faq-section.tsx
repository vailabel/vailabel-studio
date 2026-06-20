import { ChevronDown } from "lucide-react"
import { Section, SectionHeading } from "@/components/ui/section"

/** Shared FAQ source — also used to build FAQPage structured data on the home page. */
export const faqs: { question: string; answer: string }[] = [
  {
    question: "Is Vailabel Studio free and open source?",
    answer:
      "Yes. Vailabel Studio is a free, open-source data labeling tool. You can download it at no cost for Windows, macOS, and Linux, and the full source code is available on GitHub under a permissive license.",
  },
  {
    question: "Does it work offline, and is my data private?",
    answer:
      "Yes. Vailabel Studio is local-first: your images, videos, and annotations are stored on your own machine in a local SQLite database. The AI copilot runs on-device, so labeling works fully offline and your data never leaves your computer unless you choose to sync it to your own cloud bucket.",
  },
  {
    question: "What types of annotation does it support?",
    answer:
      "It supports bounding boxes, polygons, points, lines, circles, and free-draw shapes, plus SAM-powered smart segmentation. Beyond images you can label video frame-by-frame and work with multi-modal data including text and audio.",
  },
  {
    question: "Which export formats can I use to train my models?",
    answer:
      "You can export datasets to COCO, YOLO, YOLO-Seg, Pascal VOC, and LabelMe JSON — so the labels you create drop straight into the training pipeline you already use.",
  },
  {
    question: "Is Vailabel Studio a good alternative to Label Studio, CVAT, or Roboflow?",
    answer:
      "It's a strong alternative if you want a desktop, local-first annotation tool with a built-in offline AI copilot. Unlike browser-based or cloud-hosted tools, Vailabel Studio keeps your data on your machine, requires no account, and runs auto-labeling and QA on-device.",
  },
  {
    question: "What does the offline AI copilot do?",
    answer:
      "The copilot uses local models to detect objects, segment masks, suggest labels, and QA your existing annotations — keeping a human in the loop while removing the repetitive work. Because it runs locally there are no cloud calls or per-label costs.",
  },
  {
    question: "Which platforms does Vailabel Studio run on?",
    answer:
      "Vailabel Studio is a cross-platform desktop app for Windows, macOS, and Linux. No account or internet connection is required to start labeling.",
  },
]

export default function FaqSection() {
  return (
    <Section id="faq">
      <SectionHeading
        eyebrow="FAQ"
        title="Frequently asked questions"
        description="Everything you need to know about labeling data with Vailabel Studio."
      />

      <div className="mx-auto max-w-3xl divide-y divide-border rounded-2xl border border-border bg-card">
        {faqs.map((f) => (
          <details key={f.question} className="group px-6 py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold text-foreground">
              <h3 className="text-base font-semibold">{f.question}</h3>
              <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {f.answer}
            </p>
          </details>
        ))}
      </div>
    </Section>
  )
}
