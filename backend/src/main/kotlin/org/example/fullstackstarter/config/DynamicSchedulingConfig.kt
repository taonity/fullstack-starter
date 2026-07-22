package org.example.fullstackstarter.config

import org.example.fullstackstarter.console.service.AuditLogCleanupService
import org.springframework.context.annotation.Configuration
import org.springframework.scheduling.Trigger
import org.springframework.scheduling.annotation.EnableScheduling
import org.springframework.scheduling.annotation.SchedulingConfigurer
import org.springframework.scheduling.config.ScheduledTaskRegistrar
import org.springframework.scheduling.support.CronTrigger

@Configuration
@EnableScheduling
class DynamicSchedulingConfig(
    private val settings: AppSettings,
    private val auditLogCleanupService: AuditLogCleanupService,
) : SchedulingConfigurer {
    override fun configureTasks(taskRegistrar: ScheduledTaskRegistrar) {
        taskRegistrar.addTriggerTask(
            { auditLogCleanupService.cleanupOldAuditLogs() },
            Trigger { ctx -> CronTrigger(settings.retention().audit.cron).nextExecution(ctx) },
        )
    }
}
