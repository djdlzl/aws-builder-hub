package co.spoonradio.awsbuilderhub.domain.sso.repository

import co.spoonradio.awsbuilderhub.domain.sso.entity.SsoConfig
import co.spoonradio.awsbuilderhub.domain.sso.entity.SsoProvider
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.Optional

@Repository
interface SsoConfigRepository : JpaRepository<SsoConfig, Long> {
    fun findByProvider(provider: SsoProvider): Optional<SsoConfig>
    fun findByEnabledTrue(): Optional<SsoConfig>
    fun existsByEnabledTrue(): Boolean
}
