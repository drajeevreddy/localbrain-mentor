export const nvidiaConfig = {
  name: 'nvidia',
  baseUrl: 'https://integrate.api.nvidia.com/v1',
  rpmLimit: 40,
  models: ['meta/llama-3.1-8b-instruct', 'meta/llama-3.1-70b-instruct'],
  embeddingModel: 'nvidia/nv-embedqa-e5-v5',
  embeddingDimensions: 1536,
}
