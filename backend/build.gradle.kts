import java.time.Instant

val ktorVersion = providers.gradleProperty("ktorVersion").get()
val exposedVersion = providers.gradleProperty("exposedVersion").get()
val koinVersion = providers.gradleProperty("koinVersion").get()
val flywayVersion = providers.gradleProperty("flywayVersion").get()
val hikariVersion = providers.gradleProperty("hikariVersion").get()
val postgresVersion = providers.gradleProperty("postgresVersion").get()
val h2Version = providers.gradleProperty("h2Version").get()
val micrometerVersion = providers.gradleProperty("micrometerVersion").get()
val logbackVersion = providers.gradleProperty("logbackVersion").get()
val logstashEncoderVersion = providers.gradleProperty("logstashEncoderVersion").get()
val kotlinLoggingVersion = providers.gradleProperty("kotlinLoggingVersion").get()
val jacksonVersion = providers.gradleProperty("jacksonVersion").get()
val hibernateValidatorVersion = providers.gradleProperty("hibernateValidatorVersion").get()
val expresslyVersion = providers.gradleProperty("expresslyVersion").get()
val googleOauthApiVersion = providers.gradleProperty("googleOauthApiVersion").get()
val wiremockVersion = providers.gradleProperty("wiremockVersion").get()

plugins {
    kotlin("jvm")
    kotlin("plugin.serialization")
    id("io.ktor.plugin") version "3.1.1"
    id("com.google.cloud.tools.jib") version "3.4.4"
    id("com.gorylenko.gradle-git-properties") version "2.4.2"
}

application {
    mainClass.set("org.example.fullstackstarter.ApplicationKt")
}

