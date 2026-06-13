import Fastify from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fastifyCors from '@fastify/cors'
import { ZodError } from 'zod'
import { config } from './config'
import { authUserManagementRoutes } from './modules/auth-user-management/routes'

export function buildApp() {
  const app = Fastify({ logger: true })

  app.register(fastifyCors, {
    origin: config.FRONTEND_URL,
    credentials: true,
  })

  app.register(fastifyJwt, {
    secret: config.JWT_SECRET,
  })

  app.setErrorHandler((error, _request, reply) => {
    if (error.message === 'UNAUTHORIZED') {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Invalid email or password.',
      })
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data.',
        details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      })
    }

    const statusCode = (error as { statusCode?: number }).statusCode ?? 500
    const errorCode = error.name === 'Error' ? 'INTERNAL_ERROR' : error.name.toUpperCase()
    reply.status(statusCode).send({
      error: errorCode,
      message: error.message,
      ...(error.validation && { details: error.validation }),
    })
  })

  // Feature modules
  app.register(authUserManagementRoutes, { prefix: '/api' })

  return app
}
