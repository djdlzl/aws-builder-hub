package co.spoonradio.awsbuilderhub.domain.sso.entity

import jakarta.persistence.*
import java.time.LocalDateTime

@Entity
@Table(name = "sso_config")
class SsoConfig(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var provider: SsoProvider = SsoProvider.OKTA,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var protocol: SsoProtocol = SsoProtocol.OIDC,

    @Column(nullable = false)
    var enabled: Boolean = false,

    @Column(name = "client_id")
    var clientId: String? = null,

    @Column(name = "client_secret")
    var clientSecret: String? = null,

    @Column(name = "issuer_uri")
    var issuerUri: String? = null,

    @Column(name = "authorization_uri")
    var authorizationUri: String? = null,

    @Column(name = "token_uri")
    var tokenUri: String? = null,

    @Column(name = "user_info_uri")
    var userInfoUri: String? = null,

    @Column(name = "jwks_uri")
    var jwksUri: String? = null,

    // SAML specific fields
    @Column(name = "entity_id")
    var entityId: String? = null,

    @Column(name = "sso_url")
    var ssoUrl: String? = null,

    @Column(name = "certificate", columnDefinition = "TEXT")
    var certificate: String? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime = LocalDateTime.now()
) {
    @PreUpdate
    fun preUpdate() {
        updatedAt = LocalDateTime.now()
    }
}

enum class SsoProvider {
    OKTA,
    AZURE_AD,
    GOOGLE,
    CUSTOM
}

enum class SsoProtocol {
    OIDC,
    SAML
}
