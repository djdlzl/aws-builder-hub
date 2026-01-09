package co.spoonradio.awsbuilderhub.controller.external

import co.spoonradio.awsbuilderhub.controller.protocol.aws.*
import co.spoonradio.awsbuilderhub.controller.protocol.common.SuccessListResponse
import co.spoonradio.awsbuilderhub.controller.protocol.common.SuccessResponse
import co.spoonradio.awsbuilderhub.controller.protocol.common.toSuccessListResponse
import co.spoonradio.awsbuilderhub.controller.protocol.common.toSuccessResponse
import co.spoonradio.awsbuilderhub.service.aws.AwsAccountService
import jakarta.validation.Valid
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/aws-accounts")
@PreAuthorize("hasRole('ADMIN')")
class AwsAccountController(
    private val awsAccountService: AwsAccountService
) {
    private val logger = LoggerFactory.getLogger(AwsAccountController::class.java)

    @GetMapping
    fun getAllAccounts(): ResponseEntity<SuccessListResponse<List<AwsAccountResponse>>> {
        val accounts = awsAccountService.findAll()
        return ResponseEntity.ok(accounts.map { AwsAccountResponse.from(it) }.toSuccessListResponse())
    }

    @GetMapping("/{id}")
    fun getAccount(@PathVariable id: Long): ResponseEntity<SuccessResponse<AwsAccountResponse>> {
        val account = awsAccountService.findById(id)
            ?: return ResponseEntity.notFound().build()
        
        return ResponseEntity.ok(AwsAccountResponse.from(account).toSuccessResponse())
    }

    @GetMapping("/verified")
    fun getVerifiedAccounts(): ResponseEntity<SuccessListResponse<List<AwsAccountResponse>>> {
        val accounts = awsAccountService.findVerifiedAccounts()
        return ResponseEntity.ok(accounts.map { AwsAccountResponse.from(it) }.toSuccessListResponse())
    }

    @PostMapping
    fun createAccount(
        @Valid @RequestBody request: CreateAwsAccountRequest
    ): ResponseEntity<SuccessResponse<AwsAccountResponse>> {
        logger.info("Creating AWS account: {} ({})", request.accountName, request.accountId)
        
        return try {
            val account = awsAccountService.createAccount(
                accountId = request.accountId,
                accountName = request.accountName,
                roleArn = request.roleArn,
                externalId = request.externalId,
                description = request.description
            )
            ResponseEntity.status(HttpStatus.CREATED).body(AwsAccountResponse.from(account).toSuccessResponse())
        } catch (e: IllegalArgumentException) {
            logger.warn("Failed to create AWS account: {}", e.message)
            ResponseEntity.status(HttpStatus.CONFLICT).build()
        }
    }

    @PutMapping("/{id}")
    fun updateAccount(
        @PathVariable id: Long,
        @Valid @RequestBody request: UpdateAwsAccountRequest
    ): ResponseEntity<SuccessResponse<AwsAccountResponse>> {
        logger.info("Updating AWS account: {}", id)
        
        return try {
            val account = awsAccountService.updateAccount(
                id = id,
                accountName = request.accountName,
                roleArn = request.roleArn,
                externalId = request.externalId,
                description = request.description
            )
            ResponseEntity.ok(AwsAccountResponse.from(account).toSuccessResponse())
        } catch (e: IllegalArgumentException) {
            logger.warn("Failed to update AWS account: {}", e.message)
            ResponseEntity.notFound().build()
        }
    }

    @PostMapping("/{id}/verify")
    fun verifyAccount(@PathVariable id: Long): ResponseEntity<SuccessResponse<AwsAccountVerificationResponse>> {
        logger.info("Verifying AWS account: {}", id)
        
        return try {
            val result = awsAccountService.verifyAccount(id)
            ResponseEntity.ok(
                AwsAccountVerificationResponse(
                    success = result.success,
                    accountId = result.accountId,
                    arn = result.arn,
                    message = result.message
                ).toSuccessResponse()
            )
        } catch (e: IllegalArgumentException) {
            logger.warn("Failed to verify AWS account: {}", e.message)
            ResponseEntity.notFound().build()
        }
    }

    @DeleteMapping("/{id}")
    fun deleteAccount(@PathVariable id: Long): ResponseEntity<Void> {
        logger.info("Deleting AWS account: {}", id)
        
        return try {
            awsAccountService.deleteAccount(id)
            ResponseEntity.noContent().build()
        } catch (e: IllegalArgumentException) {
            logger.warn("Failed to delete AWS account: {}", e.message)
            ResponseEntity.notFound().build()
        }
    }

    @PostMapping("/{id}/disable")
    fun disableAccount(@PathVariable id: Long): ResponseEntity<SuccessResponse<AwsAccountResponse>> {
        logger.info("Disabling AWS account: {}", id)
        
        return try {
            val account = awsAccountService.disableAccount(id)
            ResponseEntity.ok(AwsAccountResponse.from(account).toSuccessResponse())
        } catch (e: IllegalArgumentException) {
            logger.warn("Failed to disable AWS account: {}", e.message)
            ResponseEntity.notFound().build()
        }
    }
}
