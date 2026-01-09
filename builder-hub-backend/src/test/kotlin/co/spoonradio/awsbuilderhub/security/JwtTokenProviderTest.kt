package co.spoonradio.awsbuilderhub.security

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldNotBeEmpty
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles

/**
 * Unit tests for JwtTokenProvider
 * 
 * Feature: auth-and-resource-api
 * Requirements: 2.1, 2.2, 2.3
 * 
 * Tests token generation, validation, and claim extraction functionality.
 */
@SpringBootTest
@ActiveProfiles("test")
class JwtTokenProviderTest : DescribeSpec({
    
    val jwtTokenProvider = JwtTokenProvider(
        jwtSecret = "test-secret-key-for-jwt-token-generation-minimum-256-bits-required",
        jwtExpirationMs = 86400000L // 24 hours
    )
    
    describe("JWT Token Generation") {
        
        it("should generate a valid JWT token") {
            // Given
            val userId = 1L
            val email = "test@example.com"
            val role = "DEVELOPER"
            
            // When
            val token = jwtTokenProvider.generateToken(userId, email, role)
            
            // Then
            token.shouldNotBeEmpty()
            token.split(".").size shouldBe 3 // JWT has 3 parts: header.payload.signature
        }
        
        it("should generate different tokens for different users") {
            // Given
            val user1Token = jwtTokenProvider.generateToken(1L, "user1@example.com", "DEVELOPER")
            val user2Token = jwtTokenProvider.generateToken(2L, "user2@example.com", "ADMIN")
            
            // Then
            user1Token shouldNotBe user2Token
        }
    }
    
    describe("JWT Token Validation") {
        
        it("should validate a valid token") {
            // Given
            val token = jwtTokenProvider.generateToken(1L, "test@example.com", "DEVELOPER")
            
            // When
            val isValid = jwtTokenProvider.validateToken(token)
            
            // Then
            isValid shouldBe true
        }
        
        it("should reject an invalid token") {
            // Given
            val invalidToken = "invalid.jwt.token"
            
            // When
            val isValid = jwtTokenProvider.validateToken(invalidToken)
            
            // Then
            isValid shouldBe false
        }
        
        it("should reject a malformed token") {
            // Given
            val malformedToken = "not-a-jwt-token"
            
            // When
            val isValid = jwtTokenProvider.validateToken(malformedToken)
            
            // Then
            isValid shouldBe false
        }
        
        it("should reject an empty token") {
            // Given
            val emptyToken = ""
            
            // When
            val isValid = jwtTokenProvider.validateToken(emptyToken)
            
            // Then
            isValid shouldBe false
        }
    }
    
    describe("JWT Claim Extraction") {
        
        it("should extract userId from token") {
            // Given
            val userId = 123L
            val token = jwtTokenProvider.generateToken(userId, "test@example.com", "DEVELOPER")
            
            // When
            val extractedUserId = jwtTokenProvider.getUserIdFromToken(token)
            
            // Then
            extractedUserId shouldBe userId
        }
        
        it("should extract email from token") {
            // Given
            val email = "test@example.com"
            val token = jwtTokenProvider.generateToken(1L, email, "DEVELOPER")
            
            // When
            val extractedEmail = jwtTokenProvider.getEmailFromToken(token)
            
            // Then
            extractedEmail shouldBe email
        }
        
        it("should extract role from token") {
            // Given
            val role = "ADMIN"
            val token = jwtTokenProvider.generateToken(1L, "test@example.com", role)
            
            // When
            val extractedRole = jwtTokenProvider.getRoleFromToken(token)
            
            // Then
            extractedRole shouldBe role
        }
        
        it("should extract all claims correctly for different user data") {
            // Given
            val userId = 456L
            val email = "admin@company.com"
            val role = "ADMIN"
            val token = jwtTokenProvider.generateToken(userId, email, role)
            
            // When & Then
            jwtTokenProvider.getUserIdFromToken(token) shouldBe userId
            jwtTokenProvider.getEmailFromToken(token) shouldBe email
            jwtTokenProvider.getRoleFromToken(token) shouldBe role
        }
    }
    
    describe("JWT Token Edge Cases") {
        
        it("should handle special characters in email") {
            // Given
            val email = "test+user@example-domain.co.uk"
            val token = jwtTokenProvider.generateToken(1L, email, "DEVELOPER")
            
            // When
            val extractedEmail = jwtTokenProvider.getEmailFromToken(token)
            
            // Then
            extractedEmail shouldBe email
        }
        
        it("should handle large user IDs") {
            // Given
            val largeUserId = Long.MAX_VALUE
            val token = jwtTokenProvider.generateToken(largeUserId, "test@example.com", "DEVELOPER")
            
            // When
            val extractedUserId = jwtTokenProvider.getUserIdFromToken(token)
            
            // Then
            extractedUserId shouldBe largeUserId
        }
    }
})