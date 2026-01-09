package co.spoonradio.awsbuilderhub.security

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.property.Arb
import io.kotest.property.arbitrary.*
import io.kotest.property.checkAll
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles

/**
 * Property-based tests for JwtTokenProvider
 * 
 * Feature: auth-and-resource-api
 * 
 * Tests correctness properties using property-based testing with Kotest.
 */
@SpringBootTest
@ActiveProfiles("test")
class JwtTokenProviderPropertyTest : DescribeSpec({
    
    val jwtTokenProvider = JwtTokenProvider(
        jwtSecret = "test-secret-key-for-jwt-token-generation-minimum-256-bits-required",
        jwtExpirationMs = 86400000L // 24 hours
    )
    
    describe("Property 1: JWT Token Round-Trip") {
        
        it("Feature: auth-and-resource-api, Property 1: For any valid user info, token generation then extraction should return original info") {
            checkAll<Long, String, String>(
                Arb.long(1L..Long.MAX_VALUE), // userId
                Arb.email(), // email
                Arb.element(listOf("ADMIN", "DEVELOPER")) // role
            ) { userId: Long, email: String, role: String ->
                // Generate token with user info
                val token = jwtTokenProvider.generateToken(userId, email, role)
                
                // Extract info from token (round-trip)
                val extractedUserId = jwtTokenProvider.getUserIdFromToken(token)
                val extractedEmail = jwtTokenProvider.getEmailFromToken(token)
                val extractedRole = jwtTokenProvider.getRoleFromToken(token)
                
                // Verify round-trip property: extracted info should match original
                extractedUserId shouldBe userId
                extractedEmail shouldBe email
                extractedRole shouldBe role
            }
        }
    }
    
    describe("Property 5: Token Contains Required Claims") {
        
        it("Feature: auth-and-resource-api, Property 5: For any generated JWT token, it should contain userId, email, and role claims") {
            checkAll<Long, String, String>(
                Arb.long(1L..Long.MAX_VALUE), // userId
                Arb.email(), // email
                Arb.element(listOf("ADMIN", "DEVELOPER")) // role
            ) { userId: Long, email: String, role: String ->
                // Generate token
                val token = jwtTokenProvider.generateToken(userId, email, role)
                
                // Verify token is valid (can be parsed)
                val isValid = jwtTokenProvider.validateToken(token)
                isValid shouldBe true
                
                // Verify all required claims can be extracted (no exceptions thrown)
                val extractedUserId = jwtTokenProvider.getUserIdFromToken(token)
                val extractedEmail = jwtTokenProvider.getEmailFromToken(token)
                val extractedRole = jwtTokenProvider.getRoleFromToken(token)
                
                // Verify claims are not null/empty and have expected types
                extractedUserId shouldBe userId // Long type preserved
                extractedEmail shouldBe email // String type preserved
                extractedRole shouldBe role // String type preserved
            }
        }
    }
})