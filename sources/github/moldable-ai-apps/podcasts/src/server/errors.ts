export class PodcastError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status:
      | 400
      | 404
      | 409
      | 410
      | 422
      | 429
      | 500
      | 502
      | 503 = 400,
  ) {
    super(message)
  }
}
