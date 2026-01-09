package co.spoonradio.awsbuilderhub.config

import co.spoonradio.awsbuilderhub.domain.user.entity.User
import co.spoonradio.awsbuilderhub.domain.user.entity.UserRole
import co.spoonradio.awsbuilderhub.domain.user.repository.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.CommandLineRunner
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.crypto.password.PasswordEncoder

@Configuration
class DataInitializer(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    @Value("\${app.admin.default-password}") private val adminDefaultPassword: String
) {
    private val logger = LoggerFactory.getLogger(DataInitializer::class.java)

    @Bean
    fun initializeData(): CommandLineRunner {
        return CommandLineRunner {
            initializeAdminUser()
        }
    }

    private fun initializeAdminUser() {
        val adminUsername = "admin"
        
        if (!userRepository.existsByEmail(adminUsername)) {
            val adminUser = User(
                email = adminUsername,
                name = "Administrator",
                password = passwordEncoder.encode(adminDefaultPassword),
                role = UserRole.ADMIN,
                enabled = true
            )
            
            userRepository.save(adminUser)
            logger.info("Created default admin user: {}", adminUsername)
            logger.info("Admin password: {}", adminDefaultPassword)
        } else {
            logger.debug("Admin user already exists: {}", adminUsername)
        }
    }
}
