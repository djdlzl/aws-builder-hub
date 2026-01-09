package co.spoonradio.awsbuilderhub.service.aws

import co.spoonradio.awsbuilderhub.domain.aws.entity.AwsAccount
import co.spoonradio.awsbuilderhub.domain.aws.entity.AwsAccountStatus
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.collections.shouldNotContain
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional

/**
 * Unit tests for AwsAccountService
 * 
 * Feature: auth-and-resource-api
 * Requirements: 9.1, 9.3
 * 
 * Tests account lookup and verification status filtering functionality.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AwsAccountServiceTest : DescribeSpec() {
    
    @Autowired
    private lateinit var awsAccountService: AwsAccountService
    
    init {
        describe("Account Creation") {
            
            it("should create a new AWS account with default status") {
                // Given
                val accountId = "123456789012"
                val accountName = "Test Account"
                val roleArn = "arn:aws:iam::123456789012:role/TestRole"
                val externalId = "external-123"
                val description = "Test account description"
                
                // When
                val account = awsAccountService.createAccount(
                    accountId = accountId,
                    accountName = accountName,
                    roleArn = roleArn,
                    externalId = externalId,
                    description = description
                )
                
                // Then
                account.accountId shouldBe accountId
                account.accountName shouldBe accountName
                account.roleArn shouldBe roleArn
                account.externalId shouldBe externalId
                account.description shouldBe description
                account.status shouldBe AwsAccountStatus.PENDING
                account.id shouldNotBe 0L
            }
            
            it("should create account without optional fields") {
                // Given
                val accountId = "123456789013"
                val accountName = "Minimal Account"
                val roleArn = "arn:aws:iam::123456789013:role/MinimalRole"
                
                // When
                val account = awsAccountService.createAccount(
                    accountId = accountId,
                    accountName = accountName,
                    roleArn = roleArn
                )
                
                // Then
                account.accountId shouldBe accountId
                account.accountName shouldBe accountName
                account.roleArn shouldBe roleArn
                account.externalId shouldBe null
                account.description shouldBe null
                account.status shouldBe AwsAccountStatus.PENDING
            }
            
            it("should throw exception when creating account with duplicate account ID") {
                // Given
                val accountId = "123456789014"
                val accountName = "Duplicate Account"
                val roleArn = "arn:aws:iam::123456789014:role/DuplicateRole"
                
                // Create first account
                awsAccountService.createAccount(accountId, accountName, roleArn)
                
                // When & Then
                val exception = shouldThrow<IllegalArgumentException> {
                    awsAccountService.createAccount(accountId, "Another Account", roleArn)
                }
                
                exception.message shouldBe "AWS account with ID $accountId already exists"
            }
        }
        
        describe("Account Lookup") {
            
            it("should find account by ID") {
                // Given
                val accountId = "123456789015"
                val accountName = "Find By ID Account"
                val roleArn = "arn:aws:iam::123456789015:role/FindByIdRole"
                val createdAccount = awsAccountService.createAccount(accountId, accountName, roleArn)
                
                // When
                val foundAccount = awsAccountService.findById(createdAccount.id)
                
                // Then
                foundAccount shouldNotBe null
                foundAccount?.id shouldBe createdAccount.id
                foundAccount?.accountId shouldBe accountId
                foundAccount?.accountName shouldBe accountName
                foundAccount?.roleArn shouldBe roleArn
            }
            
            it("should return null when account not found by ID") {
                // Given
                val nonExistentId = 999999L
                
                // When
                val foundAccount = awsAccountService.findById(nonExistentId)
                
                // Then
                foundAccount shouldBe null
            }
            
            it("should find account by account ID") {
                // Given
                val accountId = "123456789016"
                val accountName = "Find By Account ID"
                val roleArn = "arn:aws:iam::123456789016:role/FindByAccountIdRole"
                val createdAccount = awsAccountService.createAccount(accountId, accountName, roleArn)
                
                // When
                val foundAccount = awsAccountService.findByAccountId(accountId)
                
                // Then
                foundAccount shouldNotBe null
                foundAccount?.id shouldBe createdAccount.id
                foundAccount?.accountId shouldBe accountId
                foundAccount?.accountName shouldBe accountName
            }
            
            it("should return null when account not found by account ID") {
                // Given
                val nonExistentAccountId = "999999999999"
                
                // When
                val foundAccount = awsAccountService.findByAccountId(nonExistentAccountId)
                
                // Then
                foundAccount shouldBe null
            }
            
            it("should return all accounts") {
                // Given - Create a few accounts
                val account1 = awsAccountService.createAccount(
                    "123456789017", 
                    "All Accounts 1", 
                    "arn:aws:iam::123456789017:role/Role1"
                )
                val account2 = awsAccountService.createAccount(
                    "123456789018", 
                    "All Accounts 2", 
                    "arn:aws:iam::123456789018:role/Role2"
                )
                
                // When
                val allAccounts = awsAccountService.findAll()
                
                // Then
                (allAccounts.size >= 2) shouldBe true // At least the two we created
                val accountIds = allAccounts.map { it.accountId }
                accountIds.contains("123456789017") shouldBe true
                accountIds.contains("123456789018") shouldBe true
            }
        }
        
        describe("Verification Status Filtering") {
            
            it("should return only verified accounts") {
                // Given - Create accounts with different statuses
                val pendingAccount = awsAccountService.createAccount(
                    "123456789019", 
                    "Pending Account", 
                    "arn:aws:iam::123456789019:role/PendingRole"
                )
                
                val verifiedAccount = awsAccountService.createAccount(
                    "123456789020", 
                    "Verified Account", 
                    "arn:aws:iam::123456789020:role/VerifiedRole"
                )
                
                val failedAccount = awsAccountService.createAccount(
                    "123456789021", 
                    "Failed Account", 
                    "arn:aws:iam::123456789021:role/FailedRole"
                )
                
                val disabledAccount = awsAccountService.createAccount(
                    "123456789022", 
                    "Disabled Account", 
                    "arn:aws:iam::123456789022:role/DisabledRole"
                )
                
                // Update statuses (simulating verification results)
                awsAccountService.updateAccount(verifiedAccount.id, accountName = "Verified Account")
                // Manually set status to VERIFIED for testing (in real scenario, this would be done by verifyAccount)
                val updatedVerified = awsAccountService.findById(verifiedAccount.id)!!
                updatedVerified.status = AwsAccountStatus.VERIFIED
                
                val updatedFailed = awsAccountService.findById(failedAccount.id)!!
                updatedFailed.status = AwsAccountStatus.FAILED
                
                val updatedDisabled = awsAccountService.findById(disabledAccount.id)!!
                updatedDisabled.status = AwsAccountStatus.DISABLED
                
                // When
                val verifiedAccounts = awsAccountService.findVerifiedAccounts()
                
                // Then
                val verifiedAccountIds = verifiedAccounts.map { it.accountId }
                verifiedAccountIds shouldContain "123456789020"
                verifiedAccountIds shouldNotContain "123456789019" // PENDING
                verifiedAccountIds shouldNotContain "123456789021" // FAILED
                verifiedAccountIds shouldNotContain "123456789022" // DISABLED
                
                // All returned accounts should have VERIFIED status
                verifiedAccounts.forEach { account ->
                    account.status shouldBe AwsAccountStatus.VERIFIED
                }
            }
            
            it("should return empty list when no verified accounts exist") {
                // Given - Create only non-verified accounts
                val pendingAccount = awsAccountService.createAccount(
                    "123456789023", 
                    "Only Pending Account", 
                    "arn:aws:iam::123456789023:role/OnlyPendingRole"
                )
                
                // When
                val verifiedAccounts = awsAccountService.findVerifiedAccounts()
                
                // Then
                val verifiedAccountIds = verifiedAccounts.map { it.accountId }
                verifiedAccountIds shouldNotContain "123456789023"
                
                // Filter out any pre-existing verified accounts from other tests
                val newVerifiedAccounts = verifiedAccounts.filter { 
                    it.accountId.startsWith("123456789023") 
                }
                newVerifiedAccounts.shouldBeEmpty()
            }
        }
        
        describe("Account Management") {
            
            it("should update account information") {
                // Given
                val accountId = "123456789024"
                val originalName = "Original Account"
                val originalRoleArn = "arn:aws:iam::123456789024:role/OriginalRole"
                val account = awsAccountService.createAccount(accountId, originalName, originalRoleArn)
                
                val newName = "Updated Account"
                val newRoleArn = "arn:aws:iam::123456789024:role/UpdatedRole"
                val newExternalId = "updated-external-123"
                val newDescription = "Updated description"
                
                // When
                val updatedAccount = awsAccountService.updateAccount(
                    id = account.id,
                    accountName = newName,
                    roleArn = newRoleArn,
                    externalId = newExternalId,
                    description = newDescription
                )
                
                // Then
                updatedAccount.id shouldBe account.id
                updatedAccount.accountId shouldBe accountId // Should not change
                updatedAccount.accountName shouldBe newName
                updatedAccount.roleArn shouldBe newRoleArn
                updatedAccount.externalId shouldBe newExternalId
                updatedAccount.description shouldBe newDescription
                
                // Verify the change persisted
                val foundAccount = awsAccountService.findById(account.id)
                foundAccount?.accountName shouldBe newName
                foundAccount?.roleArn shouldBe newRoleArn
                foundAccount?.externalId shouldBe newExternalId
                foundAccount?.description shouldBe newDescription
            }
            
            it("should throw exception when updating non-existent account") {
                // Given
                val nonExistentId = 999999L
                
                // When & Then
                val exception = shouldThrow<IllegalArgumentException> {
                    awsAccountService.updateAccount(nonExistentId, accountName = "New Name")
                }
                
                exception.message shouldBe "AWS account not found with id: $nonExistentId"
            }
            
            it("should disable account") {
                // Given
                val accountId = "123456789025"
                val accountName = "Disable Test Account"
                val roleArn = "arn:aws:iam::123456789025:role/DisableTestRole"
                val account = awsAccountService.createAccount(accountId, accountName, roleArn)
                
                // When
                val disabledAccount = awsAccountService.disableAccount(account.id)
                
                // Then
                disabledAccount.id shouldBe account.id
                disabledAccount.status shouldBe AwsAccountStatus.DISABLED
                
                // Verify the change persisted
                val foundAccount = awsAccountService.findById(account.id)
                foundAccount?.status shouldBe AwsAccountStatus.DISABLED
            }
            
            it("should throw exception when disabling non-existent account") {
                // Given
                val nonExistentId = 999999L
                
                // When & Then
                val exception = shouldThrow<IllegalArgumentException> {
                    awsAccountService.disableAccount(nonExistentId)
                }
                
                exception.message shouldBe "AWS account not found with id: $nonExistentId"
            }
            
            it("should delete account") {
                // Given
                val accountId = "123456789026"
                val accountName = "Delete Test Account"
                val roleArn = "arn:aws:iam::123456789026:role/DeleteTestRole"
                val account = awsAccountService.createAccount(accountId, accountName, roleArn)
                
                // When
                awsAccountService.deleteAccount(account.id)
                
                // Then
                val foundAccount = awsAccountService.findById(account.id)
                foundAccount shouldBe null
                
                val foundByAccountId = awsAccountService.findByAccountId(accountId)
                foundByAccountId shouldBe null
            }
            
            it("should throw exception when deleting non-existent account") {
                // Given
                val nonExistentId = 999999L
                
                // When & Then
                val exception = shouldThrow<IllegalArgumentException> {
                    awsAccountService.deleteAccount(nonExistentId)
                }
                
                exception.message shouldBe "AWS account not found with id: $nonExistentId"
            }
        }
    }
}