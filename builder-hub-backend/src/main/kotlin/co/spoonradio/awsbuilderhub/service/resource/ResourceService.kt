package co.spoonradio.awsbuilderhub.service.resource

import co.spoonradio.awsbuilderhub.controller.protocol.resource.*

interface ResourceService {
    fun listEC2Instances(accountId: Long?, region: String?): List<EC2Instance>
    fun listRDSInstances(accountId: Long?, region: String?): List<RDSInstance>
    fun listS3Buckets(accountId: Long?): List<S3Bucket>
    fun listVPCs(accountId: Long?, region: String?): List<VPC>
}
