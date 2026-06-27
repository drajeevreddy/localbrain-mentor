export const openrouterConfig = {
  name: 'openrouter',
  baseUrl: 'https://openrouter.ai/api/v1',
  rpmLimit: 50,
  models: [
    'mistralai/mistral-7b-instruct:free',
    'google/gemma-2-9b-it:free',
    'meta-llama/llama-3.1-8b-instruct:free',
    'qwen/qwen-2-7b-instruct:free',
  ],
  embeddingModel: null,
  embeddingDimensions: 0,
}
