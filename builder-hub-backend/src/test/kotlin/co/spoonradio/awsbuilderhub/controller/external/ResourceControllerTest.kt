package co.spoonradio.awsbuilderhub.controller.external

import co.spoonradio.awsbuilderhub.config.TestSecurityConfig
import co.spoonradio.awsbuilderhub.controller.protocol.resource.*
import co.spoonradio.awsbuilderhub.security.JwtTokenProvider
import co.spoonradio.awsbuilderhub.security.UserPrincipal
import co.spoonradio.awsbuilderhub.service.resource.ResourceService
import co.spoonradio.awsbuilderhub.service.user.UserService
import com.fasterxml.jackson.databind.ObjectMapper
import io.kotest.core.spec.style.DescribeSpec
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import org.mockito.Mockito.`when`
import java.time.Instant

/**
 * Integration tests for ResourceController
 * 
 * Feature: auth-and-resource-api
 * Requirements: 5.1, 5.4, 6.1, 6.4, 7.1, 7.3, 8.1, 8.4
 * 
 * Tests EC2, RDS, S3, VPC resource retrieval endpoints with authentication and filtering.
 */
@WebMvcTest(ResourceController::class)
@Import(TestSecurityConfig::class)
@ActiveProfiles("test")
class ResourceControllerTest : DescribeSpec() {
    
    @Autowired
    private lateinit var mockMvc: MockMvc
    
    @MockBean
    private lateinit var resourceService: ResourceService
    
    @MockBean
    private lateinit var userService: UserService
    
    @MockBean
    private lateinit var jwtTokenProvider: JwtTokenProvider
    
    @MockBean
    private lateinit var userRepository: co.spoonradio.awsbuilderhub.domain.user.repository.UserRepository
    
    @Autowired
    private lateinit var objectMapper: ObjectMapper
    
    private fun setUpAuthentication(role: String = "DEVELOPER") {
        val principal = UserPrincipal(
            userId = 1L,
            email = "test@example.com",
            role = role
        )
        val authorities = listOf(SimpleGrantedAuthority("ROLE_$role"))
        val authentication = UsernamePasswordAuthenticationToken(principal, null, authorities)
        SecurityContextHolder.getContext().authentication = authentication
    }
    
