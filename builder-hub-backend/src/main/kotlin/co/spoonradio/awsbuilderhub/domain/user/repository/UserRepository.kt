package co.spoonradio.awsbuilderhub.domain.user.repository

import co.spoonradio.awsbuilderhub.domain.user.entity.User
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.Optional

@Repository
interface UserRepository : JpaRepository<User, Long> {
    fun findByEmail(email: String): Optional<User>
    fun findByOktaUserId(oktaUserId: String): Optional<User>
    fun existsByEmail(email: String): Boolean
}
