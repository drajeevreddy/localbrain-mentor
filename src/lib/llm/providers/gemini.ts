export const geminiConfig = {
  name: 'gemini',
  baseUrl: 'https://generativelanguage.googleapis.com',
  rpmLimit: 60,
  models: ['gemini-1.5-flash', 'gemini-1.5-pro'],
  embeddingModel: null,
  embeddingDimensions: 0,
  needsShim: true,
}
