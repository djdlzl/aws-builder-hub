package co.spoonradio.awsbuilderhub.service.user

import co.spoonradio.awsbuilderhub.domain.user.entity.User
import co.spoonradio.awsbuilderhub.domain.user.entity.UserRole
import co.spoonradio.awsbuilderhub.domain.user.repository.UserRepository
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class DefaultUserService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder
) : UserService {

    override fun findById(id: Long): User? {
        return userRepository.findById(id).orElse(null)
    }

    override fun findByEmail(email: String): User? {
        return userRepository.findByEmail(email).orElse(null)
    }

    override fun findByOktaUserId(oktaUserId: String): User? {
        return userRepository.findByOktaUserId(oktaUserId).orElse(null)
    }

    override fun findAll(): List<User> {
        return userRepository.findAll()
    }

    @Transactional
    override fun createUser(
        email: String,
        name: String,
        password: String?,
        role: UserRole,
        oktaUserId: String?
    ): User {
        if (userRepository.existsByEmail(email)) {
            throw IllegalArgumentException("User with email $email already exists")
        }

        val user = User(
            email = email,
            name = name,
            password = password?.let { passwordEncoder.encode(it) },
            role = role,
            oktaUserId = oktaUserId
        )

        return userRepository.save(user)
    }

    @Transactional
    override fun updateUserRole(userId: Long, role: UserRole): User {
        val user = userRepository.findById(userId)
            .orElseThrow { IllegalArgumentException("User not found with id: $userId") }
        
        user.role = role
        return userRepository.save(user)
    }

    @Transactional
    override fun disableUser(userId: Long): User {
        val user = userRepository.findById(userId)
            .orElseThrow { IllegalArgumentException("User not found with id: $userId") }
        
        user.enabled = false
        return userRepository.save(user)
    }

    override fun validatePassword(user: User, rawPassword: String): Boolean {
        return user.password?.let { passwordEncoder.matches(rawPassword, it) } ?: false
    }
}
