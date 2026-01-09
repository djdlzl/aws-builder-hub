package co.spoonradio.awsbuilderhub.controller.external

import co.spoonradio.awsbuilderhub.controller.protocol.auth.*
import co.spoonradio.awsbuilderhub.controller.protocol.common.SuccessResponse
import co.spoonradio.awsbuilderhub.controller.protocol.common.toSuccessResponse
import co.spoonradio.awsbuilderhub.domain.user.entity.UserRole
import co.spoonradio.awsbuilderhub.security.JwtTokenProvider
import co.spoonradio.awsbuilderhub.security.UserPrincipal
import co.spoonradio.awsbuilderhub.service.user.UserService
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.core.user.OAuth2User
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/auth")
class AuthController(
    private val userService: UserService,
    private val jwtTokenProvider: JwtTokenProvider
) {
    private val logger = LoggerFactory.getLogger(AuthController::class.java)

    @PostMapping("/login")
    fun login(@Valid @RequestBody request: LoginRequest): ResponseEntity<SuccessResponse<AuthResponse>> {
        logger.debug("Login attempt for user: {}", request.username)
        
        val user = userService.findByEmail(request.username)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        if (!user.enabled) {
            logger.warn("Login attempt for disabled user: {}", request.username)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        }

        if (!userService.validatePassword(user, request.password)) {
            logger.warn("Invalid password for user: {}", request.username)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        }

        val token = jwtTokenProvider.generateToken(user.id, user.email, user.role.name)
        
        logger.info("User logged in successfully: {}", request.username)
        
        return ResponseEntity.ok(
            AuthResponse(
                accessToken = token,
                expiresIn = 86400,
                user = UserResponse(
                    id = user.id,
                    email = user.email,
                    name = user.name,
                    role = user.role.name
                )
            ).toSuccessResponse()
        )
    }

    @PostMapping("/register")
    fun register(@Valid @RequestBody request: RegisterRequest): ResponseEntity<SuccessResponse<AuthResponse>> {
        logger.debug("Registration attempt for email: {}", request.email)
        
        try {
            val user = userService.createUser(
                email = request.email,
                name = request.name,
                password = request.password,
                role = UserRole.DEVELOPER
            )

            val token = jwtTokenProvider.generateToken(user.id, user.email, user.role.name)
            
            logger.info("User registered successfully: {}", request.email)

            return ResponseEntity.status(HttpStatus.CREATED).body(
                AuthResponse(
                    accessToken = token,
                    expiresIn = 86400,
                    user = UserResponse(
                        id = user.id,
                        email = user.email,
                        name = user.name,
                        role = user.role.name
                    )
                ).toSuccessResponse()
            )
        } catch (e: IllegalArgumentException) {
            logger.warn("Registration failed: {}", e.message)
            return ResponseEntity.status(HttpStatus.CONFLICT).build()
        }
    }

    @GetMapping("/me")
    fun getCurrentUser(@AuthenticationPrincipal principal: UserPrincipal): ResponseEntity<SuccessResponse<UserResponse>> {
        val user = userService.findById(principal.userId)
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

    @GetMapping("/oauth2/success")
    fun oauth2Success(
        @AuthenticationPrincipal oauth2User: OAuth2User,
        response: HttpServletResponse
    ): ResponseEntity<SuccessResponse<OAuth2SuccessResponse>> {
        val email = oauth2User.attributes["email"] as? String
            ?: return ResponseEntity.badRequest().build()
        
        val user = userService.findByEmail(email)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        val token = jwtTokenProvider.generateToken(user.id, user.email, user.role.name)
        
        logger.info("OAuth2 login successful for user: {}", email)

        return ResponseEntity.ok(
            OAuth2SuccessResponse(
                message = "Login successful",
                accessToken = token,
                user = UserResponse(
                    id = user.id,
                    email = user.email,
                    name = user.name,
                    role = user.role.name
                )
            ).toSuccessResponse()
        )
    }

    @GetMapping("/oauth2/failure")
    fun oauth2Failure(): ResponseEntity<Map<String, String>> {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(mapOf("error" to "OAuth2 authentication failed"))
    }
}
