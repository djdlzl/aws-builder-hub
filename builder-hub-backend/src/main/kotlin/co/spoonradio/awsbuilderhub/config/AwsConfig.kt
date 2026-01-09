package co.spoonradio.awsbuilderhub.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.ec2.Ec2Client
import software.amazon.awssdk.services.iam.IamClient
import software.amazon.awssdk.services.rds.RdsClient
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.sts.StsClient

@Configuration
class AwsConfig(
    @Value("\${aws.region}") private val region: String
) {

    @Bean
    fun stsClient(): StsClient {
        return StsClient.builder()
            .region(Region.of(region))
            .build()
    }

    @Bean
    fun ec2Client(): Ec2Client {
        return Ec2Client.builder()
            .region(Region.of(region))
            .build()
    }

    @Bean
    fun s3Client(): S3Client {
        return S3Client.builder()
            .region(Region.of(region))
            .build()
    }

    @Bean
    fun rdsClient(): RdsClient {
        return RdsClient.builder()
            .region(Region.of(region))
            .build()
    }

    @Bean
    fun iamClient(): IamClient {
        return IamClient.builder()
            .region(Region.AWS_GLOBAL)
            .build()
    }
}
