export const ollamaConfig = {
  name: 'ollama',
  baseUrl: 'http://localhost:11434/v1',
  rpmLimit: 999,
  models: ['llama3.1', 'mistral', 'codellama'],
  embeddingModel: 'nomic-embed-text',
  embeddingDimensions: 768,
}
