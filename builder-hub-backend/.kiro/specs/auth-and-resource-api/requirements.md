# Requirements Document

## Introduction

AWS Builder Hub 백엔드의 인증 시스템과 AWS 리소스 조회 API에 대한 요구사항 문서입니다. 이 시스템은 사용자 인증(로컬 로그인, Okta OAuth2)을 처리하고, 인증된 사용자가 연결된 AWS 계정의 리소스(EC2, RDS, S3, VPC)를 조회할 수 있도록 합니다.

## Glossary

- **Auth_System**: 사용자 인증을 처리하는 시스템 (JWT 토큰 발급, 검증)
- **JWT_Token_Provider**: JWT 토큰을 생성하고 검증하는 컴포넌트
- **User_Service**: 사용자 정보를 관리하는 서비스
- **Resource_Service**: AWS 리소스를 조회하는 서비스
- **AWS_Account**: 연결된 AWS 계정 정보 (Account ID, Role ARN, External ID)
- **Assume_Role**: AWS STS를 통해 다른 계정의 역할을 임시로 획득하는 방식
- **RBAC**: Role-Based Access Control, 역할 기반 접근 제어

## Requirements

### Requirement 1: 로컬 로그인 인증

**User Story:** As a 사용자, I want to 이메일과 비밀번호로 로그인, so that 시스템에 접근할 수 있다.

#### Acceptance Criteria

1. WHEN 사용자가 유효한 이메일과 비밀번호로 로그인 요청을 보내면 THEN Auth_System SHALL JWT 토큰과 사용자 정보를 반환한다
2. WHEN 사용자가 존재하지 않는 이메일로 로그인 요청을 보내면 THEN Auth_System SHALL 401 Unauthorized 응답을 반환한다
3. WHEN 사용자가 잘못된 비밀번호로 로그인 요청을 보내면 THEN Auth_System SHALL 401 Unauthorized 응답을 반환한다
4. WHEN 비활성화된 사용자가 로그인 요청을 보내면 THEN Auth_System SHALL 401 Unauthorized 응답을 반환한다
5. THE JWT_Token_Provider SHALL 사용자 ID, 이메일, 역할 정보를 토큰에 포함한다

### Requirement 2: JWT 토큰 검증

**User Story:** As a 시스템, I want to JWT 토큰을 검증, so that 인증된 요청만 처리할 수 있다.

#### Acceptance Criteria

1. WHEN 유효한 JWT 토큰이 포함된 요청이 들어오면 THEN Auth_System SHALL 사용자 인증 정보를 SecurityContext에 설정한다
2. WHEN 만료된 JWT 토큰이 포함된 요청이 들어오면 THEN Auth_System SHALL 인증 실패로 처리한다
3. WHEN 잘못된 서명의 JWT 토큰이 포함된 요청이 들어오면 THEN Auth_System SHALL 인증 실패로 처리한다
4. WHEN Authorization 헤더가 없는 요청이 보호된 엔드포인트에 들어오면 THEN Auth_System SHALL 401 Unauthorized 응답을 반환한다
5. FOR ALL 유효한 JWT 토큰, JWT_Token_Provider SHALL 토큰에서 사용자 ID, 이메일, 역할을 정확히 추출한다 (round-trip property)

### Requirement 3: 사용자 등록

**User Story:** As a 신규 사용자, I want to 계정을 등록, so that 시스템을 사용할 수 있다.

#### Acceptance Criteria

1. WHEN 유효한 이메일, 이름, 비밀번호로 등록 요청을 보내면 THEN User_Service SHALL 새 사용자를 생성하고 JWT 토큰을 반환한다
2. WHEN 이미 존재하는 이메일로 등록 요청을 보내면 THEN User_Service SHALL 409 Conflict 응답을 반환한다
3. THE User_Service SHALL 비밀번호를 BCrypt로 암호화하여 저장한다
4. THE User_Service SHALL 새 사용자에게 기본 역할(DEVELOPER)을 부여한다

### Requirement 4: 현재 사용자 정보 조회

**User Story:** As a 인증된 사용자, I want to 내 정보를 조회, so that 현재 로그인 상태를 확인할 수 있다.

#### Acceptance Criteria

1. WHEN 인증된 사용자가 /api/v1/auth/me 엔드포인트를 호출하면 THEN Auth_System SHALL 사용자 ID, 이메일, 이름, 역할을 반환한다
2. WHEN 인증되지 않은 요청이 /api/v1/auth/me 엔드포인트를 호출하면 THEN Auth_System SHALL 401 Unauthorized 응답을 반환한다

### Requirement 5: EC2 인스턴스 조회

**User Story:** As a 인증된 사용자, I want to EC2 인스턴스 목록을 조회, so that AWS 리소스 현황을 파악할 수 있다.

#### Acceptance Criteria

