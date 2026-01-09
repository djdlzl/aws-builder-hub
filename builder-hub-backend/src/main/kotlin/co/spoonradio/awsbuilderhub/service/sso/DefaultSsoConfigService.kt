package co.spoonradio.awsbuilderhub.service.sso

import co.spoonradio.awsbuilderhub.domain.sso.entity.SsoConfig
import co.spoonradio.awsbuilderhub.domain.sso.entity.SsoProtocol
import co.spoonradio.awsbuilderhub.domain.sso.entity.SsoProvider
import co.spoonradio.awsbuilderhub.domain.sso.repository.SsoConfigRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class DefaultSsoConfigService(
    private val ssoConfigRepository: SsoConfigRepository
) : SsoConfigService {
    private val logger = LoggerFactory.getLogger(DefaultSsoConfigService::class.java)

    override fun getConfig(): SsoConfig? {
        return ssoConfigRepository.findByEnabledTrue().orElse(null)
    }

    override fun getConfigById(id: Long): SsoConfig? {
        return ssoConfigRepository.findById(id).orElse(null)
    }

    override fun getAllConfigs(): List<SsoConfig> {
        return ssoConfigRepository.findAll()
    }

    override fun isSsoEnabled(): Boolean {
        return ssoConfigRepository.existsByEnabledTrue()
    }

    @Transactional
    override fun createOrUpdateConfig(
        provider: SsoProvider,
        protocol: SsoProtocol,
        enabled: Boolean,
        clientId: String?,
        clientSecret: String?,
        issuerUri: String?,
        authorizationUri: String?,
        tokenUri: String?,
        userInfoUri: String?,
        jwksUri: String?,
        entityId: String?,
        ssoUrl: String?,
        certificate: String?
    ): SsoConfig {
        val existingConfig = ssoConfigRepository.findByProvider(provider).orElse(null)

        val config = existingConfig ?: SsoConfig(provider = provider)

        config.apply {
            this.protocol = protocol
            this.enabled = enabled
            this.clientId = clientId
            this.clientSecret = clientSecret
            this.issuerUri = issuerUri
            this.authorizationUri = authorizationUri
            this.tokenUri = tokenUri
            this.userInfoUri = userInfoUri
            this.jwksUri = jwksUri
            this.entityId = entityId
            this.ssoUrl = ssoUrl
            this.certificate = certificate
        }

        // Disable other configs if this one is being enabled
        if (enabled) {
            ssoConfigRepository.findAll().forEach { other ->
                if (other.id != config.id && other.enabled) {
                    other.enabled = false
                    ssoConfigRepository.save(other)
                }
            }
        }

        val savedConfig = ssoConfigRepository.save(config)
        logger.info("SSO config saved: provider={}, protocol={}, enabled={}", provider, protocol, enabled)

        return savedConfig
    }

    @Transactional
    override fun enableConfig(id: Long): SsoConfig {
        val config = ssoConfigRepository.findById(id)
            .orElseThrow { IllegalArgumentException("SSO config not found: $id") }

        // Disable all other configs
        ssoConfigRepository.findAll().forEach { other ->
            if (other.id != id && other.enabled) {
                other.enabled = false
                ssoConfigRepository.save(other)
            }
        }

        config.enabled = true
        return ssoConfigRepository.save(config)
    }

    @Transactional
    override fun disableConfig(id: Long): SsoConfig {
        val config = ssoConfigRepository.findById(id)
            .orElseThrow { IllegalArgumentException("SSO config not found: $id") }

        config.enabled = false
        return ssoConfigRepository.save(config)
    }

    @Transactional
    override fun deleteConfig(id: Long) {
        ssoConfigRepository.deleteById(id)
        logger.info("SSO config deleted: id={}", id)
    }

    override fun testConnection(id: Long): SsoConnectionTestResult {
        val config = ssoConfigRepository.findById(id)
            .orElseThrow { IllegalArgumentException("SSO config not found: $id") }

        return try {
            // Basic validation
            when (config.protocol) {
                SsoProtocol.OIDC -> {
                    requireNotNull(config.clientId) { "Client ID is required for OIDC" }
                    requireNotNull(config.clientSecret) { "Client Secret is required for OIDC" }
                    requireNotNull(config.issuerUri) { "Issuer URI is required for OIDC" }
                }
                SsoProtocol.SAML -> {
                    requireNotNull(config.entityId) { "Entity ID is required for SAML" }
                    requireNotNull(config.ssoUrl) { "SSO URL is required for SAML" }
                    requireNotNull(config.certificate) { "Certificate is required for SAML" }
                }
            }

            SsoConnectionTestResult(
                success = true,
                message = "Configuration is valid. Ready to connect.",
                provider = config.provider.name,
                protocol = config.protocol.name
            )
        } catch (e: Exception) {
            SsoConnectionTestResult(
                success = false,
                message = e.message ?: "Configuration validation failed",
                provider = config.provider.name,
                protocol = config.protocol.name
            )
        }
    }
}
