import * as dotenv from 'dotenv'
dotenv.config()
const {
  DB_HOST,
  DB_NAME,
  DB_USER,
  DB_PASS,
  DIALECT,
  DB_PORT,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USERNAME,
  SMTP_PASSWORD,
  FROM_EMAIL,
} = process.env

const db = {
  HOST: DB_HOST,
  USER: DB_USER,
  PASSWORD: DB_PASS,
  DB: DB_NAME,
  dialect: DIALECT,
  port: DB_PORT,
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
}

const config = {
  db,
  smtp_host: SMTP_HOST,
  smtp_port: SMTP_PORT,
  smtp_username: SMTP_USERNAME,
  smtp_password: SMTP_PASSWORD,
  from_email: FROM_EMAIL,
}

export default config
