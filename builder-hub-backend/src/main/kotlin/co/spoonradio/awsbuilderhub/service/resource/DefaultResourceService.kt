package co.spoonradio.awsbuilderhub.service.resource

import co.spoonradio.awsbuilderhub.controller.protocol.resource.*
import co.spoonradio.awsbuilderhub.domain.aws.entity.AwsAccount
import co.spoonradio.awsbuilderhub.domain.aws.entity.AwsAccountStatus
import co.spoonradio.awsbuilderhub.domain.aws.repository.AwsAccountRepository
import org.springframework.stereotype.Service
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.ec2.Ec2Client
import software.amazon.awssdk.services.ec2.model.DescribeInstancesRequest
import software.amazon.awssdk.services.ec2.model.DescribeVpcsRequest
import software.amazon.awssdk.services.rds.RdsClient
import software.amazon.awssdk.services.rds.model.DescribeDbInstancesRequest
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.sts.StsClient
import software.amazon.awssdk.services.sts.auth.StsAssumeRoleCredentialsProvider
import software.amazon.awssdk.services.sts.model.AssumeRoleRequest
import org.slf4j.LoggerFactory

@Service
class DefaultResourceService(
    private val awsAccountRepository: AwsAccountRepository
) : ResourceService {
    
    private val logger = LoggerFactory.getLogger(javaClass)
    private val defaultRegions = listOf("ap-northeast-2", "ap-northeast-1", "us-east-1")
    
    override fun listEC2Instances(accountId: Long?, region: String?): List<EC2Instance> {
        val accounts = getVerifiedAccounts(accountId)
        val regions = region?.let { listOf(it) } ?: defaultRegions
        
        return accounts.flatMap { account ->
            regions.flatMap { reg ->
                try {
                    fetchEC2Instances(account, reg)
                } catch (e: Exception) {
                    logger.warn("Failed to fetch EC2 instances for account ${account.accountId} in $reg: ${e.message}")
                    emptyList()
                }
            }
        }
    }
    
    override fun listRDSInstances(accountId: Long?, region: String?): List<RDSInstance> {
        val accounts = getVerifiedAccounts(accountId)
        val regions = region?.let { listOf(it) } ?: defaultRegions
        
        return accounts.flatMap { account ->
            regions.flatMap { reg ->
                try {
                    fetchRDSInstances(account, reg)
                } catch (e: Exception) {
                    logger.warn("Failed to fetch RDS instances for account ${account.accountId} in $reg: ${e.message}")
                    emptyList()
                }
            }
        }
    }
    
    override fun listS3Buckets(accountId: Long?): List<S3Bucket> {
        val accounts = getVerifiedAccounts(accountId)
        
        return accounts.flatMap { account ->
            try {
                fetchS3Buckets(account)
            } catch (e: Exception) {
                logger.warn("Failed to fetch S3 buckets for account ${account.accountId}: ${e.message}")
                emptyList()
            }
        }
    }
    
    override fun listVPCs(accountId: Long?, region: String?): List<VPC> {
        val accounts = getVerifiedAccounts(accountId)
        val regions = region?.let { listOf(it) } ?: defaultRegions
        
        return accounts.flatMap { account ->
            regions.flatMap { reg ->
                try {
                    fetchVPCs(account, reg)
                } catch (e: Exception) {
                    logger.warn("Failed to fetch VPCs for account ${account.accountId} in $reg: ${e.message}")
                    emptyList()
                }
            }
        }
    }
    
    private fun getVerifiedAccounts(accountId: Long?): List<AwsAccount> {
        return if (accountId != null) {
            awsAccountRepository.findById(accountId)
                .filter { it.status == AwsAccountStatus.VERIFIED }
                .map { listOf(it) }
                .orElse(emptyList())
        } else {
            awsAccountRepository.findByStatus(AwsAccountStatus.VERIFIED)
        }
    }
    
    private fun getCredentialsProvider(account: AwsAccount, region: String): AwsCredentialsProvider {
        val assumeRoleRequest = AssumeRoleRequest.builder()
            .roleArn(account.roleArn)
            .roleSessionName("CloudForge-${System.currentTimeMillis()}")
            .apply { account.externalId?.takeIf { it.isNotBlank() }?.let { externalId(it) } }
            .build()
        
        return StsAssumeRoleCredentialsProvider.builder()
            .stsClient(StsClient.builder().region(Region.of(region)).build())
            .refreshRequest(assumeRoleRequest)
            .build()
    }
    
    private fun fetchEC2Instances(account: AwsAccount, region: String): List<EC2Instance> {
        val credentialsProvider = getCredentialsProvider(account, region)
        
        val ec2Client = Ec2Client.builder()
            .region(Region.of(region))
            .credentialsProvider(credentialsProvider)
            .build()
        
        return ec2Client.use { client ->
            val response = client.describeInstances(DescribeInstancesRequest.builder().build())
            response.reservations().flatMap { reservation ->
                reservation.instances().map { instance ->
                    val nameTag = instance.tags().find { it.key() == "Name" }?.value()
                    EC2Instance(
                        instanceId = instance.instanceId(),
                        name = nameTag,
                        instanceType = instance.instanceType().toString(),
                        state = instance.state().nameAsString(),
                        publicIpAddress = instance.publicIpAddress(),
                        privateIpAddress = instance.privateIpAddress(),
                        availabilityZone = instance.placement().availabilityZone(),
                        launchTime = instance.launchTime(),
                        accountId = account.accountId,
                        accountName = account.accountName,
                        region = region
                    )
                }
            }
        }
    }
    
    private fun fetchRDSInstances(account: AwsAccount, region: String): List<RDSInstance> {
        val credentialsProvider = getCredentialsProvider(account, region)
        
        val rdsClient = RdsClient.builder()
            .region(Region.of(region))
            .credentialsProvider(credentialsProvider)
            .build()
        
        return rdsClient.use { client ->
            val response = client.describeDBInstances(DescribeDbInstancesRequest.builder().build())
            response.dbInstances().map { instance ->
                RDSInstance(
                    dbInstanceIdentifier = instance.dbInstanceIdentifier(),
                    dbInstanceClass = instance.dbInstanceClass(),
                    engine = instance.engine(),
                    engineVersion = instance.engineVersion(),
                    status = instance.dbInstanceStatus(),
                    endpoint = instance.endpoint()?.address(),
                    port = instance.endpoint()?.port(),
                    availabilityZone = instance.availabilityZone(),
                    allocatedStorage = instance.allocatedStorage(),
                    accountId = account.accountId,
                    accountName = account.accountName,
                    region = region
                )
            }
        }
    }
    
    private fun fetchS3Buckets(account: AwsAccount): List<S3Bucket> {
        val credentialsProvider = getCredentialsProvider(account, "ap-northeast-2")
        
        val s3Client = S3Client.builder()
            .region(Region.AP_NORTHEAST_2)
            .credentialsProvider(credentialsProvider)
            .build()
        
        return s3Client.use { client ->
            val response = client.listBuckets()
            response.buckets().map { bucket ->
                val bucketRegion = try {
                    client.getBucketLocation { it.bucket(bucket.name()) }.locationConstraintAsString()
                        ?.takeIf { it.isNotEmpty() } ?: "us-east-1"
                } catch (e: Exception) {
                    null
                }
                S3Bucket(
                    name = bucket.name(),
                    creationDate = bucket.creationDate(),
                    region = bucketRegion,
                    accountId = account.accountId,
                    accountName = account.accountName
                )
            }
        }
    }
    
    private fun fetchVPCs(account: AwsAccount, region: String): List<VPC> {
        val credentialsProvider = getCredentialsProvider(account, region)
        
        val ec2Client = Ec2Client.builder()
            .region(Region.of(region))
            .credentialsProvider(credentialsProvider)
            .build()
        
        return ec2Client.use { client ->
            val response = client.describeVpcs(DescribeVpcsRequest.builder().build())
            response.vpcs().map { vpc ->
                val nameTag = vpc.tags().find { it.key() == "Name" }?.value()
                VPC(
                    vpcId = vpc.vpcId(),
                    cidrBlock = vpc.cidrBlock(),
                    state = vpc.stateAsString(),
                    isDefault = vpc.isDefault(),
                    name = nameTag,
                    accountId = account.accountId,
                    accountName = account.accountName,
                    region = region
                )
            }
        }
    }
}
