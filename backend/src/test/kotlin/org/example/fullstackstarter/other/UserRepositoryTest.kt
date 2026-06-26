package org.example.fullstackstarter.other

import org.assertj.core.api.Assertions.assertThat
import org.example.fullstackstarter.config.ConfigLoader
import org.example.fullstackstarter.db.DatabaseFactory
import org.example.fullstackstarter.user.entity.UserEntity
import org.example.fullstackstarter.user.repository.UserRepository
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

/**
 * Verifies the Exposed-backed [UserRepository] against an in-memory H2 database with the real
 * Flyway migrations applied (replaces the former JPA lazy-fetching architecture test).
 */
class UserRepositoryTest {

    private lateinit var databaseFactory: DatabaseFactory
    private val repository = UserRepository()

    @BeforeEach
    fun setUp() {
        databaseFactory = DatabaseFactory(ConfigLoader.load(arrayOf("--app.profiles=h2")))
        databaseFactory.connect()
    }

    @AfterEach
    fun tearDown() {
        databaseFactory.close()
    }

    @Test
    fun `save then findById round-trips a user`() {
        repository.save(UserEntity("test-google-id", "user@example.com", "Test User", null))

        val found = repository.findById("test-google-id")

        assertThat(found).isNotNull
        assertThat(found!!.email).isEqualTo("user@example.com")
        assertThat(found.displayName).isEqualTo("Test User")
    }

    @Test
    fun `update changes mutable fields`() {
        repository.save(UserEntity("g2", "old@example.com", "Old Name", null))

        repository.update(UserEntity("g2", "new@example.com", "New Name", "https://pic"))

        val found = repository.findById("g2")
        assertThat(found!!.email).isEqualTo("new@example.com")
        assertThat(found.displayName).isEqualTo("New Name")
        assertThat(found.pictureUrl).isEqualTo("https://pic")
    }

    @Test
    fun `findById returns null for unknown id`() {
        assertThat(repository.findById("does-not-exist")).isNull()
    }
}
