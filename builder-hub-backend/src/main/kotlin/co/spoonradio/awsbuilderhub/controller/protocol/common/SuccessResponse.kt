package co.spoonradio.awsbuilderhub.controller.protocol.common

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonInclude

@JsonIgnoreProperties(ignoreUnknown = true)
data class SuccessResponse<T>(
    @JsonInclude(JsonInclude.Include.NON_NULL)
    val result: T?,
)

fun <T : Any> T.toSuccessResponse() = SuccessResponse(this)
fun <T : Any> T?.toEmptySuccessResponse() = SuccessResponse(this ?: Unit)

@JsonIgnoreProperties(ignoreUnknown = true)
data class SuccessListResponse<T>(
    @JsonInclude(JsonInclude.Include.NON_NULL)
    val results: T?,
)

fun <T : Any> T.toSuccessListResponse() = SuccessListResponse(this)

@JsonIgnoreProperties(ignoreUnknown = true)
data class PaginationResponse<T>(
    val results: T?,
    val pagination: PaginationInfo
)

data class PaginationInfo(
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val hasNext: Boolean,
    val hasPrevious: Boolean
)

fun <T : Any> T.toPaginationResponse(pagination: PaginationInfo) = 
    PaginationResponse(this, pagination)
