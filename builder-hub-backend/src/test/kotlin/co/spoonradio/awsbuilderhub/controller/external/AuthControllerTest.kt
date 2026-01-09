package co.spoonradio.awsbuilderhub.controller.external

import co.spoonradio.awsbuilderhub.config.TestSecurityConfig
import co.spoonradio.awsbuilderhub.controller.protocol.auth.AuthResponse
import co.spoonradio.awsbuilderhub.controller.protocol.auth.LoginRequest
import co.spoonradio.awsbuilderhub.controller.protocol.auth.RegisterRequest
import co.spoonradio.awsbuilderhub.controller.protocol.auth.UserResponse
import co.spoonradio.awsbuilderhub.controller.protocol.common.SuccessResponse
import co.spoonradio.awsbuilderhub.domain.user.entity.UserRole
import co.spoonradio.awsbuilderhub.security.JwtTokenProvider
import co.spoonradio.awsbuilderhub.security.UserPrincipal
import co.spoonradio.awsbuilderhub.service.user.UserService
import com.fasterxml.jackson.databind.ObjectMapper
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldNotBeEmpty
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import org.mockito.Mockito.`when`
import org.mockito.ArgumentMatchers.any
import org.mockito.ArgumentMatchers.eq
import co.spoonradio.awsbuilderhub.domain.user.entity.User
import java.time.LocalDateTime

/**
 * Integration tests for AuthController
 * 
 * Feature: auth-and-resource-api
 * Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 4.1, 4.2
 * 
 * Tests login, registration, and current user retrieval endpoints.
 */
@WebMvcTest(AuthController::class)
@Import(TestSecurityConfig::class)
@ActiveProfiles("test")
class AuthControllerTest : DescribeSpec() {
    
    @Autowired
    private lateinit var mockMvc: MockMvc
    
    @MockBean
    private lateinit var userService: UserService
    
    @MockBean
    private lateinit var jwtTokenProvider: JwtTokenProvider
    
    @MockBean
    private lateinit var userRepository: co.spoonradio.awsbuilderhub.domain.user.repository.UserRepository
    
    @Autowired
    private lateinit var objectMapper: ObjectMapper
    
    init {
        describe("POST /api/v1/auth/login") {
            
            it("should return JWT token for valid credentials") {
                // Given - Mock user and token provider
                val email = "login-test@example.com"
                val password = "password123"
                val name = "Login Test User"
                val user = User(
                    id = 1L,
                    email = email,
                    name = name,
                    password = "encoded-password",
                    role = UserRole.DEVELOPER,
                    enabled = true,
                    createdAt = LocalDateTime.now(),
                    updatedAt = LocalDateTime.now()
                )
                val token = "mock-jwt-token"
                
                `when`(userService.findByEmail(email)).thenReturn(user)
                `when`(userService.validatePassword(user, password)).thenReturn(true)
                `when`(jwtTokenProvider.generateToken(user.id, user.email, user.role.name)).thenReturn(token)
                
                val loginRequest = LoginRequest(
                    username = email,
                    password = password
                )
                
                // When & Then
                mockMvc.perform(
                    post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest))
                )
                    .andExpect(status().isOk)
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.result.accessToken").value(token))
                    .andExpect(jsonPath("$.result.expiresIn").value(86400))
                    .andExpect(jsonPath("$.result.user.id").value(user.id))
                    .andExpect(jsonPath("$.result.user.email").value(email))
                    .andExpect(jsonPath("$.result.user.name").value(name))
                    .andExpect(jsonPath("$.result.user.role").value("DEVELOPER"))
            }
            
