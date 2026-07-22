package org.example.fullstackstarter.console.service

import org.example.fullstackstarter.console.exception.ConsoleForbiddenException
import org.example.fullstackstarter.security.principal.GoogleUserPrincipal
import org.example.fullstackstarter.user.entity.UserEntity
import org.example.fullstackstarter.user.repository.UserRepository
import org.springframework.stereotype.Service

@Service
class AccessGuard(
    private val userRepository: UserRepository,
) {
    fun currentUser(principal: GoogleUserPrincipal): UserEntity =
        userRepository.findById(principal.getGoogleId())
            .orElseThrow { ConsoleForbiddenException("Unknown user") }

    fun requireView(principal: GoogleUserPrincipal): UserEntity {
        val user = currentUser(principal)
        if (!user.role.canView()) {
            throw ConsoleForbiddenException("Console view access required")
        }
        return user
    }

    fun requireEdit(principal: GoogleUserPrincipal): UserEntity {
        val user = currentUser(principal)
        if (!user.role.canEdit()) {
            throw ConsoleForbiddenException("Console edit access required")
        }
        return user
    }

    fun requireAdmin(principal: GoogleUserPrincipal): UserEntity {
        val user = currentUser(principal)
        if (!user.role.isAdmin()) {
            throw ConsoleForbiddenException("Console admin access required")
        }
        return user
    }

    fun requireOwner(principal: GoogleUserPrincipal): UserEntity {
        val user = currentUser(principal)
        if (!user.role.isOwner()) {
            throw ConsoleForbiddenException("Console owner access required")
        }
        return user
    }
}
