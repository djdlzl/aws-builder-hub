package co.spoonradio.awsbuilderhub.advice.protocol

import java.time.LocalDateTime

data class ErrorResponse(
    val status: Int,
    val error: String,
    val message: String,
    val timestamp: LocalDateTime,
    val details: Map<String, String>? = null
)
