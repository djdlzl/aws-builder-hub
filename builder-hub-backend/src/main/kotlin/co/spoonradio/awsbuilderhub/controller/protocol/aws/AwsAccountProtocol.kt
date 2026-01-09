package co.spoonradio.awsbuilderhub.controller.protocol.aws

import co.spoonradio.awsbuilderhub.domain.aws.entity.AwsAccount
import co.spoonradio.awsbuilderhub.domain.aws.entity.AwsAccountStatus
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.time.LocalDateTime

data class CreateAwsAccountRequest(
    @field:NotBlank(message = "Account ID is required")
    @field:Pattern(regexp = "^[0-9]{12}$", message = "Account ID must be 12 digits")
    val accountId: String,

    @field:NotBlank(message = "Account name is required")
    @field:Size(min = 1, max = 100, message = "Account name must be between 1 and 100 characters")
    val accountName: String,

    @field:NotBlank(message = "Role ARN is required")
    @field:Pattern(
        regexp = "^arn:aws:iam::[0-9]{12}:role/.+$",
        message = "Invalid Role ARN format"
    )
    val roleArn: String,

    val externalId: String? = null,

    @field:Size(max = 500, message = "Description must be less than 500 characters")
    val description: String? = null
)

data class UpdateAwsAccountRequest(
    @field:Size(min = 1, max = 100, message = "Account name must be between 1 and 100 characters")
    val accountName: String? = null,

    @field:Pattern(
        regexp = "^arn:aws:iam::[0-9]{12}:role/.+$",
        message = "Invalid Role ARN format"
    )
    val roleArn: String? = null,

    val externalId: String? = null,

    @field:Size(max = 500, message = "Description must be less than 500 characters")
    val description: String? = null
)

data class AwsAccountResponse(
    val id: Long,
    val accountId: String,
    val accountName: String,
    val roleArn: String,
    val externalId: String?,
    val description: String?,
    val status: AwsAccountStatus,
    val lastVerifiedAt: LocalDateTime?,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime
) {
    companion object {
        fun from(account: AwsAccount): AwsAccountResponse {
            return AwsAccountResponse(
                id = account.id,
                accountId = account.accountId,
                accountName = account.accountName,
                roleArn = account.roleArn,
                externalId = account.externalId,
                description = account.description,
                status = account.status,
                lastVerifiedAt = account.lastVerifiedAt,
                createdAt = account.createdAt,
                updatedAt = account.updatedAt
            )
        }
    }
}

data class AwsAccountVerificationResponse(
    val success: Boolean,
    val accountId: String?,
    val arn: String?,
    val message: String
)
