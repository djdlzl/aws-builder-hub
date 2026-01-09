package co.spoonradio.awsbuilderhub

import org.junit.jupiter.api.Test

class AwsBuilderHubApplicationTests {

    @Test
    fun applicationClassExists() {
        // Verify the application class exists
        val appClass = AwsBuilderHubApplication::class.java
        assert(appClass.simpleName == "AwsBuilderHubApplication")
    }
}
