package org.example.fullstackstarter.user.demo

import org.example.fullstackstarter.common.demo.DemoDataContributor
import org.example.fullstackstarter.user.entity.AccessRequestStatus
import org.example.fullstackstarter.user.entity.ConsoleRole
import org.example.fullstackstarter.user.entity.UserEntity
import org.example.fullstackstarter.user.repository.UserRepository
import org.springframework.context.annotation.Profile
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional

@Component
@Profile("demo-data")
@Order(100)
class AccessRequestDemoDataContributor(
    private val userRepository: UserRepository,
) : DemoDataContributor {
    override val feature: String = "access-requests"

    @Transactional
    override fun seed(): Int {
        val users = fixtures().filterNot { userRepository.existsById(it.googleId) }
        userRepository.saveAll(users)
        return users.size
    }

    private fun fixtures() = listOf(
        UserEntity(
            googleId = "google-user-alice",
            email = "alice@example.com",
            displayName = "Alice Tester",
            role = ConsoleRole.NONE,
            accessStatus = AccessRequestStatus.PENDING,
            requestedRole = ConsoleRole.VIEWER,
        ),
        UserEntity(
            googleId = "google-user-bob",
            email = "bob@example.com",
            displayName = "Bob Tester",
            role = ConsoleRole.NONE,
            accessStatus = AccessRequestStatus.PENDING,
            requestedRole = ConsoleRole.EDITOR,
        ),
    )
}
