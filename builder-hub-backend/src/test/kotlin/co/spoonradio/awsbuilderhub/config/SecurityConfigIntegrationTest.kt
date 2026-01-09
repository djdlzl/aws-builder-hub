package co.spoonradio.awsbuilderhub.config

import co.spoonradio.awsbuilderhub.domain.user.entity.User
import co.spoonradio.awsbuilderhub.domain.user.entity.UserRole
import co.spoonradio.awsbuilderhub.domain.user.repository.UserRepository
import co.spoonradio.awsbuilderhub.security.JwtTokenProvider
import co.spoonradio.awsbuilderhub.service.aws.AwsAccountService
import co.spoonradio.awsbuilderhub.service.resource.ResourceService
import co.spoonradio.awsbuilderhub.service.user.UserService
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.boot.test.web.client.TestRestTemplate
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.http.*
import org.springframework.test.context.ActiveProfiles
import org.mockito.Mockito.`when`
import java.time.LocalDateTime

/**
 * Integration tests for SecurityConfig role-based access control
 * 
 * Feature: auth-and-resource-api
 * Requirements: 10.1, 10.2, 10.3, 10.4
 * 
 * Tests role-based access control for different API endpoints:
 * - ADMIN role can access all APIs including AWS account management
 * - DEVELOPER role can access resource APIs but not admin APIs
 * - Unauthenticated requests are properly rejected
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class SecurityConfigIntegrationTest : DescribeSpec() {
    
    @Autowired
    private lateinit var restTemplate: TestRestTemplate
    
    @LocalServerPort
    private var port: Int = 0
    
    @MockBean
    private lateinit var userService: UserService
    
    @MockBean
    private lateinit var awsAccountService: AwsAccountService
    
    @MockBean
    private lateinit var resourceService: ResourceService
    
    @MockBean
    private lateinit var userRepository: UserRepository
    
    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider
    
    private val adminUser = User(
        id = 1L,
        email = "admin@example.com",
        name = "Admin User",
        password = "encoded-password",
        role = UserRole.ADMIN,
        enabled = true,
        createdAt = LocalDateTime.now(),
        updatedAt = LocalDateTime.now()
    )
    
    private val developerUser = User(
        id = 2L,
        email = "developer@example.com",
        name = "Developer User",
        password = "encoded-password",
        role = UserRole.DEVELOPER,
        enabled = true,
        createdAt = LocalDateTime.now(),
        updatedAt = LocalDateTime.now()
    )
    
    private fun createAuthHeaders(token: String): HttpHeaders {
        val headers = HttpHeaders()
        headers.set("Authorization", "Bearer $token")
        headers.contentType = MediaType.APPLICATION_JSON
        return headers
    }
    
    private fun baseUrl(path: String) = "http://localhost:$port$path"
    
    init {
        describe("Role-Based Access Control") {
            
            context("ADMIN role access") {
                
                it("should allow ADMIN to access AWS account management APIs") {
                    // Given
                    val adminToken = jwtTokenProvider.generateToken(
                        adminUser.id, 
                        adminUser.email, 
                        adminUser.role.name
                    )
                    
                    `when`(userRepository.findById(adminUser.id)).thenReturn(java.util.Optional.of(adminUser))
                    `when`(awsAccountService.findAll()).thenReturn(emptyList())
                    
                    val headers = createAuthHeaders(adminToken)
                    val entity = HttpEntity<String>(headers)
                    
                    // When & Then - GET /api/v1/aws-accounts
                    val response1 = restTemplate.exchange(
                        baseUrl("/api/v1/aws-accounts"),
                        HttpMethod.GET,
                        entity,
                        String::class.java
                    )
                    response1.statusCode shouldBe HttpStatus.OK
                    
                    // When & Then - GET /api/v1/aws-accounts/verified
                    `when`(awsAccountService.findVerifiedAccounts()).thenReturn(emptyList())
                    val response2 = restTemplate.exchange(
                        baseUrl("/api/v1/aws-accounts/verified"),
                        HttpMethod.GET,
                        entity,
                        String::class.java
                    )
                    response2.statusCode shouldBe HttpStatus.OK
                }
                
                it("should allow ADMIN to access user management APIs") {
                    // Given
                    val adminToken = jwtTokenProvider.generateToken(
                        adminUser.id, 
                        adminUser.email, 
                        adminUser.role.name
                    )
                    
                    `when`(userRepository.findById(adminUser.id)).thenReturn(java.util.Optional.of(adminUser))
                    `when`(userService.findAll()).thenReturn(emptyList())
                    
                    val headers = createAuthHeaders(adminToken)
                    val entity = HttpEntity<String>(headers)
                    
                    // When & Then - GET /api/v1/users
                    val response = restTemplate.exchange(
                        baseUrl("/api/v1/users"),
                        HttpMethod.GET,
                        entity,
                        String::class.java
                    )
                    response.statusCode shouldBe HttpStatus.OK
                }
                
                it("should allow ADMIN to access resource APIs") {
                    // Given
                    val adminToken = jwtTokenProvider.generateToken(
                        adminUser.id, 
                        adminUser.email, 
                        adminUser.role.name
                    )
                    
                    `when`(userRepository.findById(adminUser.id)).thenReturn(java.util.Optional.of(adminUser))
                    `when`(resourceService.listEC2Instances(null, null)).thenReturn(emptyList())
                    `when`(resourceService.listRDSInstances(null, null)).thenReturn(emptyList())
                    `when`(resourceService.listS3Buckets(null)).thenReturn(emptyList())
                    `when`(resourceService.listVPCs(null, null)).thenReturn(emptyList())
                    
                    val headers = createAuthHeaders(adminToken)
                    val entity = HttpEntity<String>(headers)
                    
                    // When & Then - Resource endpoints
                    val ec2Response = restTemplate.exchange(
                        baseUrl("/api/v1/resources/ec2"),
                        HttpMethod.GET,
                        entity,
                        String::class.java
                    )
                    ec2Response.statusCode shouldBe HttpStatus.OK
                    
                    val rdsResponse = restTemplate.exchange(
                        baseUrl("/api/v1/resources/rds"),
                        HttpMethod.GET,
                        entity,
                        String::class.java
                    )
                    rdsResponse.statusCode shouldBe HttpStatus.OK
                    
                    val s3Response = restTemplate.exchange(
                        baseUrl("/api/v1/resources/s3"),
                        HttpMethod.GET,
                        entity,
                        String::class.java
                    )
                    s3Response.statusCode shouldBe HttpStatus.OK
                    
                    val vpcResponse = restTemplate.exchange(
                        baseUrl("/api/v1/resources/vpc"),
                        HttpMethod.GET,
                        entity,
                        String::class.java
                    )
                    vpcResponse.statusCode shouldBe HttpStatus.OK
                }
            }
            
            context("DEVELOPER role access") {
                
                it("should deny DEVELOPER access to AWS account management APIs") {
                    // Given
                    val developerToken = jwtTokenProvider.generateToken(
                        developerUser.id, 
                        developerUser.email, 
                        developerUser.role.name
                    )
                    
                    `when`(userRepository.findById(developerUser.id)).thenReturn(java.util.Optional.of(developerUser))
                    
                    val headers = createAuthHeaders(developerToken)
                    val entity = HttpEntity<String>(headers)
                    
                    // When & Then - Should return 403 Forbidden
                    val response1 = restTemplate.exchange(
                        baseUrl("/api/v1/aws-accounts"),
                        HttpMethod.GET,
                        entity,
                        String::class.java
                    )
                    response1.statusCode shouldBe HttpStatus.FORBIDDEN
                    
                    val response2 = restTemplate.exchange(
                        baseUrl("/api/v1/aws-accounts/verified"),
                        HttpMethod.GET,
                        entity,
                        String::class.java
                    )
                    response2.statusCode shouldBe HttpStatus.FORBIDDEN
                }
                
                it("should deny DEVELOPER access to user management APIs") {
                    // Given
                    val developerToken = jwtTokenProvider.generateToken(
                        developerUser.id, 
                        developerUser.email, 
                        developerUser.role.name
                    )
                    
                    `when`(userRepository.findById(developerUser.id)).thenReturn(java.util.Optional.of(developerUser))
                    
                    val headers = createAuthHeaders(developerToken)
                    val entity = HttpEntity<String>(headers)
                    
                    // When & Then - Should return 403 Forbidden
                    val response = restTemplate.exchange(
                        baseUrl("/api/v1/users"),
                        HttpMethod.GET,
                        entity,
                        String::class.java
                    )
                    response.statusCode shouldBe HttpStatus.FORBIDDEN
                }
                
                it("should allow DEVELOPER to access resource APIs") {
                    // Given
                    val developerToken = jwtTokenProvider.generateToken(
                        developerUser.id, 
                        developerUser.email, 
                        developerUser.role.name
                    )
                    
                    `when`(userRepository.findById(developerUser.id)).thenReturn(java.util.Optional.of(developerUser))
                    `when`(resourceService.listEC2Instances(null, null)).thenReturn(emptyList())
                    `when`(resourceService.listRDSInstances(null, null)).thenReturn(emptyList())
                    `when`(resourceService.listS3Buckets(null)).thenReturn(emptyList())
                    `when`(resourceService.listVPCs(null, null)).thenReturn(emptyList())
                    
                    val headers = createAuthHeaders(developerToken)
                    val entity = HttpEntity<String>(headers)
                    
                    // When & Then - Should return 200 OK
                    val ec2Response = restTemplate.exchange(
                        baseUrl("/api/v1/resources/ec2"),
                        HttpMethod.GET,
                        entity,
                        String::class.java
                    )
                    ec2Response.statusCode shouldBe HttpStatus.OK
                    
                    val rdsResponse = restTemplate.exchange(
                        baseUrl("/api/v1/resources/rds"),
                        HttpMethod.GET,
                        entity,
                        String::class.java
                    )
                    rdsResponse.statusCode shouldBe HttpStatus.OK
                    
                    val s3Response = restTemplate.exchange(
                        baseUrl("/api/v1/resources/s3"),
                        HttpMethod.GET,
                        entity,
                        String::class.java
                    )
                    s3Response.statusCode shouldBe HttpStatus.OK
                    
                    val vpcResponse = restTemplate.exchange(
                        baseUrl("/api/v1/resources/vpc"),
                        HttpMethod.GET,
                        entity,
                        String::class.java
                    )
                    vpcResponse.statusCode shouldBe HttpStatus.OK
                }
            }
            
            context("Unauthenticated access") {
                
                it("should deny unauthenticated access to protected endpoints") {
                    // When & Then - AWS account endpoints
                    val awsResponse = restTemplate.getForEntity(
                        baseUrl("/api/v1/aws-accounts"),
                        String::class.java
                    )
                    awsResponse.statusCode shouldBe HttpStatus.FORBIDDEN
                    
                    // When & Then - User endpoints
                    val userResponse = restTemplate.getForEntity(
                        baseUrl("/api/v1/users"),
                        String::class.java
                    )
                    userResponse.statusCode shouldBe HttpStatus.FORBIDDEN
                    
                    // When & Then - Resource endpoints
                    val ec2Response = restTemplate.getForEntity(
                        baseUrl("/api/v1/resources/ec2"),
                        String::class.java
                    )
                    ec2Response.statusCode shouldBe HttpStatus.FORBIDDEN
                    
                    val rdsResponse = restTemplate.getForEntity(
                        baseUrl("/api/v1/resources/rds"),
                        String::class.java
                    )
                    rdsResponse.statusCode shouldBe HttpStatus.FORBIDDEN
                    
                    val s3Response = restTemplate.getForEntity(
                        baseUrl("/api/v1/resources/s3"),
                        String::class.java
                    )
                    s3Response.statusCode shouldBe HttpStatus.FORBIDDEN
                    
                    val vpcResponse = restTemplate.getForEntity(
                        baseUrl("/api/v1/resources/vpc"),
                        String::class.java
                    )
                    vpcResponse.statusCode shouldBe HttpStatus.FORBIDDEN
                }
                
                it("should allow unauthenticated access to public endpoints") {
                    // When & Then - Health endpoint should be accessible
                    val healthResponse = restTemplate.getForEntity(
                        baseUrl("/api/v1/health"),
                        String::class.java
                    )
                    healthResponse.statusCode shouldBe HttpStatus.OK
                }
            }
            
            context("Invalid token access") {
                
                it("should deny access with invalid JWT token") {
                    // Given
                    val invalidHeaders = createAuthHeaders("invalid-jwt-token")
                    val entity = HttpEntity<String>(invalidHeaders)
                    
                    // When & Then
                    val response = restTemplate.exchange(
                        baseUrl("/api/v1/resources/ec2"),
                        HttpMethod.GET,
                        entity,
                        String::class.java
                    )
                    response.statusCode shouldBe HttpStatus.FORBIDDEN
                }
                
                it("should deny access with malformed Authorization header") {
                    // Given
                    val headers = HttpHeaders()
                    headers.set("Authorization", "InvalidFormat token")
                    headers.contentType = MediaType.APPLICATION_JSON
                    val entity = HttpEntity<String>(headers)
                    
                    // When & Then
                    val response = restTemplate.exchange(
                        baseUrl("/api/v1/resources/ec2"),
                        HttpMethod.GET,
                        entity,
                        String::class.java
                    )
                    response.statusCode shouldBe HttpStatus.FORBIDDEN
                }
            }
        }
    }
}