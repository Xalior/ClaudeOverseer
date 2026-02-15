export interface OverseerAPI {
  // API methods will be defined here as we implement them
}

declare global {
  interface Window {
    overseer: OverseerAPI
  }
}