1. WHEN 인증된 사용자가 EC2 목록을 요청하면 THEN Resource_Service SHALL 검증된 모든 AWS 계정의 EC2 인스턴스를 반환한다
2. WHEN accountId 파라미터가 제공되면 THEN Resource_Service SHALL 해당 계정의 EC2 인스턴스만 반환한다
3. WHEN region 파라미터가 제공되면 THEN Resource_Service SHALL 해당 리전의 EC2 인스턴스만 반환한다
4. THE Resource_Service SHALL 각 EC2 인스턴스에 대해 instanceId, name, instanceType, state, IP 주소, availabilityZone, launchTime, accountId, accountName, region 정보를 포함한다
5. IF AWS API 호출이 실패하면 THEN Resource_Service SHALL 해당 계정/리전을 건너뛰고 다른 결과를 반환한다

### Requirement 6: RDS 인스턴스 조회

**User Story:** As a 인증된 사용자, I want to RDS 인스턴스 목록을 조회, so that 데이터베이스 현황을 파악할 수 있다.

#### Acceptance Criteria

1. WHEN 인증된 사용자가 RDS 목록을 요청하면 THEN Resource_Service SHALL 검증된 모든 AWS 계정의 RDS 인스턴스를 반환한다
2. WHEN accountId 파라미터가 제공되면 THEN Resource_Service SHALL 해당 계정의 RDS 인스턴스만 반환한다
3. WHEN region 파라미터가 제공되면 THEN Resource_Service SHALL 해당 리전의 RDS 인스턴스만 반환한다
4. THE Resource_Service SHALL 각 RDS 인스턴스에 대해 dbInstanceIdentifier, dbInstanceClass, engine, engineVersion, status, endpoint, port, availabilityZone, allocatedStorage, accountId, accountName, region 정보를 포함한다
5. IF AWS API 호출이 실패하면 THEN Resource_Service SHALL 해당 계정/리전을 건너뛰고 다른 결과를 반환한다

### Requirement 7: S3 버킷 조회

**User Story:** As a 인증된 사용자, I want to S3 버킷 목록을 조회, so that 스토리지 현황을 파악할 수 있다.

#### Acceptance Criteria

1. WHEN 인증된 사용자가 S3 목록을 요청하면 THEN Resource_Service SHALL 검증된 모든 AWS 계정의 S3 버킷을 반환한다
2. WHEN accountId 파라미터가 제공되면 THEN Resource_Service SHALL 해당 계정의 S3 버킷만 반환한다
3. THE Resource_Service SHALL 각 S3 버킷에 대해 name, creationDate, region, accountId, accountName 정보를 포함한다
4. IF AWS API 호출이 실패하면 THEN Resource_Service SHALL 해당 계정을 건너뛰고 다른 결과를 반환한다

### Requirement 8: VPC 조회

**User Story:** As a 인증된 사용자, I want to VPC 목록을 조회, so that 네트워크 현황을 파악할 수 있다.

#### Acceptance Criteria

1. WHEN 인증된 사용자가 VPC 목록을 요청하면 THEN Resource_Service SHALL 검증된 모든 AWS 계정의 VPC를 반환한다
2. WHEN accountId 파라미터가 제공되면 THEN Resource_Service SHALL 해당 계정의 VPC만 반환한다
3. WHEN region 파라미터가 제공되면 THEN Resource_Service SHALL 해당 리전의 VPC만 반환한다
4. THE Resource_Service SHALL 각 VPC에 대해 vpcId, cidrBlock, state, isDefault, name, accountId, accountName, region 정보를 포함한다
5. IF AWS API 호출이 실패하면 THEN Resource_Service SHALL 해당 계정/리전을 건너뛰고 다른 결과를 반환한다

### Requirement 9: AWS 계정 Assume Role

**User Story:** As a 시스템, I want to AWS 계정에 Assume Role로 접근, so that 다중 계정의 리소스를 조회할 수 있다.

#### Acceptance Criteria

1. THE Resource_Service SHALL STS AssumeRole을 사용하여 대상 AWS 계정의 임시 자격 증명을 획득한다
2. WHEN External ID가 설정된 계정이면 THEN Resource_Service SHALL AssumeRole 요청에 External ID를 포함한다
3. THE Resource_Service SHALL 검증된(VERIFIED) 상태의 AWS 계정만 리소스 조회에 사용한다
4. IF AssumeRole이 실패하면 THEN Resource_Service SHALL 해당 계정을 건너뛰고 로그를 기록한다

### Requirement 10: 역할 기반 접근 제어

**User Story:** As a 시스템 관리자, I want to 역할에 따라 접근을 제어, so that 보안을 유지할 수 있다.

#### Acceptance Criteria

1. THE Auth_System SHALL ADMIN과 DEVELOPER 두 가지 역할을 지원한다
2. WHEN ADMIN 역할의 사용자가 AWS 계정 관리 API를 호출하면 THEN Auth_System SHALL 접근을 허용한다
3. WHEN DEVELOPER 역할의 사용자가 AWS 계정 관리 API를 호출하면 THEN Auth_System SHALL 403 Forbidden 응답을 반환한다
4. WHEN ADMIN 또는 DEVELOPER 역할의 사용자가 리소스 조회 API를 호출하면 THEN Auth_System SHALL 접근을 허용한다
