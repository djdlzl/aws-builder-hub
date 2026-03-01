# Builder Hub Backend - 아키텍처 분석

**마지막 업데이트**: 2026년 2월 25일

## 1. 기술 스택

**핵심**:
- **언어**: Kotlin 2.1.0 + Java 17
- **프레임워크**: Spring Boot 3.4.1
- **빌드**: Gradle 8.12

**AWS & 인프라**:
- AWS SDK v2 (2.29.45): EC2, RDS, S3, IAM, STS, SSM, NetworkManager
- PostgreSQL 14 (Flyway 마이그레이션)
- Redis 6+ (10분 TTL 캐싱)

**보안/인증**:
- Spring Security + OAuth2 (Okta SSO)
- JWT (jjwt 0.12.6)
- Spring Actuator

**테스트**: JUnit 5, MockK, Kotest (Property-based)

---

## 2. 전체 디렉토리/패키지 구조

```
builder-hub-backend/
├── src/main/kotlin/co/spoonradio/awsbuilderhub/
│   ├── AwsBuilderHubApplication.kt (진입점, @EnableScheduling)
│   ├── config/ (Spring 설정)
│   │   ├── AwsConfig.kt (AWS SDK 설정)
│   │   ├── SecurityConfig.kt
│   │   ├── WebSocketConfig.kt
│   │   └── RedisConfig.kt
│   ├── controller/external/ (14개 REST API)
│   │   ├── AwsAccountController.kt
│   │   ├── UserController.kt
│   │   ├── AuthController.kt
│   │   ├── AwsResourceController.kt (EC2/RDS/S3)
│   │   ├── NetworkTopologyController.kt
│   │   ├── InstanceRequestController.kt
│   │   ├── MaintenanceController.kt
│   │   ├── SsmController.kt
│   │   └── ...
│   ├── domain/ (Clean Architecture)
│   │   ├── aws/ (AWS 계정 관리)
│   │   ├── user/ (사용자 관리)
│   │   ├── provisioning/ (EC2 프로비저닝)
│   │   ├── resource/ (EC2/RDS/S3 리소스)
│   │   ├── network/ (네트워크 토폴로지)
│   │   ├── maintenance/ (유지보수)
│   │   └── sso/ (SSO 설정)
│   ├── service/ (43개+ 비즈니스 로직)
│   │   ├── aws/ (AwsAccountService)
│   │   ├── user/ (UserService)
│   │   ├── resource/ (ResourceService)
│   │   └── maintenance/ (MaintenanceService)
│   ├── security/ (인증/인가)
│   │   ├── JwtTokenProvider.kt
│   │   ├── JwtAuthenticationFilter.kt
│   │   ├── CustomOAuth2UserService.kt
│   │   └── CustomUserDetailsService.kt
│   ├── scheduler/ (정기 작업)
│   │   ├── ResourceSyncScheduler.kt (5분)
│   │   └── NetworkTopologyScheduler.kt (10분)
│   ├── websocket/ (실시간 통신)
│   │   ├── NetworkTopologyWebSocketHandler.kt
│   │   └── SsmWebSocketHandler.kt
│   └── exception/ (예외 처리)
│       ├── AwsException.kt
│       └── GlobalExceptionHandler.kt
├── src/main/resources/
│   ├── application.yml (서버:8080, 설정)
│   └── db/migration/
│       ├── V1__init_schema.sql (초기 스키마)
│       └── V2__instance_templates.sql (템플릿)
└── build.gradle.kts (의존성 정의)
```

---

## 3. 도메인 구조 (기능별 분석)

### 3.1 AWS 계정 관리 (`domain/aws/`)
**엔티티**: `AwsAccount.kt`
- 필드: id, accountId (12자리), accountName, roleArn, externalId, status, lastVerifiedAt
- 상태: PENDING, VERIFIED, FAILED, DISABLED
- 테이블: `aws_accounts` (12개 컬럼, UNIQUE accountId)

