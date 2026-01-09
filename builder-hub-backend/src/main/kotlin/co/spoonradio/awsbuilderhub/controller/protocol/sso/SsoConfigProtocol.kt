package co.spoonradio.awsbuilderhub.controller.protocol.sso

import co.spoonradio.awsbuilderhub.domain.sso.entity.SsoConfig
import co.spoonradio.awsbuilderhub.domain.sso.entity.SsoProtocol
import co.spoonradio.awsbuilderhub.domain.sso.entity.SsoProvider
import co.spoonradio.awsbuilderhub.service.sso.SsoConnectionTestResult
import jakarta.validation.constraints.NotNull
import java.time.LocalDateTime

data class CreateSsoConfigRequest(
    @field:NotNull(message = "Provider is required")
    val provider: SsoProvider,

    @field:NotNull(message = "Protocol is required")
    val protocol: SsoProtocol,

    val enabled: Boolean = false,

    // OIDC fields
    val clientId: String? = null,
    val clientSecret: String? = null,
    val issuerUri: String? = null,
    val authorizationUri: String? = null,
    val tokenUri: String? = null,
    val userInfoUri: String? = null,
    val jwksUri: String? = null,

    // SAML fields
    val entityId: String? = null,
    val ssoUrl: String? = null,
    val certificate: String? = null
)

data class UpdateSsoConfigRequest(
    val provider: SsoProvider? = null,
    val protocol: SsoProtocol? = null,
    val enabled: Boolean? = null,

    // OIDC fields
    val clientId: String? = null,
    val clientSecret: String? = null,
    val issuerUri: String? = null,
    val authorizationUri: String? = null,
    val tokenUri: String? = null,
    val userInfoUri: String? = null,
    val jwksUri: String? = null,

    // SAML fields
    val entityId: String? = null,
    val ssoUrl: String? = null,
    val certificate: String? = null
)

data class SsoConfigResponse(
    val id: Long,
    val provider: String,
    val protocol: String,
    val enabled: Boolean,
    val clientId: String?,
    val issuerUri: String?,
    val authorizationUri: String?,
    val tokenUri: String?,
    val userInfoUri: String?,
    val jwksUri: String?,
    val entityId: String?,
    val ssoUrl: String?,
    val hasCertificate: Boolean,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime
) {
    companion object {
        fun from(config: SsoConfig): SsoConfigResponse {
            return SsoConfigResponse(
                id = config.id,
                provider = config.provider.name,
                protocol = config.protocol.name,
                enabled = config.enabled,
                clientId = config.clientId,
                issuerUri = config.issuerUri,
                authorizationUri = config.authorizationUri,
                tokenUri = config.tokenUri,
                userInfoUri = config.userInfoUri,
                jwksUri = config.jwksUri,
                entityId = config.entityId,
                ssoUrl = config.ssoUrl,
                hasCertificate = !config.certificate.isNullOrBlank(),
                createdAt = config.createdAt,
                updatedAt = config.updatedAt
            )
        }
    }
}

data class SsoStatusResponse(
    val enabled: Boolean,
    val provider: String?,
    val protocol: String?,
    val loginUrl: String?
)

data class SsoTestResponse(
    val success: Boolean,
    val message: String,
    val provider: String,
    val protocol: String
) {
    companion object {
        fun from(result: SsoConnectionTestResult): SsoTestResponse {
            return SsoTestResponse(
                success = result.success,
                message = result.message,
                provider = result.provider,
                protocol = result.protocol
            )
        }
    }
}
