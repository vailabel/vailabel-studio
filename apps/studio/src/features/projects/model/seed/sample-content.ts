// Sample text for seeded projects: real documents, chats and evaluation rows
// (sample-texts.ts), chosen to fit each template. Everything here is pure; the
// bundled media files are catalogued in sample-library.ts.

import {
  ASSISTANT_CHATS,
  ASSISTANT_COMPARISON,
  ASSISTANT_PREFERENCES,
  ASSISTANT_PROMPTS,
  ASSISTANT_REPLIES,
  EARTHQUAKES,
  GROUNDED_ANSWERS,
  MODERATION_COMMENTS,
  NEWS_ARTICLES,
  OPINION_COMMENTS,
  ORGANISM_INTROS,
  READING_PASSAGES,
  RECEIPT_TEXTS,
  RED_TEAM_EXCHANGES,
  SEARCH_QUERIES,
  SUPPORT_DIALOGUES,
  TOOL_CALLS,
  TRAVEL_GUIDE,
  VOICE_COMMANDS,
} from "./sample-texts"

const article = (index: number) => {
  const { title, date, body } = NEWS_ARTICLES[index]
  return `${title}\n${date}\n\n${body}`
}

const transcript = (chat: (typeof ASSISTANT_CHATS)[number]) =>
  chat
    .map(
      ({ role, content }) =>
        `${role === "user" ? "User" : "Assistant"}: ${content}`
    )
    .join("\n\n")

/** Documents for a template with one text object, by the template's words
 *  (first match wins; the last pool is the catch-all). */
const TEXT_POOLS: Array<{ match?: RegExp; docs: string[] }> = [
  { match: /invoice/, docs: RECEIPT_TEXTS },
  { match: /intent|slot|booking/, docs: VOICE_COMMANDS },
  { match: /archaea|bacteria|eukarya/, docs: ORGANISM_INTROS },
  { match: /moderat/, docs: MODERATION_COMMENTS },
  { match: /sentiment|tweet|positive/, docs: OPINION_COMMENTS },
  { match: /chatbot|conversation/, docs: ASSISTANT_CHATS.map(transcript) },
  { match: /response generation|assistant response/, docs: ASSISTANT_PROMPTS },
  {
    match: /question answering|answer span/,
    docs: READING_PASSAGES.map((passage) => passage.context),
  },
  // Lead paragraphs: a sensible length to translate.
  {
    match: /translat/,
    docs: NEWS_ARTICLES.slice(0, 3).map((news) => news.body.split("\n")[0]),
  },
  { docs: [0, 1, 2].map(article) },
]

export function sampleTexts(hint: string): string[] {
  const fit = TEXT_POOLS.find((pool) => pool.match?.test(hint))
  return (fit ?? TEXT_POOLS[TEXT_POOLS.length - 1]).docs
}

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"]/g,
    (char) => `&${{ "&": "amp", "<": "lt", ">": "gt", '"': "quot" }[char]};`
  )

const paragraphs = (text: string) =>
  text
    .split(/\n+/)
    .filter(Boolean)
    .map((line) => `  <p>${escapeHtml(line)}</p>`)

/** Web pages for HTML templates: two news reports and a travel guide. */
export const SAMPLE_HTML = [
  ...NEWS_ARTICLES.slice(3).map(({ title, date, body }) =>
    [
      "<article>",
      `  <h1>${escapeHtml(title)}</h1>`,
      `  <p><em>Wikinews</em> · ${escapeHtml(date)}</p>`,
      ...paragraphs(body),
      "</article>",
    ].join("\n")
  ),
  [
    "<article>",
    `  <h1>${TRAVEL_GUIDE.title}</h1>`,
    "  <p><em>Wikivoyage travel guide</em></p>",
    ...paragraphs(TRAVEL_GUIDE.intro),
    "  <h2>Get in</h2>",
    ...TRAVEL_GUIDE.getIn.flatMap(paragraphs),
    "</article>",
  ].join("\n"),
]

// ── Row fields ──────────────────────────────────────────────────────────────
// Multi-field tasks (a prompt and responses, a query and documents, …) read one
// record per row. Records are keyed by the canonical names below; a config's
// own field names are mapped onto them in `sampleFieldText`.

interface RowRecord {
  prompt: string
  responses?: string[]
  context?: string
  documents?: string[]
  transcript?: string
}

const llmRows = (): RowRecord[] =>
  ASSISTANT_PREFERENCES.map((pair, row) => ({
    prompt: pair.prompt,
    // Alternate sides so the better reply isn't always first.
    responses: row % 2 ? [pair.worse, pair.better] : [pair.better, pair.worse],
  }))

