# AWS Builder Hub Backend

CloudForge AWS 리소스 관리 대시보드를 위한 백엔드 API 서버입니다.

## 기술 스택

| 항목            | 버전                       |
| --------------- | -------------------------- |
| **Java**        | 17+ (Amazon Corretto 권장) |
| **Kotlin**      | 2.1.0                      |
| **Spring Boot** | 3.4.1                      |
| **Gradle**      | 8.12                       |
| **AWS SDK**     | 2.29.45                    |

## 주요 기능

### 1. 인증 시스템

- **Okta OAuth2 로그인**: Okta를 통한 SSO 지원
- **JWT 토큰 기반 인증**: 로컬 로그인 및 API 인증
- **역할 기반 접근 제어 (RBAC)**: ADMIN, DEVELOPER 역할

### 2. 사용자 관리

- 사용자 등록/로그인
- 역할 관리 (Admin 전용)
- 사용자 비활성화

### 3. AWS 계정 관리 (Admin 전용)

- AWS 계정 등록 (Account ID, Role ARN, External ID)
- Assume Role을 통한 계정 연결 검증
- 다중 계정 관리

### 4. AWS 리소스 조회

- EC2 인스턴스 목록 조회
- S3 버킷 목록 조회
- RDS 인스턴스 목록 조회

## 시작하기

### 사전 요구사항

- JDK 17 이상 (Amazon Corretto 권장)
- Gradle 8.x

### 환경 변수 설정

```bash
# Okta 설정
export OKTA_CLIENT_ID=your-okta-client-id
export OKTA_CLIENT_SECRET=your-okta-client-secret
export OKTA_ISSUER_URI=https://your-domain.okta.com/oauth2/default

# AWS 설정
export AWS_REGION=ap-northeast-2

# CORS 설정
export CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Admin 기본 비밀번호
export ADMIN_DEFAULT_PASSWORD=password
```

### 빌드 및 실행

```bash
# 빌드
./gradlew build

# 실행
./gradlew bootRun

# 테스트
./gradlew test
```

### 기본 계정

애플리케이션 시작 시 다음 기본 admin 계정이 생성됩니다:

| 아이디 | 비밀번호 | 역할  |
| ------ | -------- | ----- |
| admin  | password | ADMIN |

## API 문서

서버 실행 후 Swagger UI에서 API 문서를 확인할 수 있습니다:

- Swagger UI: <http://localhost:8080/swagger-ui.html>
- OpenAPI JSON: <http://localhost:8080/api-docs>

## API 엔드포인트

### 인증 (`/api/v1/auth`)

| Method | Endpoint          | 설명                    |
| ------ | ----------------- | ----------------------- |
| POST   | `/login`          | 로컬 로그인             |
| POST   | `/register`       | 사용자 등록             |
| GET    | `/me`             | 현재 사용자 정보        |
| GET    | `/oauth2/success` | OAuth2 로그인 성공 콜백 |

### 사용자 관리 (`/api/v1/users`)

| Method | Endpoint        | 권한       | 설명             |
| ------ | --------------- | ---------- | ---------------- |
| GET    | `/`             | ADMIN      | 전체 사용자 목록 |
| GET    | `/{id}`         | ADMIN/본인 | 사용자 정보 조회 |
| PUT    | `/{id}/role`    | ADMIN      | 사용자 역할 변경 |
| POST   | `/{id}/disable` | ADMIN      | 사용자 비활성화  |

### AWS 계정 관리 (`/api/v1/aws-accounts`)

| Method | Endpoint        | 권한  | 설명                 |
| ------ | --------------- | ----- | -------------------- |
| GET    | `/`             | ADMIN | 전체 AWS 계정 목록   |
| GET    | `/{id}`         | ADMIN | AWS 계정 상세        |
| GET    | `/verified`     | ADMIN | 검증된 AWS 계정 목록 |
| POST   | `/`             | ADMIN | AWS 계정 등록        |
| PUT    | `/{id}`         | ADMIN | AWS 계정 수정        |
| POST   | `/{id}/verify`  | ADMIN | AWS 계정 연결 검증   |
| DELETE | `/{id}`         | ADMIN | AWS 계정 삭제        |
| POST   | `/{id}/disable` | ADMIN | AWS 계정 비활성화    |

### AWS 리소스 조회 (`/api/v1/resources`)

| Method | Endpoint                    | 설명              |
| ------ | --------------------------- | ----------------- |
| GET    | `/accounts/{accountId}/ec2` | EC2 인스턴스 목록 |
| GET    | `/accounts/{accountId}/s3`  | S3 버킷 목록      |
| GET    | `/accounts/{accountId}/rds` | RDS 인스턴스 목록 |

## AWS 계정 연결 방법

### 1. IAM Role 생성

대상 AWS 계정에서 다음과 같은 IAM Role을 생성합니다:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::SOURCE_ACCOUNT_ID:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "YOUR_EXTERNAL_ID"
        }
      }
    }
  ]
}
```

### 2. 필요한 권한 정책

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*",
        "s3:ListAllMyBuckets",
        "s3:GetBucketLocation",
        "rds:Describe*",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

### 3. API를 통한 계정 등록

```bash
curl -X POST http://localhost:8080/api/v1/aws-accounts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "123456789012",
    "accountName": "Production Account",
    "roleArn": "arn:aws:iam::123456789012:role/AwsBuilderHubRole",
    "externalId": "your-external-id",
    "description": "Production AWS account"
  }'
```

### 4. 계정 연결 검증

```bash
curl -X POST http://localhost:8080/api/v1/aws-accounts/1/verify \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 프로젝트 구조

```text
src/main/kotlin/co/spoonradio/awsbuilderhub/
├── AwsBuilderHubApplication.kt
├── api/
│   ├── controller/
│   │   ├── AuthController.kt
│   │   ├── AwsAccountController.kt
│   │   ├── AwsResourceController.kt
│   │   ├── HealthController.kt
│   │   └── UserController.kt
│   ├── dto/
│   │   ├── AuthDto.kt
│   │   └── AwsAccountDto.kt
│   └── exception/
│       └── GlobalExceptionHandler.kt
├── config/
│   ├── AwsConfig.kt
│   ├── DataInitializer.kt
│   └── SecurityConfig.kt
├── domain/
│   ├── aws/
│   │   ├── entity/
│   │   │   └── AwsAccount.kt
│   │   ├── repository/
│   │   │   └── AwsAccountRepository.kt
│   │   └── service/
│   │       ├── AwsAccountService.kt
│   │       └── AwsResourceService.kt
│   └── user/
│       ├── entity/
│       │   └── User.kt
│       ├── repository/
│       │   └── UserRepository.kt
│       └── service/
│           └── UserService.kt
└── security/
    ├── CustomOAuth2UserService.kt
    ├── JwtAuthenticationFilter.kt
    └── JwtTokenProvider.kt
```

## 라이선스

Proprietary - SpoonRadio
