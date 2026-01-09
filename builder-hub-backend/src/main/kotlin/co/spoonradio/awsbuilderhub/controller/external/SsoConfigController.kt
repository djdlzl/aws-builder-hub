package co.spoonradio.awsbuilderhub.controller.external

import co.spoonradio.awsbuilderhub.controller.protocol.common.SuccessListResponse
import co.spoonradio.awsbuilderhub.controller.protocol.common.SuccessResponse
import co.spoonradio.awsbuilderhub.controller.protocol.common.toSuccessListResponse
import co.spoonradio.awsbuilderhub.controller.protocol.common.toSuccessResponse
import co.spoonradio.awsbuilderhub.controller.protocol.sso.*
import co.spoonradio.awsbuilderhub.service.sso.SsoConfigService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/sso")
@Tag(name = "SSO Configuration", description = "SSO/IdP configuration management APIs")
class SsoConfigController(
    private val ssoConfigService: SsoConfigService
) {

    @GetMapping("/status")
    @Operation(summary = "Get SSO status", description = "Check if SSO is enabled and get basic info (public)")
    fun getSsoStatus(): ResponseEntity<SuccessResponse<SsoStatusResponse>> {
        val config = ssoConfigService.getConfig()
        val response = if (config != null && config.enabled) {
            SsoStatusResponse(
                enabled = true,
                provider = config.provider.name,
                protocol = config.protocol.name,
                loginUrl = "/oauth2/authorization/dynamic-sso"
            )
        } else {
            SsoStatusResponse(
                enabled = false,
                provider = null,
                protocol = null,
                loginUrl = null
            )
        }
        return ResponseEntity.ok(response.toSuccessResponse())
    }

    @GetMapping("/configs")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get all SSO configurations", description = "Admin only")
    fun getAllConfigs(): ResponseEntity<SuccessListResponse<List<SsoConfigResponse>>> {
        val configs = ssoConfigService.getAllConfigs()
        return ResponseEntity.ok(configs.map { SsoConfigResponse.from(it) }.toSuccessListResponse())
    }

    @GetMapping("/configs/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get SSO configuration by ID", description = "Admin only")
    fun getConfigById(@PathVariable id: Long): ResponseEntity<SuccessResponse<SsoConfigResponse>> {
        val config = ssoConfigService.getConfigById(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(SsoConfigResponse.from(config).toSuccessResponse())
    }

    @PostMapping("/configs")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create SSO configuration", description = "Admin only")
    fun createConfig(@Valid @RequestBody request: CreateSsoConfigRequest): ResponseEntity<SuccessResponse<SsoConfigResponse>> {
        val config = ssoConfigService.createOrUpdateConfig(
            provider = request.provider,
            protocol = request.protocol,
            enabled = request.enabled,
            clientId = request.clientId,
            clientSecret = request.clientSecret,
            issuerUri = request.issuerUri,
            authorizationUri = request.authorizationUri,
            tokenUri = request.tokenUri,
            userInfoUri = request.userInfoUri,
            jwksUri = request.jwksUri,
            entityId = request.entityId,
            ssoUrl = request.ssoUrl,
            certificate = request.certificate
        )
        return ResponseEntity.ok(SsoConfigResponse.from(config).toSuccessResponse())
    }

    @PutMapping("/configs/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update SSO configuration", description = "Admin only")
    fun updateConfig(
        @PathVariable id: Long,
        @Valid @RequestBody request: UpdateSsoConfigRequest
    ): ResponseEntity<SuccessResponse<SsoConfigResponse>> {
        val existing = ssoConfigService.getConfigById(id)
            ?: return ResponseEntity.notFound().build()

        val config = ssoConfigService.createOrUpdateConfig(
            provider = request.provider ?: existing.provider,
            protocol = request.protocol ?: existing.protocol,
            enabled = request.enabled ?: existing.enabled,
            clientId = request.clientId ?: existing.clientId,
            clientSecret = request.clientSecret ?: existing.clientSecret,
            issuerUri = request.issuerUri ?: existing.issuerUri,
            authorizationUri = request.authorizationUri ?: existing.authorizationUri,
            tokenUri = request.tokenUri ?: existing.tokenUri,
            userInfoUri = request.userInfoUri ?: existing.userInfoUri,
            jwksUri = request.jwksUri ?: existing.jwksUri,
            entityId = request.entityId ?: existing.entityId,
            ssoUrl = request.ssoUrl ?: existing.ssoUrl,
            certificate = request.certificate ?: existing.certificate
        )
        return ResponseEntity.ok(SsoConfigResponse.from(config).toSuccessResponse())
    }

    @PostMapping("/configs/{id}/enable")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Enable SSO configuration", description = "Admin only - disables other configs")
    fun enableConfig(@PathVariable id: Long): ResponseEntity<SuccessResponse<SsoConfigResponse>> {
        val config = ssoConfigService.enableConfig(id)
        return ResponseEntity.ok(SsoConfigResponse.from(config).toSuccessResponse())
    }

    @PostMapping("/configs/{id}/disable")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Disable SSO configuration", description = "Admin only")
    fun disableConfig(@PathVariable id: Long): ResponseEntity<SuccessResponse<SsoConfigResponse>> {
        val config = ssoConfigService.disableConfig(id)
        return ResponseEntity.ok(SsoConfigResponse.from(config).toSuccessResponse())
    }

    @DeleteMapping("/configs/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete SSO configuration", description = "Admin only")
    fun deleteConfig(@PathVariable id: Long): ResponseEntity<Void> {
        ssoConfigService.deleteConfig(id)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/configs/{id}/test")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Test SSO configuration", description = "Admin only - validates configuration")
    fun testConfig(@PathVariable id: Long): ResponseEntity<SuccessResponse<SsoTestResponse>> {
        val result = ssoConfigService.testConnection(id)
        return ResponseEntity.ok(SsoTestResponse.from(result).toSuccessResponse())
    }
}
