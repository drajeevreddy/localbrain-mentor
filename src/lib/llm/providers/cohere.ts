export const cohereConfig = {
  name: 'cohere',
  baseUrl: 'https://api.cohere.com',
  rpmLimit: 20,
  models: ['command-r', 'command-r-plus'],
  embeddingModel: 'embed-english-v3.0',
  embeddingDimensions: 1024,
  needsShim: true,
}
