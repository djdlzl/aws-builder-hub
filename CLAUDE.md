# builder-hub (Frontend) - Claude Code 개발 가이드

**핵심 목표**: Claude Code가 일관된 코드 생성을 위해 반드시 알아야 할 정보만 포함

자세한 내용은 **README.md** 참조

---

## 🚨 Critical Guidelines

### 순차 도구 실행 규칙 (전역 CLAUDE.md)
**도구는 순차적으로만 실행합니다**. 이전 도구의 결과를 받을 때까지 다음 도구를 호출하지 않습니다.
```
❌ 금지: 여러 도구를 한 번에 호출
✅ 필수: 도구 호출 → 결과 대기 → 다음 도구 호출
```

### Vite 모듈 시스템 주의
- **문제**: 컴포넌트 외부 최상위 상수가 Vite 빌드 시 호이스팅 에러 발생
- **해결**: 공유 상수는 `useMemo` 또는 컴포넌트 내부 변수로 정의

```typescript
// ❌ 위험
const COLUMNS = [{ id: 'name', header: 'Name' }, ...];
export function MyComponent() { // COLUMNS 사용 → 에러
}

// ✅ 안전
export function MyComponent() {
  const columns = useMemo(() => [...], []);
}
```

### D3.js 드래그 이벤트 버블링
```typescript
.on('drag', (event, d) => {
  event.stopPropagation(); // 부모의 줌/팬 이벤트 방지 (필수!)
  d.x = event.x;
})
```

---

## 코딩 컨벤션

### 파일 및 폴더 명명
- **폴더**: 소문자, 하이픈 (예: `network-topology`)
- **컴포넌트 파일**: PascalCase (예: `ForceTopologyVisualization.tsx`)
- **유틸/훅 파일**: kebab-case (예: `use-toast.ts`)
- **타입 파일**: kebab-case (예: `network-topology.ts`)

### 컴포넌트 구조 순서
```typescript
// 1. Import (외부 → 내부)
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';

// 2. 타입
interface MyComponentProps { ... }

// 3. 컴포넌트 함수
export function MyComponent({ ... }: MyComponentProps) {
  // 훅 → 상태 → 이펙트 → 렌더링
}
```

### TypeScript 타입 규칙
- **API 응답**: `{Domain}Response`
- **Props**: `{Component}Props`
- **상수 타입**: `as const` 사용

---

## 일반적인 실수 & 해결책

### 1️⃣ Vite 상수 호이스팅 에러
**증상**: "Cannot access COLUMNS before initialization"

**해결**:
```typescript
// useMemo로 감싸기
const columns = useMemo(() => [
  { id: 'name', header: 'Name' },
  // ...
], []);
```

### 2️⃣ D3 드래그와 줌 충돌
**증상**: 드래그 중에도 줌이 동작함

**해결**:
```typescript
.on('drag', (event, d) => {
  event.stopPropagation(); // 필수!
  d.x = event.x;
})
```

### 3️⃣ localStorage 타입 에러
**증상**: `localStorage.getItem()` 반환값이 string | null

**해결**:
```typescript
const saved = localStorage.getItem('key');
const data = saved ? JSON.parse(saved) : null;
const value = data?.name ?? 'default'; // 기본값 제공
```

### 4️⃣ React Query 의존성 쿼리
**증상**: 선택되지 않은 항목도 쿼리 실행

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

## 빌드 & 배포

### 개발 서버
```bash
npm run dev        # http://localhost:5173
npm run lint       # ESLint 검사
npm run format     # Prettier 포맷팅
```

### 프로덕션 빌드
```bash
npm run build      # dist/ 생성
npm run preview    # 빌드 결과 미리보기
```

### SSM 배포
```bash
cd ../builder-hub-backend
SSM_INSTANCE_ID=i-0a622044dc86f848a ./deploy_ssm.sh
```

---

## 참고

- **프로젝트 구조, 설치, 기술 스택**: README.md 참조
- **React Query, D3.js, localStorage 상세 패턴**: README.md 참조
- **성능 최적화, Troubleshooting**: README.md 참조

**문서 버전**: 1.1.0 (축소 버전, 2026년 2월)
