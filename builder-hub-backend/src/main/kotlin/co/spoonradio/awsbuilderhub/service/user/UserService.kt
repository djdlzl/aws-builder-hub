package co.spoonradio.awsbuilderhub.service.user

import co.spoonradio.awsbuilderhub.domain.user.entity.User
import co.spoonradio.awsbuilderhub.domain.user.entity.UserRole

interface UserService {
    fun findById(id: Long): User?
    fun findByEmail(email: String): User?
    fun findByOktaUserId(oktaUserId: String): User?
    fun findAll(): List<User>
    fun createUser(email: String, name: String, password: String? = null, role: UserRole = UserRole.DEVELOPER, oktaUserId: String? = null): User
    fun updateUserRole(userId: Long, role: UserRole): User
    fun disableUser(userId: Long): User
    fun validatePassword(user: User, rawPassword: String): Boolean
}
