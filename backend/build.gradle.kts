import org.apache.tools.ant.filters.ReplaceTokens
import org.gradle.api.tasks.WriteProperties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    kotlin("jvm")
    kotlin("plugin.jpa")
    kotlin("plugin.spring")
    id("org.springframework.boot")
    id("com.google.cloud.tools.jib")
}

dependencies {
    implementation(platform("org.springframework.boot:spring-boot-dependencies:4.0.6"))

    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-validation")

    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-client")
    implementation("org.springframework.session:spring-session-jdbc")

    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.postgresql:postgresql")

    implementation("io.micrometer:micrometer-registry-prometheus")
    implementation("org.aspectj:aspectjweaver")

    implementation("io.github.oshai:kotlin-logging-jvm:7.0.3")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("org.jetbrains.kotlin:kotlin-stdlib")
    implementation("tools.jackson.module:jackson-module-kotlin")

    implementation("com.h2database:h2")
    implementation("org.springframework.boot:spring-boot-starter-flyway")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("com.github.gavlyukovskiy:datasource-proxy-spring-boot-starter:2.0.0")

    implementation("com.google.apis:google-api-services-oauth2:v2-rev20200213-2.0.0")
    implementation("org.wiremock:wiremock-standalone:3.13.2")
    implementation(project(":google-stubs"))

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.boot:spring-boot-webmvc-test")
    testImplementation("org.springframework.boot:spring-boot-test-autoconfigure")
    testImplementation("org.springframework.boot:spring-boot-data-jpa-test")
    testImplementation("org.springframework.boot:spring-boot-jdbc-test")
    testImplementation("org.springframework.security:spring-security-test")
}

kotlin {
    jvmToolchain(17)
    compilerOptions {
        jvmTarget = JvmTarget.JVM_17
    }
}

springBoot {
    buildInfo()
}

val dockerRegistry = providers.gradleProperty("dockerRegistry")
val backendImageName = providers.gradleProperty("backendImageName")
val jibBaseImage = providers.gradleProperty("jibBaseImage")
val dockerImage = dockerRegistry.zip(backendImageName) { registry, imageName ->
    "$registry/$imageName:${project.version}"
}
val productionDockerDirectory = layout.buildDirectory.dir("docker/prod")

fun Copy.configureDockerTemplateCopy(outputDirectory: Provider<Directory>) {
    from(rootProject.layout.projectDirectory.dir("templates/docker"))
    into(outputDirectory)
    exclude(".env")
    filteringCharset = "UTF-8"
    filter<ReplaceTokens>(
        "tokens" to providers.gradlePropertiesPrefixedBy("").get(),
        "beginToken" to "%{",
        "endToken" to "}",
    )
}

val prepareTestDockerCompose = tasks.register<Copy>("prepareTestDockerCompose") {
    group = "distribution"
    description = "Prepares the Docker Compose project used by build automation."
    configureDockerTemplateCopy(layout.buildDirectory.dir("docker/test"))
}

val prepareProductionDockerCompose = tasks.register<Copy>("prepareProductionDockerCompose") {
    group = "distribution"
    description = "Prepares Docker Compose files included in the backend image."
    configureDockerTemplateCopy(productionDockerDirectory)
}

jib {
    from {
        image = jibBaseImage.get()
    }
    to {
        image = dockerImage.get()
        tags = setOf("latest")
    }
    container {
        creationTime = "USE_CURRENT_TIMESTAMP"
        workingDirectory = "/${rootProject.name}"
    }
    extraDirectories {
        paths {
            path {
                setFrom(productionDockerDirectory)
                into = "/docker"
                excludes = listOf(".env")
            }
            path {
                setFrom(project(":google-stubs").layout.projectDirectory.dir("src/main/resources"))
                into = "/app/resources"
            }
        }
    }
}

tasks.matching { it.name in setOf("jib", "jibBuildTar", "jibDockerBuild") }.configureEach {
    dependsOn(prepareProductionDockerCompose)
}

val gitCommit = providers.exec {
    commandLine("git", "rev-parse", "HEAD")
}.standardOutput.asText.map(String::trim)
val gitBranch = providers.exec {
    commandLine("git", "rev-parse", "--abbrev-ref", "HEAD")
}.standardOutput.asText.map(String::trim)
val gitCommitValue = gitCommit.get()
val gitBranchValue = gitBranch.get()
val generatedGitResources = layout.buildDirectory.dir("generated/resources/git")

val generateGitProperties = tasks.register<WriteProperties>("generateGitProperties") {
    destinationFile = generatedGitResources.get().file("git.properties").asFile
    property("git.branch", gitBranchValue)
    property("git.commit.id.full", gitCommitValue)
}

sourceSets {
    main {
        resources.srcDir(generatedGitResources)
    }
}

tasks.processResources {
    dependsOn(generateGitProperties)
    val resourceTokens = mapOf(
        "git.commit.id.abbrev" to gitCommitValue.take(7),
        "project.version" to project.version.toString(),
    )
    inputs.properties(resourceTokens)
    filter<ReplaceTokens>(
        "tokens" to resourceTokens,
        "beginToken" to "@",
        "endToken" to "@",
    )
}

tasks.test {
    useJUnitPlatform {
        excludeTags("smoke")
    }
}

val smokeTest = tasks.register<Test>("smokeTest") {
    group = "verification"
    description = "Runs Docker Compose smoke integration tests."
    testClassesDirs = sourceSets.test.get().output.classesDirs
    classpath = sourceSets.test.get().runtimeClasspath
    include("**/automation/*IT.class")
    useJUnitPlatform {
        includeTags("smoke")
    }
    systemProperty("smoke.tests.enabled", "true")
    shouldRunAfter(tasks.test)
}