**서비스**: `AwsAccountService`
- 인터페이스 + `DefaultAwsAccountService` 구현
- 핵심 메서드:
  - `verifyAccount(id)`: STS AssumeRole → 임시 자격증명 발급 → 검증
  - `findAll/findById/findByAccountId/findVerifiedAccounts`
  - `createAccount/updateAccount/deleteAccount/disableAccount`

**리포지토리**: `AwsAccountRepository`
- `findByAccountId(accountId): Optional<AwsAccount>`
- `findByStatus(status): List<AwsAccount>`
- `existsByAccountId(accountId): Boolean`

### 3.2 리소스 관리 (`domain/resource/`)
**엔티티**:
- `Ec2InstanceEntity`: instance_id, name, instance_type, state, public/private_ip, availability_zone, account_id, region
- `RdsInstanceEntity`: db_instance_identifier, db_instance_class, engine, engine_version, status, endpoint, port
- `S3BucketEntity`: bucket_name, creation_date, region, account_id
- `VpcEntity`: vpc_id, cidr_block, state, is_default, name, account_id, region

**테이블 인덱싱**:
- EC2: `(account_id, region)`, `instance_id`
- RDS: `(account_id, region)`, `db_instance_identifier`
- S3: `account_id`, `bucket_name`
- VPC: `(account_id, region)`, `vpc_id`

### 3.3 프로비저닝 워크플로우 (`domain/provisioning/`)
**엔티티**:
- `InstanceTemplate`: 템플릿 기본 설정
- `InstanceRequest`: 요청 → 승인 → 배포 워크플로우
- 모듈: TAG, NETWORK, SECURITY_GROUP, AMI, KEYPAIR, VOLUME, USER_DATA, INSTANCE_OPTIONS
- 각 모듈은 Template/Request 버전 존재

**구조**:
```
InstanceTemplate (Template)
├── TemplateModuleTag (태그 기본값)
├── TemplateModuleNetworkConfig (VPC/Subnet)
├── TemplateModuleSecurityGroup (보안그룹)
├── TemplateModuleAmiConfig (AMI)
└── ...

InstanceRequest (사용자 요청)
├── InstanceRequestTag (요청 태그)
├── InstanceRequestNetworkConfig
└── ... (Template과 동일 구조)
```

### 3.4 네트워크 토폴로지 (`domain/network/`)
**핵심 데이터**:
- 계층: Account → Region → VPC → Subnet → Gateway
- 엣지 타입: VPC_PEERING, CLOUDWAN, GATEWAY, ROUTE, TRANSIT_GATEWAY
- 라우팅: destinationCidr, target, targetType, state

### 3.5 유지보수 (`domain/maintenance/`)
**엔티티**: `ShutdownScheduleEntity`
- scheduled_at, reason, is_active
- EC2 자동 종료 스케줄 관리

### 3.6 사용자 & SSO (`domain/user/`, `domain/sso/`)
**User**: id, email, name, password, role(ADMIN/DEVELOPER), okta_user_id, enabled
**SsoConfig**: provider, protocol, client_id, client_secret, issuer_uri, jwks_uri 등

---

## 4. 엔티티/테이블 구조 (DB 스키마 패턴)

### 핵심 규칙
1. **PK**: BIGSERIAL (자동 증가)
2. **타임스탬프**: created_at, updated_at (TIMESTAMP NOT NULL)
3. **@PreUpdate**: updatedAt = LocalDateTime.now()
4. **외래키**: FK + ON DELETE CASCADE/SET NULL
5. **인덱싱**: account_id, region, resource_id (복합)

### 주요 테이블
```sql
users                      -- 사용자 (email UNIQUE)
aws_accounts              -- AWS 계정 (account_id UNIQUE)
ec2_instances             -- EC2 캐시 (account_id, region 인덱스)
rds_instances             -- RDS 캐시
s3_buckets                -- S3 캐시
vpcs                      -- VPC 캐시
shutdown_schedules        -- EC2 자동 종료
sso_config                -- OAuth2/Okta 설정
modules                   -- 프로비저닝 모듈
module_items              -- 모듈 항목 (module_id, item_key UNIQUE)
mandatory_tag_keys        -- 필수 태그 정의
instance_templates        -- EC2 템플릿
instance_requests         -- 프로비저닝 요청
instance_request_modules  -- 요청-모듈 연결
```

