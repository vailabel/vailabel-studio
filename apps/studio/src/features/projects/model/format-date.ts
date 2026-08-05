/**
 * Date/time formatting shared by the project list and detail screens. Both
 * return "Unknown" rather than throwing, so a malformed timestamp from an old
 * record can never blank out a whole card.
 */

const format = (
  date: Date | string | undefined,
  options: Intl.DateTimeFormatOptions
): string => {
  if (!date) return "Unknown"
  try {
    const parsed = typeof date === "string" ? new Date(date) : date
    if (Number.isNaN(parsed.getTime())) return "Unknown"
    return new Intl.DateTimeFormat("en-US", options).format(parsed)
  } catch {
    return "Unknown"
  }
}

/** e.g. "Mar 4, 2026". */
export const formatProjectDate = (date: Date | string | undefined): string =>
  format(date, { month: "short", day: "numeric", year: "numeric" })

/** e.g. "09:41 AM". */
export const formatProjectTime = (date: Date | string | undefined): string =>
  format(date, { hour: "2-digit", minute: "2-digit" })