const ROW_SETS: Array<{ match?: RegExp; rows: () => RowRecord[] }> = [
  {
    match: /hallucinat/,
    rows: () =>
      GROUNDED_ANSWERS.map((qa, row) => ({
        prompt: qa.question,
        responses: [row === 2 ? qa.correct : qa.hallucinated],
        context: qa.knowledge,
      })),
  },
  {
    match: /rag|grounding|faithful/,
    rows: () =>
      GROUNDED_ANSWERS.map((qa, row) => ({
        prompt: qa.question,
        responses: [row === 1 ? qa.correct : qa.hallucinated],
        context: qa.knowledge,
      })),
  },
  {
    match: /safety|toxic/,
    rows: () =>
      RED_TEAM_EXCHANGES.map((exchange) => ({
        prompt: exchange.prompt,
        responses: [exchange.response],
      })),
  },
  {
    match: /tool|function/,
    rows: () =>
      TOOL_CALLS.map((call) => ({
        prompt: call.request,
        responses: [`${call.tool}\n\n${call.call}`],
      })),
  },
  {
    match: /retriev|rank|search/,
    rows: () =>
      SEARCH_QUERIES.map((search) => ({
        prompt: search.query,
        documents: search.passages,
      })),
  },
  {
    match: /pairwise|better of two/,
    rows: () => [
      {
        prompt: ASSISTANT_COMPARISON.prompt,
        responses: [ASSISTANT_COMPARISON.first, ASSISTANT_COMPARISON.second],
      },
      ...llmRows().slice(0, 2),
    ],
  },
  {
    match: /grading|single model response/,
    rows: () =>
      ASSISTANT_REPLIES.map((reply) => ({
        prompt: reply.prompt,
        responses: [reply.response],
      })),
  },
  {
    rows: () =>
      llmRows().map((record, row) => ({
        ...record,
        transcript: transcript(ASSISTANT_CHATS[row % ASSISTANT_CHATS.length]),
      })),
  },
]

/** Trailing variant of a field name: "response_b" → 1, "document_3" → 2. */
function variantOf(name: string): number {
  const suffix = /[_-]?([a-c]|\d+)$/i.exec(name)?.[1]?.toLowerCase()
  if (!suffix) return 0
  const index = /\d/.test(suffix)
    ? Number(suffix) - 1
    : suffix.charCodeAt(0) - 97
  return Math.max(0, index)
}

const pick = (list: string[] | undefined, index: number) =>
  list && list.length > 0 ? list[index % list.length] : undefined

/**
 * Text for one field of a multi-field row, from the record set that fits the
 * template (`hint`) and the field's name: prompts read like the question,
 * responses like the answers (later variants differ), documents like passages.
 */
export function sampleFieldText(name: string, row: number, hint = ""): string {
  const field = name.toLowerCase()
  // A question beside a reading passage must be that passage's question.
  if (/question answering|answer span/.test(hint)) {
    return READING_PASSAGES[row % READING_PASSAGES.length].question
  }
  const set =
    ROW_SETS.find((entry) => entry.match?.test(hint)) ??
    ROW_SETS[ROW_SETS.length - 1]
  const rows = set.rows()
  const record = rows[row % rows.length]
  const variant = variantOf(field)

  if (/dialog|conversation|chat|transcript/.test(field) && record.transcript) {
    return record.transcript
  }
  if (
    /context|evidence|knowledge|reference|source|chunk/.test(field) &&
    record.context
  ) {
    return record.context
  }
  if (/prompt|question|query|instruction|input|request/.test(field)) {
    return record.prompt
  }
  if (
    /response|answer|output|completion|summary|reply|prediction|call/.test(
      field
    )
  ) {
    return pick(record.responses, variant) ?? record.prompt
  }
  // Numbered documents / results / texts.
  return (
    pick(record.documents, variant) ??
    pick(record.responses, variant) ??
    record.context ??
    article(row % NEWS_ARTICLES.length)
  )
}

// ── Structured text fields (Paragraphs / Chat / List objects) ────────────────
/** Customer-service chats, Label Studio Paragraphs shape. */
export const SAMPLE_DIALOGUES = SUPPORT_DIALOGUES.map((dialogue) =>
  JSON.stringify(dialogue, null, 2)
)

/** Assistant chats, as {role, content} messages. */
export const SAMPLE_CHATS = ASSISTANT_CHATS.map((chat) =>
  JSON.stringify(chat, null, 2)
)

/** Search results to rank for each query, as {id, title, body} entries. */
export const SAMPLE_LISTS = SEARCH_QUERIES.map((search) =>
  JSON.stringify(
    search.passages.map((body, index) => ({
      id: `r${index + 1}`,
      title: `${search.title} — passage ${index + 1}`,
      body,
    })),
    null,
    2
  )
)

/** Rows for a whole-row (tabular) task: earthquake catalog entries to check. */
export const SAMPLE_TABLE_ROWS: Array<Record<string, string>> = EARTHQUAKES.map(
  (quake) => ({ ...quake })
)
