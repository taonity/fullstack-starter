package org.taonity.fullstackstarter.local

import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.annotation.Profile
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Component
import org.taonity.fullstackstarter.user.entity.AccessRequestStatus
import org.taonity.fullstackstarter.user.entity.ConsoleRole
import org.taonity.fullstackstarter.user.entity.UserEntity
import org.taonity.fullstackstarter.user.repository.UserRepository

@Component
@Profile("stub-google & !demo")
class DevRoleUsers(private val users: UserRepository) {
    @EventListener(ApplicationReadyEvent::class)
    fun seed() {
        for (role in listOf(ConsoleRole.EDITOR, ConsoleRole.VIEWER)) {
            val name = role.name.lowercase()
            val id = "google-user-$name"
            if (!users.existsById(id)) {
                users.save(UserEntity(
                    googleId = id,
                    email = "$name@example.com",
                    displayName = "${name.replaceFirstChar(Char::uppercaseChar)} Tester",
                    role = role,
                    accessStatus = AccessRequestStatus.APPROVED,
                ))
            }
        }
    }
}
