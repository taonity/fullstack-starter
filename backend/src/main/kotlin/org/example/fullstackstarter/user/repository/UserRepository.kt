package org.example.fullstackstarter.user.repository

import org.example.fullstackstarter.db.UsersTable
import org.example.fullstackstarter.db.loggedTransaction
import org.example.fullstackstarter.user.entity.UserEntity
import org.jetbrains.exposed.sql.ResultRow
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.update

/** Exposed-backed data access for [UserEntity] (replaces the Spring Data `JpaRepository`). */
class UserRepository {

    fun findById(googleId: String): UserEntity? = loggedTransaction {
        UsersTable.selectAll()
            .where { UsersTable.googleId eq googleId }
            .singleOrNull()
            ?.toUserEntity()
    }

    fun save(user: UserEntity): UserEntity = loggedTransaction {
        UsersTable.insert {
            it[googleId] = user.googleId
            it[email] = user.email
            it[displayName] = user.displayName
            it[pictureUrl] = user.pictureUrl
        }
        user
    }

    fun update(user: UserEntity): UserEntity = loggedTransaction {
        UsersTable.update({ UsersTable.googleId eq user.googleId }) {
            it[email] = user.email
            it[displayName] = user.displayName
            it[pictureUrl] = user.pictureUrl
        }
        user
    }

    fun count(): Long = loggedTransaction {
        UsersTable.selectAll().count()
    }

    private fun ResultRow.toUserEntity(): UserEntity = UserEntity(
        googleId = this[UsersTable.googleId],
        email = this[UsersTable.email],
        displayName = this[UsersTable.displayName],
        pictureUrl = this[UsersTable.pictureUrl]
    )
}
