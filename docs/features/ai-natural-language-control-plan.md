# BuilderHub 자연어 제어 기능 구현 계획

**핵심 목표**: 사용자가 자연어로 명령하면, AI가 의도를 구조화된 액션으로 변환하고 기존 BuilderHub API를 안전하게 실행하도록 한다.

---

## 📋 배경 및 목표

- 현재 BuilderHub 프론트엔드는 AWS 리소스 조회/관리, 네트워크 토폴로지, 설정 기능을 이미 제공한다.
- API 호출은 `src/lib/api/*` 계층과 `src/config/api.ts` 엔드포인트 정의를 통해 일관되게 수행된다.
- 인증/권한은 `src/hooks/use-auth.tsx`의 토큰/역할(`isAdmin`, `hasRole`) 기반으로 제어된다.
- 목표는 기존 구조를 최대한 유지하면서, 자연어 입력을 "계획(Plan) -> 검증 -> 승인 -> 실행" 파이프라인으로 연결하는 것이다.

---

## 🔎 코드베이스 연동 지점 (확인 완료)

### 1) API/엔드포인트 레이어

- `src/config/api.ts`: 백엔드 엔드포인트 중앙 정의. AI 전용 엔드포인트를 여기에 추가.
- `src/lib/api/network-topology.ts`: `X-Request-ID`, 공통 에러 처리, 재시도(`withRetry`) 패턴 존재.
- `src/lib/api/tag-modules.ts`: 단순 CRUD + `parseResponse` 패턴 존재.
- 패턴 요약: `buildApiUrl` + `getAuthHeaders` + `fetch` + 명시적 fallback 에러 메시지.

### 2) 인증/권한 레이어

- `src/hooks/use-auth.tsx`: `access_token` 저장/검증, `isAdmin`, `hasRole` 제공.
- 위험 액션(삭제/변경/배포 성격)은 최소 `admin` role 또는 별도 권한 스코프 검사 필요.

### 3) UI 삽입 지점

- `src/components/layout/MainLayout.tsx`: 전역 `Header` + 페이지 본문 구조.
- `src/components/layout/Header.tsx`: 이미 전역 검색 입력과 결과 패널이 있어 자연어 커맨드 진입점으로 확장하기 가장 적합.
- `src/App.tsx`: 전 라우트가 `MainLayout` 아래에서 동작하므로, 한번 붙이면 전체 페이지에서 공통 사용 가능.

---

## 🧱 제안 아키텍처

1. **NL Command UI (Frontend)**
   - 사용자 자연어 입력 수집
   - 실행 전 Plan 카드(어떤 API를 어떤 인자로 호출할지) 표시
   - 승인/취소/수정 후 실행

2. **AI Orchestrator API (Backend 신규)**
   - 자연어 -> `intent + arguments + risk_level + confidence`로 구조화
   - 구조화 결과를 기반으로 툴/API 실행 계획 생성
   - 저신뢰도/파라미터 누락 시 clarification 질문 반환

3. **Action Executor (Backend)**
   - 기존 서비스 API 호출 래핑
   - 권한, 입력 검증, rate limit, timeout, idempotency 적용
   - 실행 로그/감사 로그 기록

4. **Safety & Policy Layer**
   - 화이트리스트 기반 액션 등록
   - 위험도 분류(LOW/MEDIUM/HIGH)
   - HIGH는 무조건 사용자 승인 + 확인 문구

5. **Observability Layer**
   - `request_id`, 사용자, intent, tool call, 결과, 실패 원인 추적
   - 대시보드/로그 분석 가능하도록 이벤트 스키마 고정

---

## 🗺️ 단계별 구현 로드맵

## Phase 0. 요구사항 고정 (1주)

- 상위 30개 사용자 명령 정의(조회/생성/수정/삭제/운영)
- 각 명령에 대해 intent, required args, 권한, 위험도, 성공 조건 정의
- 고위험 액션 목록 확정: 예) 계정/권한 변경, 삭제 계열, 대량 변경

**산출물**
- `intent-catalog.md`
- `risk-matrix.md`

## Phase 1. API 계약 및 액션 레지스트리 (1주)

- 백엔드에 `Action Registry` 도입
- 액션별 JSON Schema(입력), 권한 정책, idempotency 키 정책 정의
- 프론트/오케스트레이터/실행기 공통 에러 코드 표준화

**산출물**
- `action-registry.ts|kt`
- `action-schema/*.json`
- `error-codes.md`

## Phase 2. Orchestrator MVP (1~2주)

- 자연어를 구조화 응답으로 강제(자유 텍스트 금지)
- 구조화 응답 예시:

```json
{
  "intent": "refresh_network_topology",
  "arguments": {},
  "risk_level": "low",
  "confidence": 0.93,
  "requires_confirmation": false
}
```

- `confidence` 임계값 미만이면 실행 금지 후 반문
- 실행 전 Plan 반환, 실행 후 Result/Trace 반환

**산출물**
- `/api/v1/ai/plan`
- `/api/v1/ai/execute`

