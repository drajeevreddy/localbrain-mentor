export const huggingfaceConfig = {
  name: 'huggingface',
  baseUrl: 'https://api-inference.huggingface.co',
  rpmLimit: 30,
  models: ['mistralai/Mistral-7B-Instruct-v0.3'],
  embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
  embeddingDimensions: 384,
}
