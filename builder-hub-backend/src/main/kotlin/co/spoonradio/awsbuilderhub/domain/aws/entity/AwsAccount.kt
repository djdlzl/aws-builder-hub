package co.spoonradio.awsbuilderhub.domain.aws.entity

import jakarta.persistence.*
import java.time.LocalDateTime

@Entity
@Table(name = "aws_accounts")
class AwsAccount(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(unique = true, nullable = false, length = 12)
    val accountId: String,

    @Column(nullable = false)
    var accountName: String,

    @Column(nullable = false)
    var roleArn: String,

    @Column(nullable = true)
    var externalId: String? = null,

    @Column(nullable = true)
    var description: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: AwsAccountStatus = AwsAccountStatus.PENDING,

    @Column(nullable = true)
    var lastVerifiedAt: LocalDateTime? = null,

    @Column(nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),

    @Column(nullable = false)
    var updatedAt: LocalDateTime = LocalDateTime.now()
) {
    @PreUpdate
    fun preUpdate() {
        updatedAt = LocalDateTime.now()
    }
}

enum class AwsAccountStatus {
    PENDING,
    VERIFIED,
    FAILED,
    DISABLED
}
