export function extractJson(text: string) {
  if (!text || typeof text !== 'string') {
    throw new Error('extractJson received non-string input')
  }

  let cleaned = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    // Try extracting JSON from surrounding text
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const extracted = cleaned.substring(firstBrace, lastBrace + 1)
      try {
        return JSON.parse(extracted)
      } catch {
        // Last resort: try cleaning common LLM quirks
        const fixed = extracted
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
          .replace(/\n/g, ' ')
        return JSON.parse(fixed)
      }
    }
    throw new Error('No JSON found in response')
  }
}
