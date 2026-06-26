package org.example.fullstackstarter.user.service

import io.github.oshai.kotlinlogging.KotlinLogging
import org.example.fullstackstarter.db.loggedTransaction
import org.example.fullstackstarter.security.principal.GoogleUserPrincipal
import org.example.fullstackstarter.user.entity.UserEntity
import org.example.fullstackstarter.user.repository.UserRepository

class UserService(
    private val userRepository: UserRepository
) {
    companion object {
        private val LOGGER = KotlinLogging.logger {}
    }

    /** Creates or updates the user. Runs in a single Exposed transaction (replaces `@Transactional`). */
    fun createOrUpdateUser(principal: GoogleUserPrincipal): Unit = loggedTransaction {
        val existing = userRepository.findById(principal.getGoogleId())
        if (existing != null) {
            userRepository.update(
                existing.updateDetails(
                    principal.getDisplayName(),
                    principal.getEmail(),
                    principal.getPictureUrl()
                )
            )
            LOGGER.debug { "Updated user: ${existing.googleId}" }
        } else {
            val newUser = UserEntity(
                googleId = principal.getGoogleId(),
                email = principal.getEmail(),
                displayName = principal.getDisplayName(),
                pictureUrl = principal.getPictureUrl()
            )
            userRepository.save(newUser)
            LOGGER.info { "Created new user: ${newUser.googleId}" }
        }
    }
}
