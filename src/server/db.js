import Knex from 'knex'
import moment from 'moment'

let db

export async function getDB(path) {
  if (!db) {
    db = Knex({
      client: 'better-sqlite3',
      connection: {
        filename: path,
      },
      useNullAsDefault: true,
    })
    await migrate(db)
  }
  return db
}

async function migrate(db) {
  // ensure we have our config table
  const exists = await db.schema.hasTable('config')
  if (!exists) {
    await db.schema.createTable('config', table => {
      table.string('key').primary()
      table.string('value')
    })
    await db('config').insert({ key: 'version', value: '0' })
  }
  // get current version
  const versionRow = await db('config').where('key', 'version').first()
  let version = parseInt(versionRow.value)
  // run missing migrations
  for (let i = version; i < migrations.length; i++) {
    console.log(`running migration ${i + 1}`)
    await migrations[i](db)
    await db('config')
      .where('key', 'version')
      .update('value', (i + 1).toString())
    version = i + 1
  }
}

/**
 * NOTE: always append new migrations and never modify pre-existing ones!
 */
const migrations = [
  // add users table
  async db => {
    await db.schema.createTable('users', table => {
      table.string('id').primary()
      table.string('name').notNullable()
      table.string('roles').notNullable()
      table.timestamp('createdAt').notNullable()
    })
  },
  // add blueprints & entities tables
  async db => {
    await db.schema.createTable('blueprints', table => {
      table.string('id').primary()
      table.text('data').notNullable()
      table.timestamp('createdAt').notNullable()
      table.timestamp('updatedAt').notNullable()
    })
    await db.schema.createTable('entities', table => {
      table.string('id').primary()
      table.text('data').notNullable()
      table.timestamp('createdAt').notNullable()
      table.timestamp('updatedAt').notNullable()
    })
  },
  // add blueprint.version field
  async db => {
    const now = moment().toISOString()
    const blueprints = await db('blueprints')
    for (const blueprint of blueprints) {
      const data = JSON.parse(blueprint.data)
      if (data.version === undefined) {
        data.version = 0
        await db('blueprints')
          .where('id', blueprint.id)
          .update({
            data: JSON.stringify(data),
            updatedAt: now,
          })
      }
    }
  },
]
