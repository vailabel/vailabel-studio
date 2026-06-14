#!/usr/bin/env node
/**
 * Codemod: replace hard-coded neutral Tailwind colors with the app's semantic
 * theme tokens (defined in src/index.css `@theme inline`).
 *
 *   text-gray-900 dark:text-gray-100   ->  text-foreground
 *   text-gray-500 dark:text-gray-400   ->  text-muted-foreground
 *   bg-white      dark:bg-gray-800     ->  bg-card
 *   bg-gray-50    dark:bg-gray-900     ->  bg-background
 *   border-gray-200 dark:border-gray-700 -> border-border
 *
 * Why only these:
 *  - Only NEUTRALS (gray/white) are remapped. Status colors (green/red/amber/
 *    blue/yellow) carry meaning and are left untouched.
 *  - Grays map to foreground / muted-foreground / card / background / border /
 *    input — NOT `primary` (primary is the brand accent; body text in primary
 *    would look wrong). Promote specific elements to text-primary by hand.
 *
 * Usage (from repo root or anywhere):
 *   node apps/studio/scripts/replace-hardcoded-colors.mjs            # dry run (default)
 *   node apps/studio/scripts/replace-hardcoded-colors.mjs --write    # apply changes
 *   node apps/studio/scripts/replace-hardcoded-colors.mjs --aggressive [--write]
 *       also remaps standalone (non-paired) light grays and removes orphan
 *       `dark:*-gray-*` classes. Review the diff carefully.
 *   node apps/studio/scripts/replace-hardcoded-colors.mjs --root=/abs/path/to/src
 *
 * Always review `git diff` afterwards — the mappings are opinionated.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs"
import { join, extname, dirname, relative } from "node:path"
import { fileURLToPath } from "node:url"

const args = process.argv.slice(2)
const WRITE = args.includes("--write")
const AGGRESSIVE = args.includes("--aggressive")
const rootArg = args.find((a) => a.startsWith("--root="))

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = rootArg
  ? rootArg.slice("--root=".length)
  : join(SCRIPT_DIR, "..", "src")

const EXTENSIONS = new Set([".ts", ".tsx", ".jsx", ".js"])
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".git", "src-tauri"])

// ── Paired rules: [lightClass, darkClass, replacement] ───────────────────────
// The dark class is matched as `dark:<darkClass>` (with mirrored variant prefix).
const PAIR_RULES = [
  // Text → foreground (primary text)
  ["text-gray-900", "text-gray-100", "text-foreground"],
  ["text-gray-900", "text-gray-50", "text-foreground"],
  ["text-gray-800", "text-gray-100", "text-foreground"],
  ["text-gray-800", "text-gray-200", "text-foreground"],
  ["text-gray-700", "text-gray-200", "text-foreground"],
  // Text → muted-foreground (secondary text)
  ["text-gray-700", "text-gray-300", "text-muted-foreground"],
  ["text-gray-600", "text-gray-300", "text-muted-foreground"],
  ["text-gray-600", "text-gray-400", "text-muted-foreground"],
  ["text-gray-500", "text-gray-400", "text-muted-foreground"],
  ["text-gray-500", "text-gray-300", "text-muted-foreground"],
  ["text-gray-400", "text-gray-500", "text-muted-foreground"],
  ["text-gray-400", "text-gray-600", "text-muted-foreground"],
  // Surfaces
  ["bg-white", "bg-gray-800", "bg-card"],
  ["bg-white", "bg-gray-900", "bg-background"],
  ["bg-gray-50", "bg-gray-900", "bg-background"],
  ["bg-gray-50", "bg-gray-800", "bg-muted"],
  ["bg-gray-100", "bg-gray-900", "bg-muted"],
  ["bg-gray-100", "bg-gray-800", "bg-muted"],
  ["bg-gray-100", "bg-gray-700", "bg-muted"],
  ["bg-gray-200", "bg-gray-700", "bg-muted"],
  ["bg-gray-200", "bg-gray-800", "bg-muted"],
  // Borders
  ["border-gray-200", "border-gray-700", "border-border"],
  ["border-gray-200", "border-gray-600", "border-border"],
  ["border-gray-100", "border-gray-800", "border-border"],
  ["border-gray-300", "border-gray-600", "border-input"],
  ["border-gray-300", "border-gray-700", "border-input"],
]

// ── Standalone rules (only with --aggressive) ────────────────────────────────
const STANDALONE_RULES = [
  ["text-gray-900", "text-foreground"],
  ["text-gray-800", "text-foreground"],
  ["text-gray-700", "text-foreground"],
  ["text-gray-600", "text-muted-foreground"],
  ["text-gray-500", "text-muted-foreground"],
  ["text-gray-400", "text-muted-foreground"],
  ["bg-white", "bg-card"],
  ["bg-gray-50", "bg-muted"],
  ["bg-gray-100", "bg-muted"],
  ["border-gray-200", "border-border"],
  ["border-gray-300", "border-input"],
]

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
// Variant prefix: zero or more "x:" segments that are NOT `dark:`.
const PFX = "((?:(?!dark:)[a-z][a-z0-9-]*:)*)"
const NB_BEFORE = "(?<![\\w-])"
const NB_AFTER = "(?![\\w-])"

/** Build the [regex, replacement] pairs for one paired rule (both orders). */
function buildPairPatterns([light, dark, repl]) {
  const L = esc(light)
  const D = esc(dark)
  return [
    // light then dark:  <pfx>light dark:<pfx>dark
    [new RegExp(`${NB_BEFORE}${PFX}${L}\\s+dark:\\1${D}${NB_AFTER}`, "g"), `$1${repl}`],
    // dark then light:  dark:<pfx>dark <pfx>light
    [new RegExp(`${NB_BEFORE}dark:${PFX}${D}\\s+\\1${L}${NB_AFTER}`, "g"), `$1${repl}`],
  ]
}

