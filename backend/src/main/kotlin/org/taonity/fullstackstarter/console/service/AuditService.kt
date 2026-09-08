package org.taonity.fullstackstarter.console.service

import io.github.oshai.kotlinlogging.KotlinLogging
import org.taonity.fullstackstarter.console.entity.AuditAction
import org.taonity.fullstackstarter.console.entity.AuditLogEntity
import org.taonity.fullstackstarter.console.repository.AuditLogRepository
import org.taonity.fullstackstarter.user.entity.UserEntity
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class AuditService(
    private val auditLogRepository: AuditLogRepository,
) {
    companion object {
        private val LOGGER = KotlinLogging.logger {}
    }

    @Transactional
    fun record(action: AuditAction, targetType: String, targetId: String?, actor: UserEntity) {
        auditLogRepository.save(
            AuditLogEntity(
                action = action,
                targetType = targetType,
                targetId = targetId,
                actorGoogleId = actor.googleId,
                actorEmail = actor.email,
            )
        )
        LOGGER.info { "Audit: action=$action targetType=$targetType targetId=$targetId actor=${actor.googleId}" }
    }
}
