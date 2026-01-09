package co.spoonradio.awsbuilderhub.service.aws

import co.spoonradio.awsbuilderhub.domain.aws.entity.AwsAccount
import co.spoonradio.awsbuilderhub.domain.aws.entity.AwsAccountStatus
import co.spoonradio.awsbuilderhub.domain.aws.repository.AwsAccountRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import software.amazon.awssdk.services.sts.StsClient
import software.amazon.awssdk.services.sts.model.AssumeRoleRequest
import software.amazon.awssdk.services.sts.model.GetCallerIdentityRequest
import java.time.LocalDateTime

@Service
@Transactional(readOnly = true)
class DefaultAwsAccountService(
    private val awsAccountRepository: AwsAccountRepository,
    private val stsClient: StsClient
) : AwsAccountService {
    private val logger = LoggerFactory.getLogger(DefaultAwsAccountService::class.java)

    override fun findAll(): List<AwsAccount> {
        return awsAccountRepository.findAll()
    }

    override fun findById(id: Long): AwsAccount? {
        return awsAccountRepository.findById(id).orElse(null)
    }

    override fun findByAccountId(accountId: String): AwsAccount? {
        return awsAccountRepository.findByAccountId(accountId).orElse(null)
    }

    override fun findVerifiedAccounts(): List<AwsAccount> {
        return awsAccountRepository.findByStatus(AwsAccountStatus.VERIFIED)
    }

    @Transactional
    override fun createAccount(
        accountId: String,
        accountName: String,
        roleArn: String,
        externalId: String?,
        description: String?
    ): AwsAccount {
        if (awsAccountRepository.existsByAccountId(accountId)) {
            throw IllegalArgumentException("AWS account with ID $accountId already exists")
        }

        val account = AwsAccount(
            accountId = accountId,
            accountName = accountName,
            roleArn = roleArn,
            externalId = externalId,
            description = description,
            status = AwsAccountStatus.PENDING
        )

        return awsAccountRepository.save(account)
    }

    @Transactional
    override fun updateAccount(
        id: Long,
        accountName: String?,
        roleArn: String?,
        externalId: String?,
        description: String?
    ): AwsAccount {
        val account = awsAccountRepository.findById(id)
            .orElseThrow { IllegalArgumentException("AWS account not found with id: $id") }

        accountName?.let { account.accountName = it }
        roleArn?.let { account.roleArn = it }
        externalId?.let { account.externalId = it }
        description?.let { account.description = it }

        return awsAccountRepository.save(account)
    }

    @Transactional
    override fun verifyAccount(id: Long): AwsAccountVerificationResult {
        val account = awsAccountRepository.findById(id)
            .orElseThrow { IllegalArgumentException("AWS account not found with id: $id") }

        return try {
            val assumeRoleRequest = AssumeRoleRequest.builder()
                .roleArn(account.roleArn)
                .roleSessionName("aws-builder-hub-verification")
                .durationSeconds(900)
                .apply {
                    account.externalId?.takeIf { it.isNotBlank() }?.let { externalId(it) }
                }
                .build()

            val assumeRoleResponse = stsClient.assumeRole(assumeRoleRequest)
            val credentials = assumeRoleResponse.credentials()

            val tempStsClient = StsClient.builder()
                .credentialsProvider {
                    software.amazon.awssdk.auth.credentials.AwsSessionCredentials.create(
                        credentials.accessKeyId(),
                        credentials.secretAccessKey(),
                        credentials.sessionToken()
                    )
                }
                .build()

            val callerIdentity = tempStsClient.getCallerIdentity(GetCallerIdentityRequest.builder().build())
            
            account.status = AwsAccountStatus.VERIFIED
            account.lastVerifiedAt = LocalDateTime.now()
            awsAccountRepository.save(account)

            logger.info("Successfully verified AWS account: {} ({})", account.accountName, account.accountId)

            AwsAccountVerificationResult(
                success = true,
                accountId = callerIdentity.account(),
                arn = callerIdentity.arn(),
                message = "Account verified successfully"
            )
        } catch (e: Exception) {
            logger.error("Failed to verify AWS account: {} - {}", account.accountId, e.message)
            
            account.status = AwsAccountStatus.FAILED
            awsAccountRepository.save(account)

            AwsAccountVerificationResult(
                success = false,
                accountId = account.accountId,
                arn = null,
                message = "Verification failed: ${e.message}"
            )
        }
    }

    @Transactional
    override fun deleteAccount(id: Long) {
        val account = awsAccountRepository.findById(id)
            .orElseThrow { IllegalArgumentException("AWS account not found with id: $id") }
        
        awsAccountRepository.delete(account)
        logger.info("Deleted AWS account: {} ({})", account.accountName, account.accountId)
    }

    @Transactional
    override fun disableAccount(id: Long): AwsAccount {
        val account = awsAccountRepository.findById(id)
            .orElseThrow { IllegalArgumentException("AWS account not found with id: $id") }
        
        account.status = AwsAccountStatus.DISABLED
        return awsAccountRepository.save(account)
    }
}
