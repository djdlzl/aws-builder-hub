package co.spoonradio.awsbuilderhub.service.user

import co.spoonradio.awsbuilderhub.domain.user.entity.User
import co.spoonradio.awsbuilderhub.domain.user.entity.UserRole
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldNotBeEmpty
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional

/**
 * Unit tests for UserService
 * 
 * Feature: auth-and-resource-api
 * Requirements: 3.1, 3.2
 * 
 * Tests user creation, lookup, and password verification functionality.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class UserServiceTest : DescribeSpec() {
    
    @Autowired
    private lateinit var userService: UserService
    
    init {
        describe("User Creation") {
            
            it("should create a new user with default role") {
                // Given
                val email = "test-create@example.com"
                val name = "Test User"
                val password = "password123"
                
                // When
                val user = userService.createUser(email, name, password)
                
                // Then
                user.email shouldBe email
                user.name shouldBe name
                user.password shouldNotBe null
                user.password shouldNotBe password // Should be encoded
                user.role shouldBe UserRole.DEVELOPER
                user.enabled shouldBe true
                user.id shouldNotBe 0L // Should have been assigned an ID
            }
            
            it("should create a user with specified role") {
                // Given
                val email = "admin-create@example.com"
                val name = "Admin User"
                val password = "admin123"
                val role = UserRole.ADMIN
                
                // When
                val user = userService.createUser(email, name, password, role)
                
                // Then
                user.email shouldBe email
                user.name shouldBe name
                user.password shouldNotBe null
                user.password shouldNotBe password // Should be encoded
                user.role shouldBe role
                user.enabled shouldBe true
            }
            
            it("should create a user without password (OAuth user)") {
                // Given
                val email = "oauth-create@example.com"
                val name = "OAuth User"
                val oktaUserId = "okta-123"
                
                // When
                val user = userService.createUser(email, name, null, UserRole.DEVELOPER, oktaUserId)
                
                // Then
                user.email shouldBe email
                user.name shouldBe name
                user.password shouldBe null
                user.role shouldBe UserRole.DEVELOPER
                user.oktaUserId shouldBe oktaUserId
                user.enabled shouldBe true
            }
            
            it("should throw exception when email already exists") {
                // Given
                val email = "duplicate@example.com"
                val name = "Test User"
                val password = "password123"
                
                // Create first user
                userService.createUser(email, name, password)
                
                // When & Then
                val exception = shouldThrow<IllegalArgumentException> {
                    userService.createUser(email, "Another User", "different-password")
                }
                
                exception.message shouldBe "User with email $email already exists"
            }
        }
        
        describe("User Lookup") {
            
            it("should find user by ID") {
                // Given
                val email = "findbyid@example.com"
                val name = "Find By ID User"
                val createdUser = userService.createUser(email, name, "password123")
                
                // When
                val foundUser = userService.findById(createdUser.id)
                
                // Then
                foundUser shouldNotBe null
                foundUser?.id shouldBe createdUser.id
                foundUser?.email shouldBe email
                foundUser?.name shouldBe name
            }
            
            it("should return null when user not found by ID") {
                // Given
                val nonExistentId = 999999L
                
                // When
                val foundUser = userService.findById(nonExistentId)
                
                // Then
                foundUser shouldBe null
            }
            
            it("should find user by email") {
                // Given
                val email = "findbyemail@example.com"
                val name = "Find By Email User"
                val createdUser = userService.createUser(email, name, "password123")
                
                // When
                val foundUser = userService.findByEmail(email)
                
                // Then
                foundUser shouldNotBe null
                foundUser?.id shouldBe createdUser.id
                foundUser?.email shouldBe email
                foundUser?.name shouldBe name
            }
            
            it("should return null when user not found by email") {
                // Given
                val nonExistentEmail = "nonexistent@example.com"
                
                // When
                val foundUser = userService.findByEmail(nonExistentEmail)
                
                // Then
                foundUser shouldBe null
            }
            
            it("should find user by Okta user ID") {
                // Given
                val email = "okta-find@example.com"
                val name = "Okta User"
                val oktaUserId = "okta-find-123"
                val createdUser = userService.createUser(email, name, null, UserRole.DEVELOPER, oktaUserId)
                
                // When
                val foundUser = userService.findByOktaUserId(oktaUserId)
                
                // Then
                foundUser shouldNotBe null
                foundUser?.id shouldBe createdUser.id
                foundUser?.oktaUserId shouldBe oktaUserId
                foundUser?.email shouldBe email
            }
            
            it("should return all users") {
                // Given - Create a few users
                val user1 = userService.createUser("user1-all@example.com", "User 1", "password1")
                val user2 = userService.createUser("user2-all@example.com", "User 2", "password2")
                
                // When
                val allUsers = userService.findAll()
                
                // Then
                (allUsers.size >= 2) shouldBe true // At least the two we created
                val emails = allUsers.map { it.email }
                emails.contains("user1-all@example.com") shouldBe true
                emails.contains("user2-all@example.com") shouldBe true
            }
        }
        
        describe("Password Verification") {
            
            it("should validate correct password") {
                // Given
                val email = "password-test@example.com"
                val name = "Password Test User"
                val rawPassword = "password123"
                val user = userService.createUser(email, name, rawPassword)
                
                // When
                val isValid = userService.validatePassword(user, rawPassword)
                
                // Then
                isValid shouldBe true
            }
            
            it("should reject incorrect password") {
                // Given
                val email = "password-wrong@example.com"
                val name = "Password Wrong User"
                val rawPassword = "password123"
                val wrongPassword = "wrongpassword"
                val user = userService.createUser(email, name, rawPassword)
                
                // When
                val isValid = userService.validatePassword(user, wrongPassword)
                
                // Then
                isValid shouldBe false
            }
            
            it("should return false for user without password") {
                // Given
                val email = "no-password@example.com"
                val name = "No Password User"
                val user = userService.createUser(email, name, null, UserRole.DEVELOPER, "okta-123")
                
                // When
                val isValid = userService.validatePassword(user, "anypassword")
                
                // Then
                isValid shouldBe false
            }
        }
        
        describe("User Management") {
            
            it("should update user role") {
                // Given
                val email = "role-update@example.com"
                val name = "Role Update User"
                val user = userService.createUser(email, name, "password123")
                val newRole = UserRole.ADMIN
                
                // When
                val updatedUser = userService.updateUserRole(user.id, newRole)
                
                // Then
                updatedUser.role shouldBe newRole
                updatedUser.id shouldBe user.id
                
                // Verify the change persisted
                val foundUser = userService.findById(user.id)
                foundUser?.role shouldBe newRole
            }
            
            it("should throw exception when updating role of non-existent user") {
                // Given
                val nonExistentId = 999999L
                val newRole = UserRole.ADMIN
                
                // When & Then
                val exception = shouldThrow<IllegalArgumentException> {
                    userService.updateUserRole(nonExistentId, newRole)
                }
                
                exception.message shouldBe "User not found with id: $nonExistentId"
            }
            
            it("should disable user") {
                // Given
                val email = "disable-test@example.com"
                val name = "Disable Test User"
                val user = userService.createUser(email, name, "password123")
                
                // When
                val disabledUser = userService.disableUser(user.id)
                
                // Then
                disabledUser.enabled shouldBe false
                disabledUser.id shouldBe user.id
                
                // Verify the change persisted
                val foundUser = userService.findById(user.id)
                foundUser?.enabled shouldBe false
            }
            
            it("should throw exception when disabling non-existent user") {
                // Given
                val nonExistentId = 999999L
                
                // When & Then
                val exception = shouldThrow<IllegalArgumentException> {
                    userService.disableUser(nonExistentId)
                }
                
                exception.message shouldBe "User not found with id: $nonExistentId"
            }
        }
    }
}