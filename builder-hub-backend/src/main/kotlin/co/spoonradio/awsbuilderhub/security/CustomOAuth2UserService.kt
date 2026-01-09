package co.spoonradio.awsbuilderhub.security

import co.spoonradio.awsbuilderhub.domain.user.entity.User
import co.spoonradio.awsbuilderhub.domain.user.entity.UserRole
import co.spoonradio.awsbuilderhub.domain.user.repository.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest
import org.springframework.security.oauth2.core.user.DefaultOAuth2User
import org.springframework.security.oauth2.core.user.OAuth2User
import org.springframework.stereotype.Service

@Service
class CustomOAuth2UserService(
    private val userRepository: UserRepository
) : DefaultOAuth2UserService() {

    private val logger = LoggerFactory.getLogger(CustomOAuth2UserService::class.java)

    override fun loadUser(userRequest: OAuth2UserRequest): OAuth2User {
        val oAuth2User = super.loadUser(userRequest)
        
        val email = oAuth2User.attributes["email"] as? String
            ?: throw IllegalArgumentException("Email not found in OAuth2 user attributes")
        
        val name = oAuth2User.attributes["name"] as? String ?: email.substringBefore("@")
        val oktaUserId = oAuth2User.attributes["sub"] as? String
        
        logger.debug("OAuth2 login attempt for email: {}", email)
        
        val user = userRepository.findByEmail(email).orElseGet {
            logger.info("Creating new user from Okta login: {}", email)
            userRepository.save(
                User(
                    email = email,
                    name = name,
                    oktaUserId = oktaUserId,
                    role = UserRole.DEVELOPER
                )
            )
        }.apply {
            if (this.oktaUserId == null && oktaUserId != null) {
                this.oktaUserId = oktaUserId
                userRepository.save(this)
            }
        }

        val authorities = listOf(SimpleGrantedAuthority("ROLE_${user.role.name}"))
        
        val attributes = oAuth2User.attributes.toMutableMap()
        attributes["userId"] = user.id
        attributes["userRole"] = user.role.name
        
        return DefaultOAuth2User(authorities, attributes, "email")
    }
}