---

## 5. 컨트롤러/서비스/레포지토리 패턴

### 5.1 계층 구조
```
Controller (@RestController)
  ↓ (DTO 변환, 권한 검증)
Service (Interface + Default구현)
  ↓ (비즈니스 로직)
Repository (JpaRepository)
  ↓ (DB 접근)
Entity (JPA @Entity)
```

### 5.2 API 구조
**패턴**: `/api/v1/{resource}`

**예: AwsAccountController**
```kotlin
@RestController
@RequestMapping("/api/v1/aws-accounts")
@PreAuthorize("hasRole('ADMIN')")
class AwsAccountController(
  private val awsAccountService: AwsAccountService
) {
  @GetMapping                    // GET /api/v1/aws-accounts
  @GetMapping("/{id}")
  @GetMapping("/verified")       // GET /api/v1/aws-accounts/verified
  @PostMapping                   // POST /api/v1/aws-accounts
  @PutMapping("/{id}")
  @PostMapping("/{id}/verify")   // POST /api/v1/aws-accounts/{id}/verify
  @PostMapping("/{id}/disable")
  @DeleteMapping("/{id}")
}
```

**응답 형식**:
```kotlin
// 단일 응답
SuccessResponse<T>(result = data)

// 리스트 응답
SuccessListResponse<List<T>>(results = dataList)

// 페이지 응답
PaginationResponse<List<T>>(results = dataList, pagination = PaginationInfo)
```

### 5.3 서비스 패턴 (Clean Architecture)

**인터페이스 + 구현분리**:
```kotlin
// 인터페이스
interface AwsAccountService {
  fun findAll(): List<AwsAccount>
  fun verifyAccount(id: Long): AwsAccountVerificationResult
}

// 구현 (Default 접두사)
@Service
@Transactional(readOnly = true)
class DefaultAwsAccountService(
  private val awsAccountRepository: AwsAccountRepository,
  private val stsClient: StsClient
) : AwsAccountService {
  @Transactional  // 쓰기 메서드에만 명시
  override fun verifyAccount(id: Long) { ... }
}
```

**트랜잭션 규칙**:
- `@Transactional(readOnly = true)` 클래스 레벨
- `@Transactional` 메서드 레벨 (쓰기)

### 5.4 DTO (Protocol) 패턴

**Request DTO**:
```kotlin
@Valid
data class CreateAwsAccountRequest(
  @field:NotBlank
  @field:Pattern(regexp = "^[0-9]{12}$")
  val accountId: String,

  @field:NotBlank
  @field:Size(min = 1, max = 100)
  val accountName: String,

  @field:NotBlank
  @field:Pattern(regexp = "^arn:aws:iam::[0-9]{12}:role/.+$")
  val roleArn: String,

  val externalId: String? = null,
)
```

**Response DTO**:
```kotlin
data class AwsAccountResponse(
  val id: Long,
  val accountId: String,
  val status: AwsAccountStatus,
  val createdAt: LocalDateTime,
  val updatedAt: LocalDateTime
) {
  companion object {
    fun from(entity: AwsAccount): AwsAccountResponse = ...
  }
}
```

---

## 6. build.gradle.kts (의존성 분석)

### 주요 의존성
```gradle
// Spring Boot Starters
spring-boot-starter-web           // REST API
spring-boot-starter-security      // 인증/인가
spring-boot-starter-oauth2-client // Okta SSO
spring-boot-starter-data-jpa      // ORM
spring-boot-starter-websocket     // 실시간
spring-boot-starter-actuator      // 헬스 체크

// AWS SDK v2
aws-sdk-bom:2.29.45
  - sts, ec2, s3, rds, iam, ssm, networkmanager

// 데이터베이스
postgresql (14+)
h2 (개발용)
flyway-core:11.2.0 (마이그레이션)

// 캐싱/실시간
spring-boot-starter-data-redis    // Redis
spring-boot-starter-websocket

// 보안
jjwt:0.12.6 (JWT)

// 로깅/모니터링
spring-boot-starter-actuator

// 테스트
junit-jupiter
mockk:1.13.8
kotest:5.8.0 (Property-based)
spring-security-test
```

