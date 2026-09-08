plugins {
    kotlin("jvm") version "2.3.21" apply false
    kotlin("plugin.jpa") version "2.3.21" apply false
    kotlin("plugin.spring") version "2.3.21" apply false
    id("org.springframework.boot") version "4.0.6" apply false
    id("com.google.cloud.tools.jib") version "3.5.4" apply false
}

fun gitOutput(vararg arguments: String): String = providers.exec {
    commandLine("git", *arguments)
    isIgnoreExitValue = true
}.standardOutput.asText.get().trim()

group = "org.taonity"
val versionTag = providers.environmentVariable("VERSIONING_GIT_TAG").orNull
    ?: gitOutput("describe", "--tags", "--exact-match", "--match", "v*")
val branchName = providers.environmentVariable("GITHUB_HEAD_REF").orNull
    ?.takeIf(String::isNotBlank)
    ?: providers.environmentVariable("GITHUB_REF_NAME").orNull
        ?.takeIf(String::isNotBlank)
    ?: gitOutput("branch", "--show-current").takeIf(String::isNotBlank)
    ?: gitOutput("rev-parse", "--short", "HEAD")
version = versionTag
    .takeIf { it.startsWith("v") }
    ?.removePrefix("v")
    ?: "${branchName.replace('/', '-')}-SNAPSHOT"

allprojects {
    group = rootProject.group
    version = rootProject.version

    repositories {
        mavenCentral()
    }
}