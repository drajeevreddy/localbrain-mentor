export function extractJson(text: string) {
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1)
  }
  return JSON.parse(cleaned)
}
