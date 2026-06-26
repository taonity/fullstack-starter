package org.example.fullstackstarter.db

import org.jetbrains.exposed.sql.Table

/** Exposed mapping for the `app_user` table (created/migrated by Flyway). */
object UsersTable : Table("app_user") {
    val googleId = varchar("google_id", 255)
    val email = varchar("email", 512)
    val displayName = varchar("display_name", 512)
    val pictureUrl = varchar("picture_url", 2048).nullable()

    override val primaryKey = PrimaryKey(googleId)
}
