export class HttpError extends Error {
  status: number
  problem?: string

  constructor(status: number, message: string, problem?: string) {
    super(message)
    this.status = status
    this.problem = problem
  }
}
