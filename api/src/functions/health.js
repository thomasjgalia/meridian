const { app } = require('@azure/functions')
const { query, sql } = require('../shared/db')

/**
 * GET /api/health
 * Liveness + DB connectivity check. Not guarded by auth.
 */
app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: async (request, context) => {
    try {
      const result = await query('SELECT GETUTCDATE() AS now', [])
      const dbTime = result.recordset[0]?.now

      return {
        status: 200,
        jsonBody: {
          status: 'ok',
          db: 'connected',
          dbTime,
          version: '0.1.0',
        },
      }
    } catch (err) {
      context.error('Health check failed:', err)
      return {
        status: 503,
        jsonBody: {
          status: 'error',
          db: 'unreachable',
          message: err.message,
        },
      }
    }
  },
})
