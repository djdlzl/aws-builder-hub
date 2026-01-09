package co.spoonradio.awsbuilderhub

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class AwsBuilderHubApplication

fun main(args: Array<String>) {
    runApplication<AwsBuilderHubApplication>(*args)
}
