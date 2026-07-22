package org.example.fullstackstarter.user.repository

import org.example.fullstackstarter.user.entity.AccessRequestStatus
import org.example.fullstackstarter.user.entity.UserEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface UserRepository : JpaRepository<UserEntity, String> {
    fun findByAccessStatusOrderByEmailAsc(accessStatus: AccessRequestStatus): List<UserEntity>

    fun findAllByOrderByEmailAsc(): List<UserEntity>
}
