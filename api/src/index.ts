import { loadConfig } from './config.ts'
import { createDatabase } from './db.ts'
import { createServerApp } from './app.ts'
import { createSmsProvider } from './sms.ts'

const config = loadConfig()
const db = createDatabase(config)
const server = createServerApp({ config, db, sms: createSmsProvider(config.smsProvider) })
server.listen(config.port, () => {
  console.info(`NSNP trial API listening on ${config.port}`)
})
