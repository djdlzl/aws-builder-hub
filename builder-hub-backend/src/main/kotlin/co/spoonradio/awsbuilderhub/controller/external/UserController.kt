package co.spoonradio.awsbuilderhub.controller.external

import co.spoonradio.awsbuilderhub.controller.protocol.auth.UserResponse
import co.spoonradio.awsbuilderhub.controller.protocol.common.SuccessListResponse
import co.spoonradio.awsbuilderhub.controller.protocol.common.SuccessResponse
import co.spoonradio.awsbuilderhub.controller.protocol.common.toSuccessListResponse
import co.spoonradio.awsbuilderhub.controller.protocol.common.toSuccessResponse
import co.spoonradio.awsbuilderhub.controller.protocol.user.UpdateRoleRequest
import co.spoonradio.awsbuilderhub.domain.user.entity.UserRole
import co.spoonradio.awsbuilderhub.security.UserPrincipal
import co.spoonradio.awsbuilderhub.service.user.UserService
import jakarta.validation.Valid
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/users")
class UserController(
    private val userService: UserService
) {
    private val logger = LoggerFactory.getLogger(UserController::class.java)

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    fun getAllUsers(): ResponseEntity<SuccessListResponse<List<UserResponse>>> {
        val users = userService.findAll()
        return ResponseEntity.ok(users.map { 
            UserResponse(
                id = it.id,
                email = it.email,
                name = it.name,
                role = it.role.name
            )
        }.toSuccessListResponse())
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.userId")
    fun getUser(@PathVariable id: Long): ResponseEntity<SuccessResponse<UserResponse>> {
        val user = userService.findById(id)
            ?: return ResponseEntity.notFound().build()

        return ResponseEntity.ok(
            UserResponse(
                id = user.id,
                email = user.email,
                name = user.name,
                role = user.role.name
            ).toSuccessResponse()
        )
    }

    @PutMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    fun updateUserRole(
        @PathVariable id: Long,
        @Valid @RequestBody request: UpdateRoleRequest
    ): ResponseEntity<SuccessResponse<UserResponse>> {
        logger.info("Updating role for user {} to {}", id, request.role)
        
        return try {
            val role = UserRole.valueOf(request.role.uppercase())
            val user = userService.updateUserRole(id, role)
            
            ResponseEntity.ok(
                UserResponse(
                    id = user.id,
                    email = user.email,
                    name = user.name,
                    role = user.role.name
                ).toSuccessResponse()
            )
        } catch (e: IllegalArgumentException) {
            logger.warn("Failed to update user role: {}", e.message)
            ResponseEntity.badRequest().build()
        }
    }

    @PostMapping("/{id}/disable")
    @PreAuthorize("hasRole('ADMIN')")
    fun disableUser(@PathVariable id: Long): ResponseEntity<SuccessResponse<UserResponse>> {
        logger.info("Disabling user: {}", id)
        
        return try {
            val user = userService.disableUser(id)
            ResponseEntity.ok(
                UserResponse(
                    id = user.id,
                    email = user.email,
                    name = user.name,
                    role = user.role.name
                ).toSuccessResponse()
            )
        } catch (e: IllegalArgumentException) {
            logger.warn("Failed to disable user: {}", e.message)
            ResponseEntity.notFound().build()
        }
    }
}
