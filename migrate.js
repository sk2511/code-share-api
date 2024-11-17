import { SequelizeStorage, Umzug } from 'umzug'
import { Sequelize } from 'sequelize'
import config from './config/config.js'

const { db } = config

const sequelize = new Sequelize(db.DB, db.USER, db.PASSWORD, {
  host: db.HOST,
  dialect: db.dialect,
})

const migrationArgs = process.argv[2]

let migrationCommand

console.log(`${migrationArgs.toUpperCase()} BEGIN`)

const migrator = new Umzug({
  migrations: { glob: './Migrations/*.js' },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
})

const seeder = new Umzug({
  migrations: { glob: './Seeders/*.js' },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
})

switch (migrationArgs) {
  case 'up':
    migrationCommand = migrator.up().then(() => seeder.up())
    break

  case 'down':
    migrationCommand = seeder
      .down()
      .then(() => migrator.down({ to: '20240205055300-create-user.js' }))
    break
  default:
    break
}

migrationCommand
  .then(() => {
    const successMsg = `${migrationArgs.toUpperCase()} DONE`
    console.log(successMsg)
    console.log('='.repeat(successMsg.length))
  })
  .catch((err) => {
    const errorMsg = `${migrationArgs.toUpperCase()} ERROR`
    console.log(errorMsg)
    console.log('='.repeat(errorMsg.length))
    console.log(err)
    console.log('='.repeat(errorMsg.length))
    process.exit(1)
  })
  .then(() => Promise.resolve())
  .then(() => process.exit(0))
