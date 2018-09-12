const { Pool } = require('pg')
const config = require('config')

const pool = new Pool({
  user: config.get('pgUser.user'),
  host: config.get('pgUser.host'),
  database: config.get('pgUser.database'),
  password: config.get('pgUser.password'),
  port: config.get('pgUser.port')
})

module.exports = {
  query: (text, params) => pool.query(text, params)
}