export class NotFoundError extends Error {
  statusCode = 404
  constructor(entity = 'Record') { super(`${entity} not found`) }
}

export class ConflictError extends Error {
  statusCode = 409
  constructor(message: string) { super(message) }
}

export class ForbiddenError extends Error {
  statusCode = 403
  constructor(message = 'Insufficient permissions') { super(message) }
}

export class UnprocessableError extends Error {
  statusCode = 422
  constructor(message: string) { super(message) }
}

export class ValidationError extends Error {
  statusCode = 400
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}
