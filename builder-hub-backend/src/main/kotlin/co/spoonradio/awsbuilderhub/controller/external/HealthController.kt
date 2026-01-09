package co.spoonradio.awsbuilderhub.controller.external

import co.spoonradio.awsbuilderhub.controller.protocol.common.SuccessResponse
import co.spoonradio.awsbuilderhub.controller.protocol.common.toSuccessResponse
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDateTime

@RestController
@RequestMapping("/api/v1")
class HealthController {

    @GetMapping("/health")
    fun health(): ResponseEntity<SuccessResponse<HealthResponse>> {
        return ResponseEntity.ok(
            HealthResponse(
                status = "UP",
                timestamp = LocalDateTime.now(),
                service = "aws-builder-hub-backend"
            ).toSuccessResponse()
        )
    }
}

data class HealthResponse(
    val status: String,
    val timestamp: LocalDateTime,
    val service: String
)
