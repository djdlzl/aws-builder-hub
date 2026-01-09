package co.spoonradio.awsbuilderhub.controller.protocol.resource

import java.time.Instant

data class EC2InstanceResponse(
    val instanceId: String,
    val name: String?,
    val instanceType: String,
    val state: String,
    val publicIpAddress: String?,
    val privateIpAddress: String?,
    val availabilityZone: String,
    val launchTime: Instant?,
    val accountId: String,
    val accountName: String,
    val region: String
)

data class RDSInstanceResponse(
    val dbInstanceIdentifier: String,
    val dbInstanceClass: String,
    val engine: String,
    val engineVersion: String,
    val status: String,
    val endpoint: String?,
    val port: Int?,
    val availabilityZone: String?,
    val allocatedStorage: Int,
    val accountId: String,
    val accountName: String,
    val region: String
)

data class S3BucketResponse(
    val name: String,
    val creationDate: Instant?,
    val region: String?,
    val accountId: String,
    val accountName: String
)

data class VPCResponse(
    val vpcId: String,
    val cidrBlock: String,
    val state: String,
    val isDefault: Boolean,
    val name: String?,
    val accountId: String,
    val accountName: String,
    val region: String
)

data class EC2Instance(
    val instanceId: String,
    val name: String?,
    val instanceType: String,
    val state: String,
    val publicIpAddress: String?,
    val privateIpAddress: String?,
    val availabilityZone: String,
    val launchTime: Instant?,
    val accountId: String,
    val accountName: String,
    val region: String
) {
    fun toResponse() = EC2InstanceResponse(
        instanceId = instanceId,
        name = name,
        instanceType = instanceType,
        state = state,
        publicIpAddress = publicIpAddress,
        privateIpAddress = privateIpAddress,
        availabilityZone = availabilityZone,
        launchTime = launchTime,
        accountId = accountId,
        accountName = accountName,
        region = region
    )
}

data class RDSInstance(
    val dbInstanceIdentifier: String,
    val dbInstanceClass: String,
    val engine: String,
    val engineVersion: String,
    val status: String,
    val endpoint: String?,
    val port: Int?,
    val availabilityZone: String?,
    val allocatedStorage: Int,
    val accountId: String,
    val accountName: String,
    val region: String
) {
    fun toResponse() = RDSInstanceResponse(
        dbInstanceIdentifier = dbInstanceIdentifier,
        dbInstanceClass = dbInstanceClass,
        engine = engine,
        engineVersion = engineVersion,
        status = status,
        endpoint = endpoint,
        port = port,
        availabilityZone = availabilityZone,
        allocatedStorage = allocatedStorage,
        accountId = accountId,
        accountName = accountName,
        region = region
    )
}

data class S3Bucket(
    val name: String,
    val creationDate: Instant?,
    val region: String?,
    val accountId: String,
    val accountName: String
) {
    fun toResponse() = S3BucketResponse(
        name = name,
        creationDate = creationDate,
        region = region,
        accountId = accountId,
        accountName = accountName
    )
}

data class VPC(
    val vpcId: String,
    val cidrBlock: String,
    val state: String,
    val isDefault: Boolean,
    val name: String?,
    val accountId: String,
    val accountName: String,
    val region: String
) {
    fun toResponse() = VPCResponse(
        vpcId = vpcId,
        cidrBlock = cidrBlock,
        state = state,
        isDefault = isDefault,
        name = name,
        accountId = accountId,
        accountName = accountName,
        region = region
    )
}