---

## 7. application.yml (설정 패턴)

**핵심 설정**:
```yaml
server.port: 8080

spring:
  datasource:
    url: ${DB_URL:jdbc:postgresql://postgres:5432/awsbuilderdb}
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 30000

  jpa:
    hibernate.ddl-auto: validate
    database-platform: PostgreSQL

  data.redis:
    host: ${REDIS_HOST:redis}
    port: ${REDIS_PORT:6379}

aws.region: ${AWS_REGION:ap-northeast-2}

app:
  cors.allowed-origins: http://localhost:5173,https://builder.devspoon.net
  redis.enabled: true

network.topology.websocket.enabled: false
```

---

## 8. API 엔드포인트 패턴

### 8.1 인증 (`/api/v1/auth`)
```
POST   /login            -- 로컬 로그인
POST   /register         -- 사용자 등록
GET    /me              -- 현재 사용자
GET    /oauth2/success  -- OAuth2 콜백
```

### 8.2 AWS 계정 (`/api/v1/aws-accounts`)
```
GET    /                 -- 전체 조회
GET    /{id}             -- 상세 조회
GET    /verified         -- 검증된 계정만
POST   /                 -- 계정 등록
PUT    /{id}             -- 계정 수정
POST   /{id}/verify      -- 계정 검증
POST   /{id}/disable     -- 계정 비활성화
DELETE /{id}             -- 계정 삭제
```

### 8.3 리소스 조회 (`/api/resources`)
```
GET    /accounts/{accountId}/ec2      -- EC2 리스트
GET    /accounts/{accountId}/rds      -- RDS 리스트
GET    /accounts/{accountId}/s3       -- S3 리스트
GET    /accounts/{accountId}/vpc      -- VPC 리스트
```

### 8.4 네트워크 토폴로지 (`/api/network-topology`)
```
GET    /                              -- 조회
POST   /refresh                       -- 수동 갱신
GET    /cache-status                 -- 캐시 상태
GET    /sync-progress                -- 동기화 진행률
WS     /ws/topology                  -- WebSocket 피드
```

### 8.5 인스턴스 프로비저닝 (`/api/instance-requests`)
```
GET    /                              -- 요청 목록
GET    /{id}                          -- 요청 상세
POST   /                              -- 요청 생성
POST   /{id}/approve                 -- 승인
POST   /{id}/deploy                  -- 배포
```

---

## 9. EKS 업그레이드 기능 추가 시 맞춰야 할 패턴

### 9.1 도메인 구조
```
domain/eks/
├── entity/
│   ├── EksCluster.kt               -- EKS 클러스터 정보
│   ├── EksClusterVersion.kt        -- 버전 정보
│   ├── EksUpgradeTask.kt           -- 업그레이드 작업
│   └── EksUpgradeSchedule.kt       -- 스케줄
├── repository/
│   ├── EksClusterRepository.kt
│   ├── EksUpgradeTaskRepository.kt
│   └── EksUpgradeScheduleRepository.kt
└── service/
    ├── EksClusterService.kt (인터페이스)
    └── DefaultEksClusterService.kt
```

### 9.2 엔티티 패턴
```kotlin
@Entity
@Table(name = "eks_clusters")
class EksCluster(
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  val id: Long = 0,

  @Column(unique = true, nullable = false)
  val clusterName: String,

  @Column(nullable = false)
  val accountId: String,  // AWS 계정 ID (다중 계정 지원!)

  @Column(nullable = false)
  val region: String,

  @Column(nullable = false)
  var clusterVersion: String,  // 현재 버전

  @Column(nullable = false)
  var status: EksClusterStatus = EksClusterStatus.ACTIVE,

  @Column(nullable = true)
  var lastUpgradedAt: LocalDateTime? = null,

  @Column(nullable = false)
  val createdAt: LocalDateTime = LocalDateTime.now(),

  @Column(nullable = false)
  var updatedAt: LocalDateTime = LocalDateTime.now()
) {
  @PreUpdate
  fun preUpdate() { updatedAt = LocalDateTime.now() }
}

enum class EksClusterStatus {
  CREATING, ACTIVE, UPDATING, DELETING, FAILED
}
```

