import { useMemo } from "react"
import { parseLabelConfig } from "@/shared/lib/label-config/parse"
import type { LabelConfig } from "@/shared/lib/label-config/types"

export interface ParsedConfig {
  config: LabelConfig | null
  error: string | null
}

/**
 * Parse the project's JSON (or XML) labeling config, memoized on the raw string.
 * A missing config yields `{ config: null, error: null }`; an invalid one yields
 * a human-readable error so the editor can render a notice instead of throwing.
 */
export function useParsedConfig(rawConfig: string | undefined): ParsedConfig {
  return useMemo<ParsedConfig>(() => {
    if (!rawConfig) return { config: null, error: null }
    try {
      return { config: parseLabelConfig(rawConfig), error: null }
    } catch (error) {
      return {
        config: null,
        error: error instanceof Error ? error.message : "Invalid labeling config",
      }
    }
  }, [rawConfig])
}
