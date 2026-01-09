package co.spoonradio.awsbuilderhub.domain.aws.repository

import co.spoonradio.awsbuilderhub.domain.aws.entity.AwsAccount
import co.spoonradio.awsbuilderhub.domain.aws.entity.AwsAccountStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.Optional

@Repository
interface AwsAccountRepository : JpaRepository<AwsAccount, Long> {
    fun findByAccountId(accountId: String): Optional<AwsAccount>
    fun existsByAccountId(accountId: String): Boolean
    fun findByStatus(status: AwsAccountStatus): List<AwsAccount>
    fun findAllByStatusNot(status: AwsAccountStatus): List<AwsAccount>
}
