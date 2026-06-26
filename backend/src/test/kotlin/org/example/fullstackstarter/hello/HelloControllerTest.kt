package org.example.fullstackstarter.hello

import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpStatusCode
import org.assertj.core.api.Assertions.assertThat
import org.example.fullstackstarter.other.ControllerTestsBaseClass
import org.junit.jupiter.api.Test

class HelloControllerTest : ControllerTestsBaseClass() {

    @Test
    fun `root endpoint is publicly accessible`() = withApp {
        val response = client.get("/")
        assertThat(response.status).isEqualTo(HttpStatusCode.OK)
        assertThat(response.bodyAsText()).contains("\"status\":\"ok\"")
    }

    @Test
    fun `hello endpoint requires authentication`() = withApp {
        val response = createClient { followRedirects = false }.get("/hello")
        assertThat(response.status).isEqualTo(HttpStatusCode.Unauthorized)
    }

    @Test
    fun `hello endpoint returns greeting for authenticated user`() = withApp {
        val sessionCookie = authorizeOAuth2()

        val response = client.get("/hello") {
            header("Cookie", "$sessionCookieName=$sessionCookie")
        }

        assertThat(response.status).isEqualTo(HttpStatusCode.OK)
        val body = response.bodyAsText()
        assertThat(body).contains("Hello, Test User!")
        assertThat(body).contains("test@example.com")
    }
}
