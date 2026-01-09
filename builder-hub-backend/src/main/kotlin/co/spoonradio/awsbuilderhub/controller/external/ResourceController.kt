package co.spoonradio.awsbuilderhub.controller.external

import co.spoonradio.awsbuilderhub.controller.protocol.common.SuccessListResponse
import co.spoonradio.awsbuilderhub.controller.protocol.common.toSuccessListResponse
import co.spoonradio.awsbuilderhub.controller.protocol.resource.*
import co.spoonradio.awsbuilderhub.service.resource.ResourceService
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/resources")
class ResourceController(
    private val resourceService: ResourceService
) {
    
    @GetMapping("/ec2")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVELOPER')")
    fun listEC2Instances(
        @RequestParam(required = false) accountId: Long?,
        @RequestParam(required = false) region: String?
    ): SuccessListResponse<List<EC2InstanceResponse>> {
        return resourceService.listEC2Instances(accountId, region)
            .map { it.toResponse() }
            .toSuccessListResponse()
    }
    
    @GetMapping("/rds")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVELOPER')")
    fun listRDSInstances(
        @RequestParam(required = false) accountId: Long?,
        @RequestParam(required = false) region: String?
    ): SuccessListResponse<List<RDSInstanceResponse>> {
        return resourceService.listRDSInstances(accountId, region)
            .map { it.toResponse() }
            .toSuccessListResponse()
    }
    
    @GetMapping("/s3")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVELOPER')")
    fun listS3Buckets(
        @RequestParam(required = false) accountId: Long?
    ): SuccessListResponse<List<S3BucketResponse>> {
        return resourceService.listS3Buckets(accountId)
            .map { it.toResponse() }
            .toSuccessListResponse()
    }
    
    @GetMapping("/vpc")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVELOPER')")
    fun listVPCs(
        @RequestParam(required = false) accountId: Long?,
        @RequestParam(required = false) region: String?
    ): SuccessListResponse<List<VPCResponse>> {
        return resourceService.listVPCs(accountId, region)
            .map { it.toResponse() }
            .toSuccessListResponse()
    }
}
