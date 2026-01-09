package co.spoonradio.awsbuilderhub.service.aws

import co.spoonradio.awsbuilderhub.domain.aws.entity.AwsAccount

interface AwsAccountService {
    fun findAll(): List<AwsAccount>
    fun findById(id: Long): AwsAccount?
    fun findByAccountId(accountId: String): AwsAccount?
    fun findVerifiedAccounts(): List<AwsAccount>
    fun createAccount(
        accountId: String,
        accountName: String,
        roleArn: String,
        externalId: String? = null,
        description: String? = null
    ): AwsAccount
    fun updateAccount(
        id: Long,
        accountName: String? = null,
        roleArn: String? = null,
        externalId: String? = null,
        description: String? = null
    ): AwsAccount
    fun verifyAccount(id: Long): AwsAccountVerificationResult
    fun deleteAccount(id: Long)
    fun disableAccount(id: Long): AwsAccount
}

data class AwsAccountVerificationResult(
    val success: Boolean,
    val accountId: String?,
    val arn: String?,
    val message: String
)