dependencies {
    // --- Ktor server ---
    implementation("io.ktor:ktor-server-core:$ktorVersion")
    implementation("io.ktor:ktor-server-netty:$ktorVersion")
    implementation("io.ktor:ktor-server-content-negotiation:$ktorVersion")
    implementation("io.ktor:ktor-serialization-jackson:$ktorVersion")
    implementation("io.ktor:ktor-server-sessions:$ktorVersion")
    implementation("io.ktor:ktor-server-auth:$ktorVersion")
    implementation("io.ktor:ktor-server-status-pages:$ktorVersion")
    implementation("io.ktor:ktor-server-call-logging:$ktorVersion")
    implementation("io.ktor:ktor-server-call-id:$ktorVersion")
    implementation("io.ktor:ktor-server-double-receive:$ktorVersion")
    implementation("io.ktor:ktor-server-default-headers:$ktorVersion")
    implementation("io.ktor:ktor-server-forwarded-header:$ktorVersion")
    implementation("io.ktor:ktor-server-metrics-micrometer:$ktorVersion")

    // --- Ktor client (OAuth2 token/userinfo + health checks) ---
    implementation("io.ktor:ktor-client-core:$ktorVersion")
    implementation("io.ktor:ktor-client-cio:$ktorVersion")
    implementation("io.ktor:ktor-client-content-negotiation:$ktorVersion")

    // --- Dependency injection (Koin) ---
    implementation("io.insert-koin:koin-ktor:$koinVersion")
    implementation("io.insert-koin:koin-logger-slf4j:$koinVersion")

    // --- Persistence (Exposed + HikariCP + Flyway) ---
    implementation("org.jetbrains.exposed:exposed-core:$exposedVersion")
    implementation("org.jetbrains.exposed:exposed-jdbc:$exposedVersion")
    implementation("org.jetbrains.exposed:exposed-java-time:$exposedVersion")
    implementation("com.zaxxer:HikariCP:$hikariVersion")
    implementation("org.flywaydb:flyway-core:$flywayVersion")
    implementation("org.flywaydb:flyway-database-postgresql:$flywayVersion")
    implementation("org.postgresql:postgresql:$postgresVersion")
    implementation("com.h2database:h2:$h2Version")

    // --- Observability ---
    implementation("io.micrometer:micrometer-registry-prometheus:$micrometerVersion")
    implementation("ch.qos.logback:logback-classic:$logbackVersion")
    implementation("net.logstash.logback:logstash-logback-encoder:$logstashEncoderVersion")
    implementation("org.codehaus.janino:janino:3.1.12")
    implementation("io.github.oshai:kotlin-logging-jvm:$kotlinLoggingVersion")

    // --- JSON / YAML ---
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin:$jacksonVersion")
    implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-yaml:$jacksonVersion")

    // --- Validation (Jakarta Bean Validation) ---
    implementation("org.hibernate.validator:hibernate-validator:$hibernateValidatorVersion")
    implementation("org.glassfish.expressly:expressly:$expresslyVersion")

    // --- Google OAuth2 API model (Userinfo) ---
    implementation("com.google.apis:google-api-services-oauth2:$googleOauthApiVersion")

    // --- WireMock stub server (stub-google profile) ---
    implementation("org.wiremock:wiremock-standalone:$wiremockVersion")
    implementation(project(":google-stubs"))

    // --- Test ---
    testImplementation("io.ktor:ktor-server-test-host:$ktorVersion")
    testImplementation("io.ktor:ktor-client-content-negotiation:$ktorVersion")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testImplementation("org.junit.jupiter:junit-jupiter:5.11.4")
    testImplementation("org.assertj:assertj-core:3.27.3")
    testImplementation("io.insert-koin:koin-test:$koinVersion")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

tasks.test {
    useJUnitPlatform {
        excludeTags("smoke")
    }
}

// Build a runnable fat jar (replaces the Spring Boot repackaged jar).
ktor {
    fatJar {
        archiveFileName.set("backend-all.jar")
    }
}

// ---------------------------------------------------------------------------
// Docker packaging (replaces the Maven `build-docker-image` /
// `build-automation-docker-compose-project` profiles and the jib-maven-plugin).
// ---------------------------------------------------------------------------
val dockerRegistry: String = (findProperty("dockerRegistry") as String?) ?: "generaltao725"

// Copy the docker-compose templates next to the build output (was maven-resources-plugin).
val prepareDockerProd by tasks.registering(Copy::class) {
    from("$rootDir/templates/docker") { exclude(".env") }
    into(layout.buildDirectory.dir("docker/prod"))
}

val prepareDockerTest by tasks.registering(Copy::class) {
    from("$rootDir/templates/docker") { exclude(".env") }
    into(layout.buildDirectory.dir("docker/test"))
}

jib {
    from {
        image = "amazoncorretto:17"
    }
    to {
        image = "$dockerRegistry/fullstack-starter-backend:${project.version}"
        tags = setOf("latest")
    }
    container {
        mainClass = "org.example.fullstackstarter.ApplicationKt"
        workingDirectory = "/fullstack-starter"
    }
    extraDirectories {
        paths {
            path {
                setFrom(layout.buildDirectory.dir("docker/prod").get().asFile)
                into = "/docker"
            }
            path {
                setFrom(file("$rootDir/google-stubs/src/main/resources"))
                into = "/app/resources"
            }
        }
    }
}

// jib must see the copied compose templates before assembling the image.
tasks.named("jib") { dependsOn(prepareDockerProd) }
tasks.named("jibDockerBuild") { dependsOn(prepareDockerProd) }
tasks.named("jibBuildTar") { dependsOn(prepareDockerProd) }

// ---------------------------------------------------------------------------
// `/actuator/info` metadata: git.properties (gradle-git-properties plugin) and
// META-INF/build-info.properties (was generated by the Spring Boot Maven plugin).
// ---------------------------------------------------------------------------
gitProperties {
    failOnNoGitDirectory = false
    dotGitDirectory.set(file("$rootDir/.git"))
}

val buildInfoDir = layout.buildDirectory.dir("generated/buildInfo")
val buildInfoGroup = project.group.toString()
val buildInfoVersion = project.version.toString()

val generateBuildInfo by tasks.registering {
    outputs.dir(buildInfoDir)
    doLast {
        val file = buildInfoDir.get().file("META-INF/build-info.properties").asFile
        file.parentFile.mkdirs()
        file.writeText(
            """
            build.artifact=backend
            build.group=$buildInfoGroup
            build.name=backend
            build.version=$buildInfoVersion
            build.time=${Instant.now()}
            """.trimIndent()
        )
    }
}

sourceSets.main {
    resources.srcDir(buildInfoDir)
}

tasks.named("processResources") {
    dependsOn(generateBuildInfo)
}
