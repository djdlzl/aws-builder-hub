package co.spoonradio.awsbuilderhub.controller.protocol.auth

import jakarta.validation.constraints.NotBlank

data class LoginRequest(
    @field:NotBlank(message = "아이디를 입력해주세요")
    val username: String,
    @field:NotBlank(message = "비밀번호를 입력해주세요")
    val password: String
)

data class RegisterRequest(
    @field:NotBlank(message = "이메일을 입력해주세요")
    val email: String,
    @field:NotBlank(message = "이름을 입력해주세요")
    val name: String,
    @field:NotBlank(message = "비밀번호를 입력해주세요")
    val password: String
)

data class AuthResponse(
    val accessToken: String,
    val expiresIn: Long,
    val user: UserResponse
)

data class UserResponse(
    val id: Long,
    val email: String,
    val name: String,
    val role: String
)

data class OAuth2SuccessResponse(
    val message: String,
    val accessToken: String,
    val user: UserResponse
)
