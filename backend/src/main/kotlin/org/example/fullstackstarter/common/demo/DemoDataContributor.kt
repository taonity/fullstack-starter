package org.example.fullstackstarter.common.demo

interface DemoDataContributor {
    val feature: String

    fun seed(): Int
}