### 9.3 서비스 패턴
```kotlin
interface EksClusterService {
  fun findByAccountId(accountId: String): List<EksCluster>
  fun getClusterDetails(accountId: String, clusterName: String): EksClusterResponse
  fun listAvailableVersions(accountId: String, clusterName: String): List<String>
  fun startUpgrade(accountId: String, clusterName: String, targetVersion: String): EksUpgradeTask
  fun checkUpgradeStatus(accountId: String, taskId: Long): EksUpgradeResponse
  fun scheduleUpgrade(request: ScheduleEksUpgradeRequest): EksUpgradeSchedule
}

@Service
@Transactional(readOnly = true)
class DefaultEksClusterService(
  private val eksClusterRepository: EksClusterRepository,
  private val eksRepository: EksRepository,  // AWS EKS Client
  private val awsAccountService: AwsAccountService,
  private val redisTemplate: RedisTemplate<String, String>
) : EksClusterService {
  @Transactional
  override fun startUpgrade(accountId: String, clusterName: String, targetVersion: String) {
    // 1단계: 캐시 확인
    val cached = getCachedCluster(accountId, clusterName)

    // 2단계: STS AssumeRole (다중 계정!)
    val credentials = stsAssumeRole(accountId)

    // 3단계: EKS API로 업그레이드 시작
    val eksClient = createEksClient(credentials)
    eksClient.updateClusterVersion { ... }

    // 4단계: 작업 기록 및 캐시 무효화
    val task = EksUpgradeTask(...)
    eksUpgradeTaskRepository.save(task)
    invalidateCache(accountId)
  }
}
```

### 9.4 컨트롤러 패턴
```kotlin
@RestController
@RequestMapping("/api/v1/eks")
@PreAuthorize("hasRole('ADMIN')")
class EksClusterController(
  private val eksClusterService: EksClusterService
) {
  @GetMapping("/accounts/{accountId}")
  fun getClustersByAccount(@PathVariable accountId: String): ResponseEntity<...> {
    val clusters = eksClusterService.findByAccountId(accountId)
    return ResponseEntity.ok(clusters.map { EksClusterResponse.from(it) }.toSuccessListResponse())
  }

  @GetMapping("/{clusterName}/versions")
  fun getAvailableVersions(
    @RequestParam accountId: String,
    @PathVariable clusterName: String
  ): ResponseEntity<...> {
    val versions = eksClusterService.listAvailableVersions(accountId, clusterName)
    return ResponseEntity.ok(versions.toSuccessListResponse())
  }

  @PostMapping("/{clusterName}/upgrade")
  fun startUpgrade(
    @RequestParam accountId: String,
    @PathVariable clusterName: String,
    @Valid @RequestBody request: StartEksUpgradeRequest
  ): ResponseEntity<...> {
    val task = eksClusterService.startUpgrade(accountId, clusterName, request.targetVersion)
    return ResponseEntity.status(HttpStatus.ACCEPTED)
      .body(EksUpgradeResponse.from(task).toSuccessResponse())
  }
}
```

### 9.5 데이터베이스 마이그레이션
```sql
-- V3__eks_support.sql
CREATE TABLE eks_clusters (
  id BIGSERIAL PRIMARY KEY,
  cluster_name VARCHAR(100) NOT NULL UNIQUE,
  account_id VARCHAR(12) NOT NULL,
  region VARCHAR(50) NOT NULL,
  cluster_version VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  last_upgraded_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE(account_id, cluster_name, region)
);

CREATE TABLE eks_upgrade_tasks (
  id BIGSERIAL PRIMARY KEY,
  cluster_id BIGINT NOT NULL,
  source_version VARCHAR(20) NOT NULL,
  target_version VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (cluster_id) REFERENCES eks_clusters(id) ON DELETE CASCADE
);

CREATE TABLE eks_upgrade_schedules (
  id BIGSERIAL PRIMARY KEY,
  cluster_id BIGINT NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  target_version VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (cluster_id) REFERENCES eks_clusters(id) ON DELETE CASCADE
);

CREATE INDEX idx_eks_account_region ON eks_clusters(account_id, region);
CREATE INDEX idx_eks_upgrade_cluster ON eks_upgrade_tasks(cluster_id);
CREATE INDEX idx_eks_schedule_cluster ON eks_upgrade_schedules(cluster_id);
```