## Phase 3. 프론트엔드 통합 (1주)

- `Header`에 "자연어 커맨드 모드" 추가
- Plan 카드 + 승인 버튼 + 실행 상태(queued/running/success/fail)
- 실패 시 원인/재시도/수정 제안 표시

**산출물**
- `src/components/layout/Header.tsx` 확장
- `src/lib/api/ai-control.ts` 신규

## Phase 4. Safety/권한/감사 로그 강화 (1주)

- RBAC 강제 (`use-auth` + 백엔드 권한 재검증)
- HIGH 리스크 이중 확인(버튼 + 확인 문구 입력)
- 감사 로그 저장: who/when/intent/args/hash/result

**산출물**
- `audit-log` 스키마
- 승인 플로우 정책

## Phase 5. 평가/베타/점진 배포 (1주)

- 대표 프롬프트 셋(100~300개)으로 오프라인 평가
- 내부 관리자 그룹 베타 -> 팀 단위 점진 배포
- 오작동 사례 리플레이 기반 개선 루프 운영

**핵심 지표**
- Intent 정확도
- 실행 성공률
- 오작동률(잘못된 API 실행 비율)
- 승인 단계 차단률(위험 액션 방어 성공률)
- 평균 처리 시간(P50/P95)

---

## 🔐 안전 설계 원칙

- **원칙 1: 서버 사이드 실행만 허용**
  - 프론트는 절대 직접 민감 액션 호출하지 않고 백엔드 오케스트레이터를 통해서만 실행.
- **원칙 2: 화이트리스트 기반 액션 제한**
  - 레지스트리에 등록된 액션만 실행 가능, 임의 함수 호출 금지.
- **원칙 3: 구조화 출력 강제**
  - Intent/Args는 JSON Schema 검증을 통과해야만 실행.
- **원칙 4: Human-in-the-loop 기본값**
  - 초기 MVP는 승인 기반 반자동 실행을 기본으로 운영.
- **원칙 5: 감사 가능성 확보**
  - 모든 실행에 trace id 부여, 실행 전후 이벤트 저장.

---

## 🧪 테스트 및 검증 전략

### 1) 유닛 테스트
- intent parser, schema validator, risk classifier
- permission guard, policy evaluator

### 2) 통합 테스트
- `plan -> approve -> execute` 전체 플로우
- low/high risk 분기, 권한 실패, 파라미터 누락

### 3) 회귀 테스트
- 기존 API 화면(EC2/RDS/S3/VPC/Topology/Settings) 정상 동작 보장

### 4) 시나리오 기반 평가셋
- 실제 사용자 발화 문장(오타/애매한 표현/혼합 명령) 포함
- 실패 케이스를 지식베이스화하여 주기적으로 재평가

---

## 📦 MVP 범위 제안

**포함 (초기)**
- 조회 계열: 상태 조회, 목록 조회, 새로고침 트리거
- 저위험 변경: 예) 네트워크 토폴로지 refresh, 읽기 전용 요약

**제외/제한 (초기)**
- 삭제, 권한 변경, 대량 수정, 계정 민감 작업
- 필요 시 관리자 승인/이중확인 후 제한적 오픈

---

## 🧾 구현 백로그 (초안)

1. `docs/features/intent-catalog.md` 작성
2. 백엔드 `POST /api/v1/ai/plan` 스켈레톤 구현
3. 백엔드 `POST /api/v1/ai/execute` 스켈레톤 구현
4. 액션 레지스트리(화이트리스트 + 스키마 + 권한) 구현
5. 프론트 `src/lib/api/ai-control.ts` 추가
6. `Header` 자연어 입력 + Plan/Approve UI 추가
7. 감사 로그 스키마/저장소 연결
8. 시나리오 평가셋 구축 및 배치 평가 스크립트 작성

---

## 🔗 참고 자료 (공식/레퍼런스)

### 공식 문서
- OpenAI Function Calling: https://platform.openai.com/docs/guides/function-calling
- OpenAI Structured Outputs: https://platform.openai.com/docs/guides/structured-outputs
- Anthropic Tool Use: https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview
- MCP Specification: https://modelcontextprotocol.io/specification/2025-06-18
- OWASP API Security Top 10: https://owasp.org/API-Security/

### 오픈소스 참고 리포지토리
- OpenAI Agents SDK (Python): https://github.com/openai/openai-agents-python
- Microsoft AutoGen: https://github.com/microsoft/autogen
- MCP Reference Servers: https://github.com/modelcontextprotocol/servers
- Anthropic Claude Cookbooks: https://github.com/anthropics/claude-cookbooks

---

## 메모

- 본 문서는 BuilderHub 프론트 코드 구조(`src/components/layout`, `src/lib/api`, `src/hooks/use-auth`)에 맞춰 최소 침습적으로 작성했다.
- 초기 적용 지점은 `Header` 기반 전역 커맨드 진입이 가장 적합하다.
- 추후 백엔드 저장소 구조를 확인해 액션 레지스트리/감사 로그 저장 모델을 상세화한다.
