import Fastify from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fastifyCors from '@fastify/cors'
import { ZodError } from 'zod'
import { config } from './config'
import { authUserManagementRoutes } from './modules/auth-user-management/routes'
import { contactManagementRoutes } from './modules/contact-management/routes'
import { companyManagementRoutes } from './modules/company-management/routes'
import { leadManagementRoutes } from './modules/lead-management/routes'
import { dealPipelineManagementRoutes } from './modules/deal-pipeline-management/routes'
import { activityTaskTrackingRoutes } from './modules/activity-task-tracking/routes'
import { notesRoutes } from './modules/notes/routes'
import { basicReportsRoutes } from './modules/basic-reports/routes'

export function buildApp() {
  const app = Fastify({ logger: true })

  app.register(fastifyCors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return cb(null, true)
      // Allow any localhost port in development
      if (config.NODE_ENV !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        return cb(null, true)
      }
      // In production, restrict to configured FRONTEND_URL only
      if (origin === config.FRONTEND_URL) return cb(null, true)
      cb(new Error('Not allowed by CORS'), false)
    },
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
  app.register(contactManagementRoutes, { prefix: '/api' })
  app.register(companyManagementRoutes, { prefix: '/api' })
  app.register(leadManagementRoutes, { prefix: '/api' })
  app.register(dealPipelineManagementRoutes, { prefix: '/api' })
  app.register(activityTaskTrackingRoutes, { prefix: '/api' })
  app.register(notesRoutes, { prefix: '/api' })
  app.register(basicReportsRoutes, { prefix: '/api/reports' })

  return app
}