    init {
        describe("GET /api/v1/resources/ec2") {
            
            it("should return EC2 instances for authenticated DEVELOPER") {
                // Given
                setUpAuthentication("DEVELOPER")
                
                val mockInstances = listOf(
                    EC2Instance(
                        instanceId = "i-1234567890abcdef0",
                        name = "Web Server",
                        instanceType = "t3.micro",
                        state = "running",
                        publicIpAddress = "203.0.113.12",
                        privateIpAddress = "10.0.1.55",
                        availabilityZone = "us-east-1a",
                        launchTime = Instant.parse("2023-01-01T12:00:00Z"),
                        accountId = "123456789012",
                        accountName = "Production Account",
                        region = "us-east-1"
                    ),
                    EC2Instance(
                        instanceId = "i-0987654321fedcba0",
                        name = "Database Server",
                        instanceType = "t3.small",
                        state = "stopped",
                        publicIpAddress = null,
                        privateIpAddress = "10.0.2.100",
                        availabilityZone = "us-east-1b",
                        launchTime = Instant.parse("2023-01-02T10:30:00Z"),
                        accountId = "123456789012",
                        accountName = "Production Account",
                        region = "us-east-1"
                    )
                )
                
                `when`(resourceService.listEC2Instances(null, null)).thenReturn(mockInstances)
                
                // When & Then
                mockMvc.perform(
                    get("/api/v1/resources/ec2")
                        .contentType(MediaType.APPLICATION_JSON)
                )
                    .andExpect(status().isOk)
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.results").isArray)
                    .andExpect(jsonPath("$.results.length()").value(2))
                    .andExpect(jsonPath("$.results[0].instanceId").value("i-1234567890abcdef0"))
                    .andExpect(jsonPath("$.results[0].name").value("Web Server"))
                    .andExpect(jsonPath("$.results[0].instanceType").value("t3.micro"))
                    .andExpect(jsonPath("$.results[0].state").value("running"))
                    .andExpect(jsonPath("$.results[0].publicIpAddress").value("203.0.113.12"))
                    .andExpect(jsonPath("$.results[0].privateIpAddress").value("10.0.1.55"))
                    .andExpect(jsonPath("$.results[0].availabilityZone").value("us-east-1a"))
                    .andExpect(jsonPath("$.results[0].accountId").value("123456789012"))
                    .andExpect(jsonPath("$.results[0].accountName").value("Production Account"))
                    .andExpect(jsonPath("$.results[0].region").value("us-east-1"))
                    .andExpect(jsonPath("$.results[1].instanceId").value("i-0987654321fedcba0"))
                    .andExpect(jsonPath("$.results[1].name").value("Database Server"))
                    .andExpect(jsonPath("$.results[1].state").value("stopped"))
                    .andExpect(jsonPath("$.results[1].publicIpAddress").doesNotExist())
            }
            
            it("should return EC2 instances filtered by accountId") {
                // Given
                setUpAuthentication("DEVELOPER")
                
                val accountId = 123456789012L
                val mockInstances = listOf(
                    EC2Instance(
                        instanceId = "i-1234567890abcdef0",
                        name = "Filtered Instance",
                        instanceType = "t3.micro",
                        state = "running",
                        publicIpAddress = "203.0.113.12",
                        privateIpAddress = "10.0.1.55",
                        availabilityZone = "us-east-1a",
                        launchTime = Instant.parse("2023-01-01T12:00:00Z"),
                        accountId = "123456789012",
                        accountName = "Production Account",
                        region = "us-east-1"
                    )
                )
                
                `when`(resourceService.listEC2Instances(accountId, null)).thenReturn(mockInstances)
                
                // When & Then
                mockMvc.perform(
                    get("/api/v1/resources/ec2")
                        .param("accountId", accountId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                )
                    .andExpect(status().isOk)
                    .andExpect(jsonPath("$.results.length()").value(1))
                    .andExpect(jsonPath("$.results[0].accountId").value("123456789012"))
            }
            
            it("should return EC2 instances filtered by region") {
                // Given
                setUpAuthentication("DEVELOPER")
                
                val region = "us-west-2"
                val mockInstances = listOf(
                    EC2Instance(
                        instanceId = "i-1234567890abcdef0",
                        name = "West Coast Instance",
                        instanceType = "t3.micro",
                        state = "running",
                        publicIpAddress = "203.0.113.12",
                        privateIpAddress = "10.0.1.55",
                        availabilityZone = "us-west-2a",
                        launchTime = Instant.parse("2023-01-01T12:00:00Z"),
                        accountId = "123456789012",
                        accountName = "Production Account",
                        region = region
                    )
                )
                
                `when`(resourceService.listEC2Instances(null, region)).thenReturn(mockInstances)
                
                // When & Then
                mockMvc.perform(
                    get("/api/v1/resources/ec2")
                        .param("region", region)
                        .contentType(MediaType.APPLICATION_JSON)
                )
                    .andExpect(status().isOk)
                    .andExpect(jsonPath("$.results.length()").value(1))
                    .andExpect(jsonPath("$.results[0].region").value(region))
            }
            
            it("should return EC2 instances for authenticated ADMIN") {
                // Given
                setUpAuthentication("ADMIN")
                
                val mockInstances = listOf(
                    EC2Instance(
                        instanceId = "i-admin123456789",
                        name = "Admin Instance",
                        instanceType = "t3.large",
                        state = "running",
                        publicIpAddress = "203.0.113.50",
                        privateIpAddress = "10.0.1.100",
                        availabilityZone = "us-east-1a",
                        launchTime = Instant.parse("2023-01-01T12:00:00Z"),
                        accountId = "123456789012",
                        accountName = "Admin Account",
                        region = "us-east-1"
                    )
                )
                
                `when`(resourceService.listEC2Instances(null, null)).thenReturn(mockInstances)
                
                // When & Then
                mockMvc.perform(
                    get("/api/v1/resources/ec2")
                        .contentType(MediaType.APPLICATION_JSON)
                )
                    .andExpect(status().isOk)
                    .andExpect(jsonPath("$.results.length()").value(1))
                    .andExpect(jsonPath("$.results[0].instanceId").value("i-admin123456789"))
            }
            
            it("should return empty list when no EC2 instances found") {
                // Given
                setUpAuthentication("DEVELOPER")
                `when`(resourceService.listEC2Instances(null, null)).thenReturn(emptyList())
                
                // When & Then
                mockMvc.perform(
                    get("/api/v1/resources/ec2")
                        .contentType(MediaType.APPLICATION_JSON)
                )
                    .andExpect(status().isOk)
                    .andExpect(jsonPath("$.results").isArray)
                    .andExpect(jsonPath("$.results.length()").value(0))
            }
        }
        
        describe("GET /api/v1/resources/rds") {
            
            it("should return RDS instances for authenticated user") {
                // Given
                setUpAuthentication("DEVELOPER")
                
                val mockInstances = listOf(
                    RDSInstance(
                        dbInstanceIdentifier = "mydb-instance-1",
                        dbInstanceClass = "db.t3.micro",
                        engine = "mysql",
                        engineVersion = "8.0.35",
                        status = "available",
                        endpoint = "mydb-instance-1.cluster-xyz.us-east-1.rds.amazonaws.com",
                        port = 3306,
                        availabilityZone = "us-east-1a",
                        allocatedStorage = 20,
                        accountId = "123456789012",
                        accountName = "Production Account",
                        region = "us-east-1"
                    ),
                    RDSInstance(
                        dbInstanceIdentifier = "postgres-db",
                        dbInstanceClass = "db.t3.small",
                        engine = "postgres",
                        engineVersion = "15.4",
                        status = "stopped",
                        endpoint = null,
                        port = 5432,
                        availabilityZone = "us-east-1b",
                        allocatedStorage = 100,
                        accountId = "123456789012",
                        accountName = "Production Account",
                        region = "us-east-1"
                    )
                )
                
                `when`(resourceService.listRDSInstances(null, null)).thenReturn(mockInstances)
                
                // When & Then
                mockMvc.perform(
                    get("/api/v1/resources/rds")
                        .contentType(MediaType.APPLICATION_JSON)
                )
                    .andExpect(status().isOk)
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.results").isArray)
                    .andExpect(jsonPath("$.results.length()").value(2))
                    .andExpect(jsonPath("$.results[0].dbInstanceIdentifier").value("mydb-instance-1"))
                    .andExpect(jsonPath("$.results[0].dbInstanceClass").value("db.t3.micro"))
                    .andExpect(jsonPath("$.results[0].engine").value("mysql"))
                    .andExpect(jsonPath("$.results[0].engineVersion").value("8.0.35"))
                    .andExpect(jsonPath("$.results[0].status").value("available"))
                    .andExpect(jsonPath("$.results[0].endpoint").value("mydb-instance-1.cluster-xyz.us-east-1.rds.amazonaws.com"))
                    .andExpect(jsonPath("$.results[0].port").value(3306))
                    .andExpect(jsonPath("$.results[0].allocatedStorage").value(20))
                    .andExpect(jsonPath("$.results[1].dbInstanceIdentifier").value("postgres-db"))
                    .andExpect(jsonPath("$.results[1].engine").value("postgres"))
                    .andExpect(jsonPath("$.results[1].status").value("stopped"))
                    .andExpect(jsonPath("$.results[1].endpoint").doesNotExist())
            }
            
            it("should return RDS instances filtered by accountId and region") {
                // Given
                setUpAuthentication("ADMIN")
                
                val accountId = 987654321098L
                val region = "us-west-2"
                val mockInstances = listOf(
                    RDSInstance(
                        dbInstanceIdentifier = "filtered-db",
                        dbInstanceClass = "db.r5.large",
                        engine = "aurora-mysql",
                        engineVersion = "8.0.mysql_aurora.3.02.0",
                        status = "available",
                        endpoint = "filtered-db.cluster-abc.us-west-2.rds.amazonaws.com",
                        port = 3306,
                        availabilityZone = "us-west-2a",
                        allocatedStorage = 1,
                        accountId = "987654321098",
                        accountName = "Development Account",
                        region = region
                    )
                )
                
                `when`(resourceService.listRDSInstances(accountId, region)).thenReturn(mockInstances)
                
                // When & Then
                mockMvc.perform(
                    get("/api/v1/resources/rds")
                        .param("accountId", accountId.toString())
                        .param("region", region)
                        .contentType(MediaType.APPLICATION_JSON)
                )
                    .andExpect(status().isOk)
                    .andExpect(jsonPath("$.results.length()").value(1))
                    .andExpect(jsonPath("$.results[0].accountId").value("987654321098"))
                    .andExpect(jsonPath("$.results[0].region").value(region))
            }
        }
        
        describe("GET /api/v1/resources/s3") {
            
            it("should return S3 buckets for authenticated user") {
                // Given
                setUpAuthentication("DEVELOPER")
                
                val mockBuckets = listOf(
                    S3Bucket(
                        name = "my-app-assets",
                        creationDate = Instant.parse("2023-01-01T10:00:00Z"),
                        region = "us-east-1",
                        accountId = "123456789012",
                        accountName = "Production Account"
                    ),
                    S3Bucket(
                        name = "backup-storage-bucket",
                        creationDate = Instant.parse("2023-02-15T14:30:00Z"),
                        region = "us-west-2",
                        accountId = "123456789012",
                        accountName = "Production Account"
                    ),
                    S3Bucket(
                        name = "logs-archive",
                        creationDate = null,
                        region = null,
                        accountId = "123456789012",
                        accountName = "Production Account"
                    )
                )
                
                `when`(resourceService.listS3Buckets(null)).thenReturn(mockBuckets)
                
                // When & Then
                mockMvc.perform(
                    get("/api/v1/resources/s3")
                        .contentType(MediaType.APPLICATION_JSON)
                )
                    .andExpect(status().isOk)
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.results").isArray)
                    .andExpect(jsonPath("$.results.length()").value(3))
                    .andExpect(jsonPath("$.results[0].name").value("my-app-assets"))
                    .andExpect(jsonPath("$.results[0].region").value("us-east-1"))
                    .andExpect(jsonPath("$.results[0].accountId").value("123456789012"))
                    .andExpect(jsonPath("$.results[0].accountName").value("Production Account"))
                    .andExpect(jsonPath("$.results[1].name").value("backup-storage-bucket"))
                    .andExpect(jsonPath("$.results[1].region").value("us-west-2"))
                    .andExpect(jsonPath("$.results[2].name").value("logs-archive"))
                    .andExpect(jsonPath("$.results[2].region").doesNotExist())
                    .andExpect(jsonPath("$.results[2].creationDate").doesNotExist())
            }
            
            it("should return S3 buckets filtered by accountId") {
                // Given
                setUpAuthentication("ADMIN")
                
                val accountId = 555666777888L
                val mockBuckets = listOf(
                    S3Bucket(
                        name = "specific-account-bucket",
                        creationDate = Instant.parse("2023-03-01T09:00:00Z"),
                        region = "eu-west-1",
                        accountId = "555666777888",
                        accountName = "EU Account"
                    )
                )
                
                `when`(resourceService.listS3Buckets(accountId)).thenReturn(mockBuckets)
                
                // When & Then
                mockMvc.perform(
                    get("/api/v1/resources/s3")
                        .param("accountId", accountId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                )
                    .andExpect(status().isOk)
                    .andExpect(jsonPath("$.results.length()").value(1))
                    .andExpect(jsonPath("$.results[0].accountId").value("555666777888"))
                    .andExpect(jsonPath("$.results[0].accountName").value("EU Account"))
            }
        }
        
        describe("GET /api/v1/resources/vpc") {
            
            it("should return VPCs for authenticated user") {
                // Given
                setUpAuthentication("DEVELOPER")
                
                val mockVPCs = listOf(
                    VPC(
                        vpcId = "vpc-12345678",
                        cidrBlock = "10.0.0.0/16",
                        state = "available",
                        isDefault = true,
                        name = "Default VPC",
                        accountId = "123456789012",
                        accountName = "Production Account",
                        region = "us-east-1"
                    ),
                    VPC(
                        vpcId = "vpc-87654321",
                        cidrBlock = "172.16.0.0/16",
                        state = "available",
                        isDefault = false,
                        name = "Custom VPC",
                        accountId = "123456789012",
                        accountName = "Production Account",
                        region = "us-east-1"
                    ),
                    VPC(
                        vpcId = "vpc-abcdef12",
                        cidrBlock = "192.168.0.0/16",
                        state = "pending",
                        isDefault = false,
                        name = null,
                        accountId = "123456789012",
                        accountName = "Production Account",
                        region = "us-east-1"
                    )
                )
                
                `when`(resourceService.listVPCs(null, null)).thenReturn(mockVPCs)
                
                // When & Then
                mockMvc.perform(
                    get("/api/v1/resources/vpc")
                        .contentType(MediaType.APPLICATION_JSON)
                )
                    .andExpect(status().isOk)
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.results").isArray)
                    .andExpect(jsonPath("$.results.length()").value(3))
                    .andExpect(jsonPath("$.results[0].vpcId").value("vpc-12345678"))
                    .andExpect(jsonPath("$.results[0].cidrBlock").value("10.0.0.0/16"))
                    .andExpect(jsonPath("$.results[0].state").value("available"))
                    .andExpect(jsonPath("$.results[0].isDefault").value(true))
                    .andExpect(jsonPath("$.results[0].name").value("Default VPC"))
                    .andExpect(jsonPath("$.results[0].accountId").value("123456789012"))
                    .andExpect(jsonPath("$.results[0].region").value("us-east-1"))
                    .andExpect(jsonPath("$.results[1].vpcId").value("vpc-87654321"))
                    .andExpect(jsonPath("$.results[1].isDefault").value(false))
                    .andExpect(jsonPath("$.results[1].name").value("Custom VPC"))
                    .andExpect(jsonPath("$.results[2].vpcId").value("vpc-abcdef12"))
                    .andExpect(jsonPath("$.results[2].state").value("pending"))
                    .andExpect(jsonPath("$.results[2].name").doesNotExist())
            }
            
            it("should return VPCs filtered by accountId and region") {
                // Given
                setUpAuthentication("ADMIN")
                
                val accountId = 111222333444L
                val region = "ap-southeast-1"
                val mockVPCs = listOf(
                    VPC(
                        vpcId = "vpc-singapore01",
                        cidrBlock = "10.1.0.0/16",
                        state = "available",
                        isDefault = false,
                        name = "Singapore VPC",
                        accountId = "111222333444",
                        accountName = "APAC Account",
                        region = region
                    )
                )
                
                `when`(resourceService.listVPCs(accountId, region)).thenReturn(mockVPCs)
                
                // When & Then
                mockMvc.perform(
                    get("/api/v1/resources/vpc")
                        .param("accountId", accountId.toString())
                        .param("region", region)
                        .contentType(MediaType.APPLICATION_JSON)
                )
                    .andExpect(status().isOk)
                    .andExpect(jsonPath("$.results.length()").value(1))
                    .andExpect(jsonPath("$.results[0].accountId").value("111222333444"))
                    .andExpect(jsonPath("$.results[0].region").value(region))
                    .andExpect(jsonPath("$.results[0].name").value("Singapore VPC"))
            }
        }
        
        afterEach {
            // Clean up security context
            SecurityContextHolder.clearContext()
        }
    }
}