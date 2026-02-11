# Builder Hub - Frontend

AWS 리소스 관리 대시보드의 프론트엔드 애플리케이션입니다. EC2/RDS/S3/VPC 리소스 조회, 네트워크 토폴로지 시각화, SSM 터미널, EC2 인스턴스 프로비저닝을 제공합니다.

## 📋 목차

- [기술 스택](#기술-스택)
- [주요 기능](#주요-기능)
- [프로젝트 구조](#프로젝트-구조)
- [개발 환경 설정](#개발-환경-설정)
- [빌드 및 실행](#빌드-및-실행)
- [배포](#배포)
- [컴포넌트 가이드](#컴포넌트-가이드)

---

## 기술 스택

### 빌드 및 개발 도구
- **Vite** 5.4.19 - 차세대 프론트엔드 빌드 도구
- **Node.js** 18+ / npm 9+
- **TypeScript** 5.8.3 - 타입 안전성
- **ESLint** + **Prettier** - 코드 품질

### 라이브러리
- **React** 18.3.1 - UI 라이브러리
- **React Router** 6.30.1 - 클라이언트 라우팅
- **TanStack Query** 5.83.0 - 비동기 상태 관리
- **D3.js** 7.9.0 - 네트워크 토폴로지 시각화
- **shadcn/ui** + **Radix UI** - 컴포넌트 라이브러리
- **Tailwind CSS** 3.4.17 - 스타일링
- **Zod** - 런타임 타입 검증
- **Lucide React** - 아이콘 라이브러리
- **xterm.js** - 웹 터미널 에뮬레이터

---

## 주요 기능

### 1. EC2 인스턴스 관리
- 다중 AWS 계정의 EC2 인스턴스 조회
- 인스턴스 상태 모니터링 (Running, Stopped, Terminated)
- 리소드 태그 기반 필터링
- **컬럼 너비 조절** (localStorage에 설정 저장)
- 정렬 및 검색 기능

**파일**: `src/pages/EC2.tsx`, `src/components/EC2/`

### 2. RDS 리소스 관리
- RDS 데이터베이스 인스턴스 조회
- 엔진 타입별 필터링 (MySQL, PostgreSQL, MariaDB)
- 백업 상태 모니터링

**파일**: `src/pages/RDS.tsx`, `src/components/RDS/`

### 3. S3 버킷 관리
- S3 버킷 목록 및 메타데이터 조회
- 버킷 정책 및 암호화 설정 확인
- 스토리지 클래스별 분류

**파일**: `src/pages/S3.tsx`, `src/components/S3/`

### 4. 네트워크 토폴로지 시각화
- VPC/Subnet 계층적 시각화
- 다중 레이아웃 (Hierarchical, Force-directed, Circular)
- **VPC Peering/CloudWAN/Route 기반 하이라이팅**
- 노드 클릭 시 상세 정보 패널 표시
- 마우스 호버 시 연결된 네트워크망 강조 표시

**파일**: `src/components/network-topology/`
**주요 컴포넌트**:
- `NetworkVisualizationContainer.tsx` - 최상위 컨테이너
- `ForceTopologyVisualization.tsx` - Force-directed 배치
- `NodeDetailsPanel.tsx` - 선택된 노드 상세 정보
- `PerformanceOptimizer.tsx` - 대규모 데이터셋 최적화

### 5. SSM 원격 터미널
- AWS Systems Manager Session Manager 통합
- 브라우저 내 원격 쉘 실행
- WebSocket 기반 실시간 통신
- 터미널 세션 기록 저장

**파일**: `src/pages/SSMTerminal.tsx`, `src/components/Terminal/`

### 6. EC2 인스턴스 프로비저닝 (Provisioning Workflow)
- 인스턴스 생성 요청 폼
- 관리자 승인 워크플로우
- 자동 배포 및 배포 상태 모니터링

**파일**: `src/pages/InstanceRequest.tsx`, `src/components/InstanceRequest/`

### 7. 사용자 관리 및 인증
- OAuth2 / JWT 기반 인증
- 사용자 프로필 및 권한 관리
- 계정 설정 페이지

**파일**: `src/pages/Profile.tsx`, `src/components/Auth/`

---

## 프로젝트 구조

```
builder-hub/
├── src/
│   ├── pages/                          # 페이지 컴포넌트
│   │   ├── EC2.tsx                    # EC2 관리 페이지
│   │   ├── RDS.tsx                    # RDS 관리 페이지
│   │   ├── S3.tsx                     # S3 관리 페이지
│   │   ├── NetworkTopology.tsx         # 네트워크 토폴로지 페이지
│   │   ├── SSMTerminal.tsx            # SSM 터미널 페이지
│   │   ├── InstanceRequest.tsx         # EC2 프로비저닝 페이지
│   │   └── Profile.tsx                # 사용자 프로필 페이지
│   │
│   ├── components/                     # 재사용 가능한 컴포넌트
│   │   ├── network-topology/          # 네트워크 토폴로지 컴포넌트
│   │   │   ├── ForceTopologyVisualization.tsx
│   │   │   ├── NetworkVisualizationContainer.tsx
│   │   │   ├── NodeDetailsPanel.tsx
│   │   │   ├── PerformanceOptimizer.tsx
│   │   │   └── ...
│   │   ├── ui/                        # shadcn/ui 기본 컴포넌트
│   │   ├── Terminal/                  # 터미널 컴포넌트
│   │   └── ...
│   │
│   ├── hooks/                          # 커스텀 React 훅
│   │   ├── use-toast.ts               # 토스트 알림
│   │   └── ...
│   │
│   ├── lib/                            # 유틸리티 함수
│   │   ├── api/                       # API 통신 함수
│   │   │   ├── network-topology.ts    # 네트워크 토폴로지 API
│   │   │   └── ...
│   │   ├── types/                     # TypeScript 타입 정의
│   │   │   ├── network-topology.ts
│   │   │   └── ...
│   │   └── utils.ts
│   │
│   ├── App.tsx                         # 메인 애플리케이션 컴포넌트
│   ├── App.css                         # 전역 스타일
│   └── main.tsx                        # 엔트리 포인트
│
├── public/                             # 정적 자산
├── package.json                        # 프로젝트 의존성
├── vite.config.ts                      # Vite 설정
├── tsconfig.json                       # TypeScript 설정
├── tailwind.config.js                  # Tailwind CSS 설정
├── postcss.config.js                   # PostCSS 설정
└── README.md                           # 이 파일

```

---

## 개발 환경 설정

### 사전 요구사항
- Node.js 18.x 이상
- npm 9.x 이상
- Git

### 1. 저장소 클론 및 서브모듈 업데이트

```bash
git clone <repository-url>
cd builder-hub-directory
git submodule update --init --recursive
```

### 2. Frontend 의존성 설치

```bash
cd builder-hub
npm install
```

### 3. 환경 변수 설정

`.env` 파일을 생성합니다:

```env
# API 엔드포인트
VITE_API_BASE_URL=http://localhost:8080/api

# OAuth2 설정 (필요시)
VITE_OAUTH_CLIENT_ID=your_client_id
VITE_OAUTH_REDIRECT_URI=http://localhost:5173

# 기타 설정
VITE_LOG_LEVEL=debug
```

### 4. 개발 서버 시작

```bash
npm run dev
```

개발 서버는 `http://localhost:5173`에서 실행됩니다.

### 5. 린트 및 포매팅

```bash
# ESLint 검사
npm run lint

# Prettier로 포매팅
npm run format

# 포매팅 검사 (검사만, 수정 안 함)
npm run format:check
```

---

## 빌드 및 실행

### 프로덕션 빌드

```bash
npm run build
```

빌드 결과는 `dist/` 디렉토리에 생성됩니다.

### 빌드 결과 미리보기

```bash
npm run preview
```

### Docker 빌드

```bash
# 이미지 빌드
docker build -t builder-hub:latest .

# 컨테이너 실행
docker run -p 80:80 builder-hub:latest
```

---

## 배포

### AWS SSM을 통한 원격 배포

Backend의 `deploy_ssm.sh` 스크립트를 사용합니다:

```bash
cd ../builder-hub-backend

# SSM 인스턴스로 배포
./deploy_ssm.sh
```

**배포 프로세스**:
1. 프론트엔드 빌드 (`npm run build`)
2. Docker 이미지 생성
3. ECR (Amazon Elastic Container Registry)에 푸시
4. 원격 EC2 인스턴스에 SSH 없이 SSM을 통해 배포
5. Docker Compose로 컨테이너 재시작

**필수 전제조건**:
- EC2 인스턴스는 SSM Session Manager 권한 필요
- IAM 역할: `AmazonSSMManagedInstanceCore`, ECR 접근 권한
- ECR 저장소: `<ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/builder-hub`

---

## 컴포넌트 가이드

### 네트워크 토폴로지 시각화

#### 주요 컴포넌트

**ForceTopologyVisualization.tsx** - Force-directed 레이아웃
- D3.js의 Force Simulation 사용
- 노드 및 링크 렌더링
- 드래그 및 줌 상호작용
- VPC Peering, CloudWAN, Route 기반 하이라이팅

**사용 예**:
```tsx
<ForceTopologyVisualization
  data={topologyData}
  width={width}
  height={height}
  onNodeClick={handleNodeClick}
/>
```

#### 상세 정보 패널

**NodeDetailsPanel.tsx** - 선택된 노드의 메타데이터 표시
- VPC/Subnet/Gateway 타입별 정보 분류
- 태그, CIDR 블록, 라우팅 정보 표시
- 클립보드 복사 기능
- 스크롤 가능한 패널

**라우팅 정보 렌더링**:
```tsx
// routes 배열은 RouteInfo[] 타입으로 표시
route.destinationCidr  // 목적지 CIDR
route.target           // 라우팅 타겟 (IGW, NAT 등)
route.targetType       // 타겟 타입
route.state            // 라우팅 상태 (ACTIVE, ...)
```

#### 성능 최적화

**PerformanceOptimizer.tsx** - 대규모 데이터셋 처리
- 노드 > 500개 또는 엣지 > 1000개일 때 자동 최적화
- 호버/클릭 이벤트 비활성화
- 애니메이션 제한
- 데이터 샘플링

---

## API 통신

### API 클라이언트 구조

`src/lib/api/` 디렉토리의 함수들:

```typescript
// 네트워크 토폴로지
export async function getNetworkTopology(): Promise<NetworkTopologyData>
export async function refreshNetworkTopology(): Promise<RefreshResponse>
export async function getCacheStatus(): Promise<CacheStatusInfo>
export async function getSyncProgress(): Promise<SyncProgress>

// EC2
export async function listInstances(): Promise<Ec2Instance[]>
export async function describeInstance(instanceId: string): Promise<Ec2Instance>

// RDS
export async function listDatabases(): Promise<RdsInstance[]>

// S3
export async function listBuckets(): Promise<S3Bucket[]>
```

### 재시도 로직

- 최대 3회 재시도
- 지수 백오프 (1초, 2초, 4초)
- 401/403 에러는 재시도 안 함

---

## 타입 정의

### NetworkTopologyData

```typescript
interface NetworkTopologyData {
  nodes: NodeData[];
  edges: EdgeData[];
  hierarchy: HierarchyData;
  lastUpdated?: string;
  cacheStatus: CacheStatus;
}

interface NodeData {
  id: string;
  type: NodeType;  // ACCOUNT, REGION, VPC, SUBNET, IGW, NAT
  label: string;
  metadata: Record<string, any>;
  position?: Position;
  parent?: string;
}

interface EdgeData {
  id: string;
  source: string;
  target: string;
  type: ConnectionType;  // VPC_PEERING, CLOUDWAN, GATEWAY, ROUTE, TRANSIT_GATEWAY
  metadata: ConnectionMetadata;
}
```

---

## 트러블슈팅

### 포트 충돌

```bash
# 포트 5173이 이미 사용 중인 경우
npm run dev -- --port 3000
```

### API 연결 실패

1. Backend 서버 실행 확인: `http://localhost:8080/actuator/health`
2. CORS 설정 확인 (Backend `application.yml`)
3. 환경 변수 `VITE_API_BASE_URL` 확인

### 네트워크 토폴로지 렌더링 문제

1. 브라우저 개발자도구 콘솔에서 에러 확인
2. Performance Optimizer 모드 활성화 확인 (노드 > 500개)
3. D3.js 버전 호환성 확인

---

## 성능 최적화 팁

1. **이미지 최적화**: 로컬 이미지는 Vite의 정적 자산으로 관리
2. **코드 분할**: React Router의 lazy loading 사용
3. **번들 분석**:
   ```bash
   npm run build -- --analyze
   ```
4. **캐싱**: TanStack Query의 기본 캐싱 정책 활용

---

## 개발자 가이드

### 새로운 페이지 추가

1. `src/pages/MyFeature.tsx` 생성
2. `src/App.tsx`에 라우트 등록
3. 네비게이션 메뉴에 링크 추가

### 새로운 컴포넌트 추가

1. `src/components/MyComponent.tsx` 생성
2. shadcn/ui 기본 컴포넌트 활용
3. Tailwind CSS로 스타일링

### 타입 정의 추가

1. `src/lib/types/` 디렉토리에 `.ts` 파일 추가
2. 다른 컴포넌트에서 import하여 사용

---

## Vite 모듈 시스템

### 호이스팅 문제

Vite의 빌드 프로세스에서 컴포넌트 외부 최상위 상수가 호이스팅 에러를 발생시킬 수 있습니다.

**문제 예시**:
```typescript
// ❌ 위험
const COLUMNS = [{ id: 'name', header: 'Name' }, ...];
export function MyComponent() {
  // COLUMNS 사용 → 에러: Cannot access COLUMNS before initialization
}
```

**해결책**:
```typescript
// ✅ useMemo 또는 컴포넌트 내부 변수로 정의
export function MyComponent() {
  const columns = useMemo(() => [
    { id: 'name', header: 'Name' },
    // ...
  ], []);
}
```

---

## React 패턴

### React Query (TanStack Query) 의존성 쿼리

동적 데이터를 페칭할 때는 `enabled` 옵션으로 조건부 실행을 구현합니다.

**문제**:
```typescript
// ❌ selectedId가 없어도 쿼리가 실행됨
const { data } = useQuery({
  queryKey: ['details', selectedId],
  queryFn: () => fetchDetails(selectedId!),
});
```

**해결책**:
```typescript
// ✅ selectedId가 없으면 쿼리 스킵
const { data } = useQuery({
  queryKey: ['details', selectedId],
  queryFn: () => fetchDetails(selectedId!),
  enabled: !!selectedId, // 조건부 실행 필수
});
```

### localStorage 타입 안전성

`localStorage.getItem()`은 `string | null`을 반환하므로 적절한 타입 처리가 필요합니다.

**문제**:
```typescript
// ❌ 타입 에러
const saved = localStorage.getItem('key');
const data = JSON.parse(saved); // saved가 null일 수 있음
const value = data.name;
```

**해결책**:
```typescript
// ✅ null 체크 후 기본값 제공
const saved = localStorage.getItem('key');
const data = saved ? JSON.parse(saved) : null;
const value = data?.name ?? 'default';
```

### 열 너비 저장 (EC2 컴포넌트)

컬럼 너비를 localStorage에 저장하여 사용자 설정을 유지합니다.

```typescript
// localStorage 키 형식: `column-widths:{pageId}`
const STORAGE_KEY = `column-widths:ec2`;

// 너비 저장
localStorage.setItem(STORAGE_KEY, JSON.stringify(columnWidths));

// 너비 복원
const saved = localStorage.getItem(STORAGE_KEY);
const initial = saved ? JSON.parse(saved) : DEFAULT_WIDTHS;
```

---

## D3.js 패턴

### 드래그 이벤트 버블링 방지

D3.js에서 노드 드래그 시 부모의 줌/팬(Pan) 이벤트가 동시에 발동되는 것을 방지합니다.

**해결책**:
```typescript
.on('drag', (event, d) => {
  event.stopPropagation(); // 부모의 줌/팬 이벤트 방지 (필수!)
  d.x = event.x;
  d.y = event.y;
  // 노드 위치 업데이트
})
```

### D3 요소 메모리 누수 방지

useEffect에서 D3 요소를 업데이트할 때 기존 요소를 먼저 제거해야 합니다.

**문제**:
```typescript
// ❌ 업데이트할 때마다 요소 중복 생성
useEffect(() => {
  svg.selectAll('.node').data(nodes).enter()
    .append('circle')
    .attr('class', 'node');
}, [nodes]);
```

**해결책**:
```typescript
// ✅ 기존 요소 제거 후 새로 생성
useEffect(() => {
  svg.selectAll('.node').remove(); // 기존 요소 제거 (필수!)
  svg.selectAll('.node').data(nodes).enter()
    .append('circle')
    .attr('class', 'node');
}, [nodes]);
```

### Force Simulation 드래그 통합

D3의 Force Simulation과 드래그 동작을 함께 사용할 때 노드를 '고정'하여 시뮬레이션에서 제외합니다.

```typescript
const dragHandler = d3.drag()
  .on('start', (event, d) => {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x; // 현재 위치에 고정
    d.fy = d.y;
  })
  .on('drag', (event, d) => {
    event.stopPropagation();
    d.fx = event.x;
    d.fy = event.y;
  })
  .on('end', (event, d) => {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null; // 고정 해제
    d.fy = null;
  });
```

---

## 일반적인 실수 & 해결책

### 1️⃣ Vite 상수 호이스팅 에러
**증상**: "Cannot access COLUMNS before initialization"

**원인**: 컴포넌트 외부에서 정의한 상수가 Vite 빌드 시 호이스팅됨

**해결**:
```typescript
// useMemo로 감싸기
const columns = useMemo(() => [
  { id: 'name', header: 'Name' },
  // ...
], []);
```

### 2️⃣ D3 드래그와 줌 충돌
**증상**: 노드 드래그 중에도 SVG 줌이 동작함

**원인**: 드래그 이벤트가 부모로 전파됨 (bubble up)

**해결**:
```typescript
.on('drag', (event, d) => {
  event.stopPropagation(); // 필수!
  d.x = event.x;
})
```

### 3️⃣ localStorage 타입 에러
**증상**: `localStorage.getItem()` 반환값이 `string | null`

**해결**:
```typescript
const saved = localStorage.getItem('key');
const data = saved ? JSON.parse(saved) : null;
const value = data?.name ?? 'default'; // 기본값 제공
```

### 4️⃣ React Query 의존성 쿼리
**증상**: 선택되지 않은 항목도 쿼리 실행됨

**해결**:
```typescript
const { data } = useQuery({
  queryKey: ['details', selectedId],
  queryFn: () => fetchDetails(selectedId!),
  enabled: !!selectedId, // 조건부 실행 필수
});
```

### 5️⃣ D3 요소 메모리 누수
**증상**: 업데이트할 때마다 D3 요소 중복 생성

**해결**:
```typescript
useEffect(() => {
  svg.selectAll('.node').remove(); // 기존 제거 (필수!)
  svg.selectAll('.node').data(nodes).enter()
    .append('circle')
    .attr('class', 'node');
}, [nodes]);
```

---

## 참고 자료

- [Vite 공식 문서](https://vitejs.dev/)
- [React 공식 문서](https://react.dev/)
- [shadcn/ui 문서](https://ui.shadcn.com/)
- [D3.js API 문서](https://github.com/d3/d3/wiki/API-Reference)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [TanStack Query 문서](https://tanstack.com/query/latest)

---

**라이선스**: Proprietary

**문서 버전**: 1.0.0

**최종 업데이트**: 2026년 2월