function buildStandalonePatterns([cls, repl]) {
  const C = esc(cls)
  return [
    // standalone light gray (no dark: prefix immediately attached)
    [new RegExp(`${NB_BEFORE}${PFX}${C}${NB_AFTER}`, "g"), `$1${repl}`],
  ]
}

const PAIR_PATTERNS = PAIR_RULES.flatMap(buildPairPatterns)
const STANDALONE_PATTERNS = STANDALONE_RULES.flatMap(buildStandalonePatterns)
// Remove any leftover orphan dark neutral classes (aggressive only).
const ORPHAN_PATTERNS = [
  [/\s+dark:(?:text|bg|border)-(?:gray|slate|zinc|neutral)-\d{2,3}\b/g, ""],
  [/\bdark:(?:text|bg|border)-(?:gray|slate|zinc|neutral)-\d{2,3}\s+/g, ""],
]

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(full, files)
    } else if (EXTENSIONS.has(extname(entry))) {
      files.push(full)
    }
  }
  return files
}

function transform(source) {
  let out = source
  let count = 0
  const apply = (patterns) => {
    for (const [re, rep] of patterns) {
      out = out.replace(re, (...m) => {
        count++
        // Support replacement strings that reference $1 (the variant prefix).
        return typeof rep === "string"
          ? rep.replace(/\$1/g, m[1] ?? "")
          : rep
      })
    }
  }
  apply(PAIR_PATTERNS)
  if (AGGRESSIVE) {
    apply(STANDALONE_PATTERNS)
    apply(ORPHAN_PATTERNS)
  }
  return { out, count }
}

function main() {
  let files
  try {
    files = walk(ROOT)
  } catch (error) {
    console.error(`Cannot read root directory: ${ROOT}\n${error.message}`)
    process.exit(1)
  }

  let changedFiles = 0
  let totalReplacements = 0
  const changed = []

  for (const file of files) {
    const source = readFileSync(file, "utf8")
    const { out, count } = transform(source)
    if (count > 0 && out !== source) {
      changedFiles++
      totalReplacements += count
      changed.push([relative(ROOT, file), count])
      if (WRITE) writeFileSync(file, out, "utf8")
    }
  }

  changed.sort((a, b) => b[1] - a[1])
  for (const [rel, count] of changed) {
    console.log(`  ${String(count).padStart(4)}  ${rel}`)
  }

  console.log("\n" + "─".repeat(56))
  console.log(`Root:         ${ROOT}`)
  console.log(`Mode:         ${WRITE ? "WRITE (files modified)" : "DRY RUN (no changes written)"}${AGGRESSIVE ? " + aggressive" : ""}`)
  console.log(`Files scanned: ${files.length}`)
  console.log(`Files changed: ${changedFiles}`)
  console.log(`Replacements:  ${totalReplacements}`)
  if (!WRITE && totalReplacements > 0) {
    console.log("\nRe-run with --write to apply, then review `git diff`.")
  }
}

main()
