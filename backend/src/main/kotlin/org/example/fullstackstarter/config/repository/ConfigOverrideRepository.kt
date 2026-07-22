package org.example.fullstackstarter.config.repository

import org.example.fullstackstarter.config.entity.ConfigOverrideEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface ConfigOverrideRepository : JpaRepository<ConfigOverrideEntity, String>
