const sql = require('mssql')

/**
 * Singleton connection pool.
 * Azure SQL Basic tier stays warm — we hold the pool open for the function
 * host lifetime rather than opening/closing per request.
 */

const config = {
  server:   process.env.AZURE_SQL_SERVER,
  database: process.env.AZURE_SQL_DATABASE,
  user:     process.env.AZURE_SQL_USER,
  password: process.env.AZURE_SQL_PASSWORD,
  options: {
    encrypt: true,          // Required for Azure SQL
    trustServerCertificate: false,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

let pool = null

async function getPool() {
  if (!pool) {
    pool = await new sql.ConnectionPool(config).connect()
    pool.on('error', (err) => {
      console.error('SQL pool error:', err)
      pool = null   // Force reconnect on next request
    })
  }
  return pool
}

/**
 * Execute a parameterised query. Parameters is an array of:
 *   { name, type, value }  — e.g. { name: 'meridianId', type: sql.Int, value: 5 }
 */
async function query(text, parameters = []) {
  const pool = await getPool()
  const request = pool.request()
  for (const { name, type, value } of parameters) {
    request.input(name, type, value)
  }
  return request.query(text)
}

module.exports = { query, sql }
