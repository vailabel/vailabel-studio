type JsonLdObject = Record<string, unknown>

/**
 * Renders a JSON-LD <script> for structured data.
 * Accepts a single schema object or an array (rendered as separate scripts).
 */
export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] }) {
  const items = Array.isArray(data) ? data : [data]
  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          // Serialized JSON only; no user-controlled HTML is interpolated.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  )
}
