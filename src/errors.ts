export class AnytypeError extends Error {
  code: string
  status: number
  constructor(message: string, code: string, status: number) {
    super(message)
    this.code = code
    this.status = status
    this.name = 'AnytypeError'
  }
}

export class BadRequestError extends AnytypeError {
  constructor(message: string) {
    super(message, 'bad_request', 400)
    this.name = 'BadRequestError'
  }
}

export class UnauthorizedError extends AnytypeError {
  constructor(message: string) {
    super(message, 'unauthorized', 401)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AnytypeError {
  constructor(message: string) {
    super(message, 'forbidden', 403)
    this.name = 'ForbiddenError'
  }
}

export class GoneError extends AnytypeError {
  constructor(message: string) {
    super(message, 'resource_gone', 410)
    this.name = 'GoneError'
  }
}

export class RateLimitError extends AnytypeError {
  constructor(message: string) {
    super(message, 'rate_limit_exceeded', 429)
    this.name = 'RateLimitError'
  }
}

export class ServerError extends AnytypeError {
  constructor(message: string) {
    super(message, 'internal_server_error', 500)
    this.name = 'ServerError'
  }
}