package org.taonity.fullstackstarter.config.repository

import org.taonity.fullstackstarter.config.entity.ConfigOverrideEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface ConfigOverrideRepository : JpaRepository<ConfigOverrideEntity, String>
