# Implementation Plan: Auth and Resource API

## Overview

AWS Builder Hub 백엔드의 인증 시스템과 AWS 리소스 조회 API 구현 계획입니다. 기존 코드를 기반으로 테스트 코드를 추가하고, 누락된 기능을 보완합니다.

## Tasks

- [x] 1. 테스트 환경 설정
  - Kotest property-based testing 의존성 추가
  - 테스트 설정 파일 구성
  - _Requirements: Testing Strategy_

- [x] 2. JWT 토큰 관련 테스트 구현
  - [x] 2.1 JwtTokenProvider 단위 테스트 작성
    - 토큰 생성, 검증, 클레임 추출 테스트
    - _Requirements: 2.1, 2.2, 2.3_
  - [x]* 2.2 Property Test: JWT Token Round-Trip
    - **Property 1: JWT Token Round-Trip**
    - *For any* 유효한 사용자 정보, 토큰 생성 후 추출하면 원래 정보와 동일
    - **Validates: Requirements 2.5**
  - [x]* 2.3 Property Test: Token Contains Required Claims
    - **Property 5: Token Contains Required Claims**
    - *For any* 생성된 JWT 토큰, userId, email, role 클레임 포함 확인
    - **Validates: Requirements 1.5**

- [x] 3. Checkpoint - JWT 테스트 확인
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. 사용자 서비스 테스트 구현
  - [x] 4.1 UserService 단위 테스트 작성
    - 사용자 생성, 조회, 비밀번호 검증 테스트
    - _Requirements: 3.1, 3.2_
  - [x]* 4.2 Property Test: Password Encryption Verification
    - **Property 2: Password Encryption Verification**
    - *For any* 평문 비밀번호, BCrypt 암호화 후 검증 시 true 반환
    - **Validates: Requirements 3.3**
  - [x]* 4.3 Property Test: New User Default Role
    - **Property 3: New User Default Role**
    - *For any* 새로 생성된 사용자, 기본 역할은 DEVELOPER
    - **Validates: Requirements 3.4**

- [x] 5. Checkpoint - 사용자 서비스 테스트 확인
  - Ensure all tests pass, ask the user if questions arise.

- [-] 6. 인증 컨트롤러 테스트 구현
  - [x] 6.1 AuthController 통합 테스트 작성
    - 로그인, 등록, 현재 사용자 조회 테스트
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 4.1, 4.2_
  - [ ]* 6.2 Property Test: Valid Login Returns Token
    - **Property 4: Valid Login Returns Token**
    - *For any* 활성화된 사용자와 올바른 비밀번호, 유효한 JWT 토큰 반환
    - **Validates: Requirements 1.1, 1.5**

- [x] 7. Checkpoint - 인증 테스트 확인
  - Ensure all tests pass, ask the user if questions arise.

- [-] 8. 리소스 서비스 테스트 구현
  - [x] 8.1 ResourceService 필터링 로직 단위 테스트 작성
    - accountId, region 필터링 테스트
    - _Requirements: 5.2, 5.3, 6.2, 6.3, 7.2, 8.2, 8.3_
  - [ ]* 8.2 Property Test: Account ID Filtering
    - **Property 6: Account ID Filtering**
    - *For any* 리소스 목록과 accountId 필터, 반환된 리소스의 accountId 일치
    - **Validates: Requirements 5.2, 6.2, 7.2, 8.2**
  - [ ]* 8.3 Property Test: Region Filtering
    - **Property 7: Region Filtering**
    - *For any* 리소스 목록과 region 필터, 반환된 리소스의 region 일치
    - **Validates: Requirements 5.3, 6.3, 8.3**
  - [ ]* 8.4 Property Test: Verified Accounts Only
    - **Property 8: Verified Accounts Only**
    - *For any* 리소스 조회, 사용되는 AWS 계정은 VERIFIED 상태
    - **Validates: Requirements 9.3**

- [x] 9. Checkpoint - 리소스 서비스 테스트 확인
  - Ensure all tests pass, ask the user if questions arise.

- [-] 10. AWS 계정 서비스 테스트 구현
  - [x] 10.1 AwsAccountService 단위 테스트 작성
    - 계정 조회, 검증 상태 필터링 테스트
    - _Requirements: 9.1, 9.3_
  - [ ]* 10.2 Property Test: External ID Inclusion
    - **Property 9: External ID Inclusion**
    - *For any* External ID가 설정된 계정, AssumeRole 요청에 External ID 포함
    - **Validates: Requirements 9.2**

- [x] 11. Checkpoint - AWS 계정 테스트 확인
  - Ensure all tests pass, ask the user if questions arise.

- [-] 12. 역할 기반 접근 제어 테스트 구현
  - [x] 12.1 SecurityConfig 통합 테스트 작성 ✅
    - 역할별 API 접근 권한 테스트
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [ ]* 12.2 Property Test: Role-Based Access Control
    - **Property 10: Role-Based Access Control**
    - *For any* API 요청과 사용자 역할, 적절한 접근 권한 적용
    - **Validates: Requirements 10.2, 10.3, 10.4**

- [x] 13. 리소스 컨트롤러 통합 테스트 구현
  - [x] 13.1 ResourceController 통합 테스트 작성
    - EC2, RDS, S3, VPC 조회 API 테스트
    - Mock AWS 응답 사용
    - _Requirements: 5.1, 5.4, 6.1, 6.4, 7.1, 7.3, 8.1, 8.4_

- [x] 14. Final Checkpoint - 전체 테스트 확인
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- 기존 코드가 이미 구현되어 있으므로 주로 테스트 코드 작성에 집중
- Property tests는 Kotest property-based testing 사용
- AWS API 호출이 필요한 테스트는 Mock 사용
- 각 checkpoint에서 테스트 통과 확인 후 다음 단계 진행