### 9.6 DTO 패턴
```kotlin
data class StartEksUpgradeRequest(
  @field:NotBlank
  val targetVersion: String,

  val scheduledAt: LocalDateTime? = null  // 지연 업그레이드
)

data class EksClusterResponse(
  val id: Long,
  val clusterName: String,
  val accountId: String,
  val region: String,
  val clusterVersion: String,
  val status: EksClusterStatus,
  val lastUpgradedAt: LocalDateTime?,
  val createdAt: LocalDateTime,
  val updatedAt: LocalDateTime
) {
  companion object {
    fun from(entity: EksCluster) = EksClusterResponse(...)
  }
}

data class EksUpgradeResponse(
  val taskId: Long,
  val clusterName: String,
  val sourceVersion: String,
  val targetVersion: String,
  val status: String,
  val createdAt: LocalDateTime
)
```

### 9.7 캐싱 전략
```kotlin
// 캐시 키
"eks:clusters:$accountId"           // 계정별 클러스터 목록
"eks:cluster:$accountId:$clusterName"  // 특정 클러스터
"eks:versions:$accountId:$clusterName"  // 사용 가능 버전

// 무효화
redisTemplate.delete("eks:clusters:$accountId")
redisTemplate.delete("eks:cluster:$accountId:$clusterName")
```

### 9.8 ⚠️ 필수 준수사항
1. **accountId 파라미터 필수**: STS AssumeRole로 다중 계정 지원
2. **빈 컬렉션 null 금지**: `emptyList()` 사용
3. **캐시 무효화**: 업그레이드 후 반드시 캐시 삭제
4. **트랜잭션**: 데이터 변경은 `@Transactional` 명시
5. **응답 형식**: `toSuccessResponse()` / `toSuccessListResponse()` 사용

---

## 10. 주요 코딩 컨벤션

### Kotlin 네이밍
- **클래스**: PascalCase (Ec2ResourceService)
- **함수**: camelCase (fetchVpcHierarchy)
- **상수**: UPPER_SNAKE_CASE (DEFAULT_TTL_MINUTES)
- **변수**: camelCase (vpcId)

### 인터페이스 + 구현
```
interface: XxxService
구현체: DefaultXxxService (@Service)
```

### DTO null 안전성
```kotlin
// ✅ 필수
tags: Map<String, String> = emptyMap()
subnets: List<SubnetHierarchy> = emptyList()

// ❌ 위험
tags: Map<String, String>? = null  // 금지
```

### AWS 호출 흐름 (다중 계정)
```
1. accountId 파라미터
2. DB에서 AwsAccount 조회 (roleArn, externalId)
3. STS AssumeRole → 임시 자격증명
4. AWS SDK Client 생성 (임시 자격증명)
5. AWS API 호출
6. Redis 캐싱 (키에 accountId 포함!)
```

---

## 11. 성능 최적화 전략

### 캐싱 (10분 TTL)
- AWS 리소스 데이터
- 네트워크 토폴로지
- 사용자 권한 (선택)

### 데이터베이스 최적화
- 복합 인덱싱: (account_id, region)
- Fetch Join (N+1 쿼리 방지)
- 배치 처리 (조회 최소화)

### AWS SDK 최적화
- STS 자격증명 캐싱 (15분)
- 연결 풀링
- 배치 API 활용

---

## 12. EKS 통합 체크리스트

추가 시 확인해야 할 항목:
- [ ] EKS API 권한 (IAM 정책 추가)
- [ ] 네트워크 토폴로지와 통합
- [ ] SSO 배포 파이프라인 (GitOps)
- [ ] 모니터링 (CloudWatch 메트릭)
- [ ] 롤백 전략
- [ ] 사전/사후 체크 (Pod, Worker Node)

