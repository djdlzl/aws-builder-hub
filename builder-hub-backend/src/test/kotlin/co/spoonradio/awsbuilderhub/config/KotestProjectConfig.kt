package co.spoonradio.awsbuilderhub.config

import io.kotest.core.config.AbstractProjectConfig
import io.kotest.core.extensions.Extension
import io.kotest.extensions.spring.SpringExtension
import io.kotest.property.PropertyTesting

/**
 * Kotest project configuration for property-based testing.
 * 
 * Feature: auth-and-resource-api
 * 
 * Configuration:
 * - Minimum 100 iterations per property test
 * - Spring extension enabled for integration tests
 */
class KotestProjectConfig : AbstractProjectConfig() {
    
    init {
        // Configure property-based testing defaults
        PropertyTesting.defaultIterationCount = 100
    }
    
    override fun extensions(): List<Extension> = listOf(SpringExtension)
}
