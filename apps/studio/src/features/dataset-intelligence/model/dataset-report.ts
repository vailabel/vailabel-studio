// Renders a persisted AnalysisReport as a human-readable Markdown document for
// the Reports export feature.

import type { AnalysisReport } from "@/shared/types/dataset-intelligence"

export function reportToMarkdown(report: AnalysisReport): string {
  const { analytics, quality, imageQuality, outliers, health } = report
  const stats = analytics.datasetStats
  const res = analytics.resolutionStats
  const lines: string[] = []

  const h = (level: number, text: string) => lines.push(`${"#".repeat(level)} ${text}`, "")
  const row = (label: string, value: string | number) => lines.push(`- **${label}:** ${value}`)

  h(1, "Dataset Intelligence Report")
  row("Generated", new Date(report.createdAt).toLocaleString())
  row("Health score", `${health.score.toFixed(0)}/100`)
  row("Findings", `${health.errors} errors · ${health.warnings} warnings · ${health.infos} info`)
  lines.push("")

  h(2, "Dataset Statistics")
  row("Images", stats.totalItems)
  row("Annotated images", `${stats.annotatedImages} (${stats.annotatedPercentage.toFixed(1)}%)`)
  row("Unannotated images", stats.unannotatedImages)
  row("Total annotations", stats.totalAnnotations)
  row("Mean annotations / image", stats.meanAnnotationsPerImage.toFixed(2))
  row("Max annotations / image", stats.maxAnnotationsPerImage)
  row("Labels defined", report.labelCount)
  lines.push("")

  h(2, "Resolution")
  if (res.commonResolutions.length > 0) {
    row("Width", `${res.minWidth}–${res.maxWidth} (median ${res.medianWidth})`)
    row("Height", `${res.minHeight}–${res.maxHeight} (median ${res.medianHeight})`)
    row("Mean megapixels", res.megapixelsMean.toFixed(2))
    lines.push("", "| Resolution | Count |", "| --- | ---: |")
    for (const item of res.commonResolutions) {
      lines.push(`| ${item.width}×${item.height} | ${item.count} |`)
    }
    lines.push("")
  } else {
    lines.push("_No resolution data._", "")
  }

  h(2, "Class Distribution")
  if (analytics.classDistribution.length > 0) {
    lines.push("| Class | Count | Share |", "| --- | ---: | ---: |")
    for (const item of analytics.classDistribution) {
      lines.push(`| ${item.label} | ${item.count} | ${item.percentage.toFixed(1)}% |`)
    }
    lines.push("")
  } else {
    lines.push("_No annotations._", "")
  }

  h(2, "Quality Validation")
  row("Images missing labels", quality.missingLabels.length)
  row("Empty annotations", quality.emptyAnnotations.length)
  row("Invalid polygons", quality.invalidPolygons.length)
  row("Corrupted images", quality.corruptedImages.length)
  lines.push("")

  h(2, "Image Quality")
  if (report.imageQualityAnalyzed) {
    row("Images analyzed", imageQuality.analyzed)
    row("Skipped (unsupported)", imageQuality.skipped)
    row("Blurry", imageQuality.blurry.length)
    row("Overexposed", imageQuality.overexposed.length)
    row("Underexposed", imageQuality.underexposed.length)
    row("Low resolution / extreme aspect", imageQuality.lowResolution.length)
  } else {
    lines.push("_Image-pixel analysis was not run for this report._")
  }
  lines.push("")

  h(2, "Outlier Detection")
  row("Embedding outliers", outliers.embeddingOutliers.length)
  row("Rare classes", outliers.rareClasses.length)
  row("Suspicious labels", outliers.suspiciousLabels.length)
  lines.push("")

  if (report.findings.length > 0) {
    h(2, `Findings (${report.findings.length})`)
    lines.push("| Severity | Category | Message |", "| --- | --- | --- |")
    for (const finding of report.findings.slice(0, 500)) {
      const message = finding.message.replace(/\|/g, "\\|")
      lines.push(`| ${finding.severity} | ${finding.kind} | ${message} |`)
    }
    if (report.findings.length > 500) {
      lines.push("", `_…and ${report.findings.length - 500} more._`)
    }
    lines.push("")
  }

  return lines.join("\n")
}
