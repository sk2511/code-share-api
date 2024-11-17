import { Sequelize } from 'sequelize'
import config from './config.js'

const { db } = config

const sequelize = new Sequelize(db.DB, db.USER, db.PASSWORD, {
  host: db.HOST,
  dialect: db.dialect,
})

export default sequelize
