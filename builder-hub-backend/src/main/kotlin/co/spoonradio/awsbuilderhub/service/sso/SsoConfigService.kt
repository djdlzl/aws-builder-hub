package co.spoonradio.awsbuilderhub.service.sso

import co.spoonradio.awsbuilderhub.domain.sso.entity.SsoConfig
import co.spoonradio.awsbuilderhub.domain.sso.entity.SsoProtocol
import co.spoonradio.awsbuilderhub.domain.sso.entity.SsoProvider

interface SsoConfigService {
    fun getConfig(): SsoConfig?
    fun getConfigById(id: Long): SsoConfig?
    fun getAllConfigs(): List<SsoConfig>
    fun isSsoEnabled(): Boolean
    fun createOrUpdateConfig(
        provider: SsoProvider,
        protocol: SsoProtocol,
        enabled: Boolean,
        clientId: String?,
        clientSecret: String?,
        issuerUri: String?,
        authorizationUri: String? = null,
        tokenUri: String? = null,
        userInfoUri: String? = null,
        jwksUri: String? = null,
        entityId: String? = null,
        ssoUrl: String? = null,
        certificate: String? = null
    ): SsoConfig
    fun enableConfig(id: Long): SsoConfig
    fun disableConfig(id: Long): SsoConfig
    fun deleteConfig(id: Long)
    fun testConnection(id: Long): SsoConnectionTestResult
}

data class SsoConnectionTestResult(
    val success: Boolean,
    val message: String,
    val provider: String,
    val protocol: String
)
