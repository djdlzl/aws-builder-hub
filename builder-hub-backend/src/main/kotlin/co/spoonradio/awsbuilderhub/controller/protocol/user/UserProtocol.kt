package co.spoonradio.awsbuilderhub.controller.protocol.user

import jakarta.validation.constraints.NotBlank

data class UpdateRoleRequest(
    @field:NotBlank(message = "Role is required")
    val role: String
)
