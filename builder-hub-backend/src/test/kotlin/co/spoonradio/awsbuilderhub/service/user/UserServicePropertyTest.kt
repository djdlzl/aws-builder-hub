package co.spoonradio.awsbuilderhub.service.user

import co.spoonradio.awsbuilderhub.domain.user.entity.User
import co.spoonradio.awsbuilderhub.domain.user.entity.UserRole
import co.spoonradio.awsbuilderhub.domain.user.repository.UserRepository
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.property.Arb
import io.kotest.property.arbitrary.*
import io.kotest.property.checkAll
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder

/**
 * Property-based tests for UserService
 * 
 * Feature: auth-and-resource-api
 * 
 * Tests universal properties that should hold across all valid inputs.
 */
class UserServicePropertyTest : DescribeSpec({
    
    val passwordEncoder: PasswordEncoder = BCryptPasswordEncoder()
    
    describe("Property 2: Password Encryption Verification") {
        
        it("Feature: auth-and-resource-api, Property 2: For any 평문 비밀번호, BCrypt 암호화 후 검증 시 true 반환") {
            checkAll<String>(
                Arb.string(minSize = 1, maxSize = 50)
            ) { password: String ->
                // Given - A plain text password
                val encodedPassword = passwordEncoder.encode(password)
                
                // When - Validate the password against the encoded version
                val isValid = passwordEncoder.matches(password, encodedPassword)
                
                // Then - Password validation should return true
                isValid shouldBe true
            }
        }
    }
    
    describe("Property 3: New User Default Role") {
        
        it("Feature: auth-and-resource-api, Property 3: For any 새로 생성된 사용자, 기본 역할은 DEVELOPER") {
            checkAll<String, String>(
                Arb.email(), // Use proper email generator
                Arb.string(minSize = 1, maxSize = 30) // Name
            ) { email: String, name: String ->
                // Given - User creation parameters
                
                // When - Create user without specifying role (should default to DEVELOPER)
                val user = User(
                    email = email,
                    name = name,
                    password = "encoded-password"
                    // role parameter not specified, should default to DEVELOPER
                )
                
                // Then - Role should be DEVELOPER
                user.role shouldBe UserRole.DEVELOPER
            }
        }
    }
})