            it("should return 401 for non-existent user") {
                // Given
                val email = "nonexistent@example.com"
                `when`(userService.findByEmail(email)).thenReturn(null)
                
                val loginRequest = LoginRequest(
                    username = email,
                    password = "password123"
                )
                
                // When & Then
                mockMvc.perform(
                    post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest))
                )
                    .andExpect(status().isUnauthorized)
            }
            
            it("should return 401 for incorrect password") {
                // Given
                val email = "wrong-password@example.com"
                val password = "correctpassword"
                val wrongPassword = "wrongpassword"
                val user = User(
                    id = 1L,
                    email = email,
                    name = "Test User",
                    password = "encoded-password",
                    role = UserRole.DEVELOPER,
                    enabled = true,
                    createdAt = LocalDateTime.now(),
                    updatedAt = LocalDateTime.now()
                )
                
                `when`(userService.findByEmail(email)).thenReturn(user)
                `when`(userService.validatePassword(user, wrongPassword)).thenReturn(false)
                
                val loginRequest = LoginRequest(
                    username = email,
                    password = wrongPassword
                )
                
                // When & Then
                mockMvc.perform(
                    post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest))
                )
                    .andExpect(status().isUnauthorized)
            }
            
            it("should return 401 for disabled user") {
                // Given
                val email = "disabled-user@example.com"
                val password = "password123"
                val user = User(
                    id = 1L,
                    email = email,
                    name = "Disabled User",
                    password = "encoded-password",
                    role = UserRole.DEVELOPER,
                    enabled = false,
                    createdAt = LocalDateTime.now(),
                    updatedAt = LocalDateTime.now()
                )
                
                `when`(userService.findByEmail(email)).thenReturn(user)
                
                val loginRequest = LoginRequest(
                    username = email,
                    password = password
                )
                
                // When & Then
                mockMvc.perform(
                    post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest))
                )
                    .andExpect(status().isUnauthorized)
            }
            
            it("should return 400 for invalid request body") {
                // Given
                val invalidRequest = """{"username": "", "password": ""}"""
                
                // When & Then
                mockMvc.perform(
                    post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidRequest)
                )
                    .andExpect(status().isBadRequest)
            }
        }
        
        describe("POST /api/v1/auth/register") {
            
            it("should create new user and return JWT token") {
                // Given
                val registerRequest = RegisterRequest(
                    email = "register-test@example.com",
                    name = "Register Test User",
                    password = "password123"
                )
                
                val user = User(
                    id = 1L,
                    email = registerRequest.email,
                    name = registerRequest.name,
                    password = "encoded-password",
                    role = UserRole.DEVELOPER,
                    enabled = true,
                    createdAt = LocalDateTime.now(),
                    updatedAt = LocalDateTime.now()
                )
                val token = "mock-jwt-token"
                
                `when`(userService.createUser(
                    registerRequest.email,
                    registerRequest.name,
                    registerRequest.password,
                    UserRole.DEVELOPER
                )).thenReturn(user)
                `when`(jwtTokenProvider.generateToken(user.id, user.email, user.role.name)).thenReturn(token)
                
                // When & Then
                mockMvc.perform(
                    post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest))
                )
                    .andExpect(status().isCreated)
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.result.accessToken").value(token))
                    .andExpect(jsonPath("$.result.expiresIn").value(86400))
                    .andExpect(jsonPath("$.result.user.email").value(registerRequest.email))
                    .andExpect(jsonPath("$.result.user.name").value(registerRequest.name))
                    .andExpect(jsonPath("$.result.user.role").value("DEVELOPER"))
            }
            
            it("should return 409 for duplicate email") {
                // Given
                val registerRequest = RegisterRequest(
                    email = "duplicate@example.com",
                    name = "Duplicate User",
                    password = "differentpassword"
                )
                
                `when`(userService.createUser(
                    registerRequest.email,
                    registerRequest.name,
                    registerRequest.password,
                    UserRole.DEVELOPER
                )).thenThrow(IllegalArgumentException("User with email ${registerRequest.email} already exists"))
                
                // When & Then
                mockMvc.perform(
                    post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest))
                )
                    .andExpect(status().isConflict)
            }
            
            it("should return 400 for invalid request body") {
                // Given
                val invalidRequest = """{"email": "", "name": "", "password": ""}"""
                
                // When & Then
                mockMvc.perform(
                    post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidRequest)
                )
                    .andExpect(status().isBadRequest)
            }
        }
        
        describe("GET /api/v1/auth/me") {
            
            it("should return current user information for authenticated user") {
                // Given
                val email = "me-test@example.com"
                val name = "Me Test User"
                val user = User(
                    id = 1L,
                    email = email,
                    name = name,
                    password = "encoded-password",
                    role = UserRole.ADMIN,
                    enabled = true,
                    createdAt = LocalDateTime.now(),
                    updatedAt = LocalDateTime.now()
                )
                
                `when`(userService.findById(user.id)).thenReturn(user)
                
                // Create authentication token
                val principal = UserPrincipal(
                    userId = user.id,
                    email = user.email,
                    role = user.role.name
                )
                val authentication = UsernamePasswordAuthenticationToken(principal, null, emptyList())
                SecurityContextHolder.getContext().authentication = authentication
                
                // When & Then
                mockMvc.perform(
                    get("/api/v1/auth/me")
                        .contentType(MediaType.APPLICATION_JSON)
                )
                    .andExpect(status().isOk)
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.result.id").value(user.id))
                    .andExpect(jsonPath("$.result.email").value(email))
                    .andExpect(jsonPath("$.result.name").value(name))
                    .andExpect(jsonPath("$.result.role").value("ADMIN"))
            }
            
            it("should return 404 when authenticated user not found in database") {
                // Given
                val userId = 999999L
                `when`(userService.findById(userId)).thenReturn(null)
                
                val principal = UserPrincipal(
                    userId = userId,
                    email = "nonexistent@example.com",
                    role = "DEVELOPER"
                )
                val authentication = UsernamePasswordAuthenticationToken(principal, null, emptyList())
                SecurityContextHolder.getContext().authentication = authentication
                
                // When & Then
                mockMvc.perform(
                    get("/api/v1/auth/me")
                        .contentType(MediaType.APPLICATION_JSON)
                )
                    .andExpect(status().isNotFound)
            }
        }
        
        afterEach {
            // Clean up security context
            SecurityContextHolder.clearContext()
        }
    }
}