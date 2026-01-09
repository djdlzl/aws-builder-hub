package co.spoonradio.awsbuilderhub.advice

import co.spoonradio.awsbuilderhub.advice.protocol.ErrorResponse
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.AuthenticationException
import org.springframework.validation.FieldError
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import java.time.LocalDateTime

@RestControllerAdvice
class GlobalExceptionAdvice {

    private val logger = LoggerFactory.getLogger(GlobalExceptionAdvice::class.java)

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidationExceptions(ex: MethodArgumentNotValidException): ResponseEntity<ErrorResponse> {
        val errors = ex.bindingResult.allErrors.associate { error ->
            val fieldName = (error as? FieldError)?.field ?: "unknown"
            val errorMessage = error.defaultMessage ?: "Invalid value"
            fieldName to errorMessage
        }

        logger.warn("Validation error: {}", errors)

        return ResponseEntity.badRequest().body(
            ErrorResponse(
                status = HttpStatus.BAD_REQUEST.value(),
                error = "Validation Error",
                message = "Invalid request parameters",
                timestamp = LocalDateTime.now(),
                details = errors
            )
        )
    }

    @ExceptionHandler(IllegalArgumentException::class)
    fun handleIllegalArgumentException(ex: IllegalArgumentException): ResponseEntity<ErrorResponse> {
        logger.warn("Illegal argument: {}", ex.message)

        return ResponseEntity.badRequest().body(
            ErrorResponse(
                status = HttpStatus.BAD_REQUEST.value(),
                error = "Bad Request",
                message = ex.message ?: "Invalid request",
                timestamp = LocalDateTime.now()
            )
        )
    }

    @ExceptionHandler(AccessDeniedException::class)
    fun handleAccessDeniedException(ex: AccessDeniedException): ResponseEntity<ErrorResponse> {
        logger.warn("Access denied: {}", ex.message)

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
            ErrorResponse(
                status = HttpStatus.FORBIDDEN.value(),
                error = "Forbidden",
                message = "Access denied. You don't have permission to access this resource.",
                timestamp = LocalDateTime.now()
            )
        )
    }

    @ExceptionHandler(AuthenticationException::class)
    fun handleAuthenticationException(ex: AuthenticationException): ResponseEntity<ErrorResponse> {
        logger.warn("Authentication error: {}", ex.message)

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
            ErrorResponse(
                status = HttpStatus.UNAUTHORIZED.value(),
                error = "Unauthorized",
                message = "Authentication required",
                timestamp = LocalDateTime.now()
            )
        )
    }

    @ExceptionHandler(Exception::class)
    fun handleGenericException(ex: Exception): ResponseEntity<ErrorResponse> {
        logger.error("Unexpected error", ex)

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
            ErrorResponse(
                status = HttpStatus.INTERNAL_SERVER_ERROR.value(),
                error = "Internal Server Error",
                message = "An unexpected error occurred",
                timestamp = LocalDateTime.now()
            )
        )
    }
}
