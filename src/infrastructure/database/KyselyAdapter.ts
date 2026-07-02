import { Kysely, SqliteDialect } from 'kysely'
import Database from 'better-sqlite3'
import { DatabaseSchema } from './schema'

export class KyselyAdapter {
  private kysely: Kysely<DatabaseSchema>

  constructor(db: Database.Database) {
    this.kysely = new Kysely<DatabaseSchema>({
      dialect: new SqliteDialect({
        database: async () => db
      })
    })
  }

  public getKysely(): Kysely<DatabaseSchema> {
    return this.kysely
  }
}
