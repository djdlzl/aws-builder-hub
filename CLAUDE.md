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

## 🖱️ 드래그 앤 드롭 UX 패턴 (이동 기능 표준)

**규칙**: 아이템 이동(순서 변경) 기능을 개발할 때는 **항상 삽입 위치 인디케이터 라인**을 구현한다.

### 삽입 인디케이터 라인 패턴

아이템을 드래그할 때 전체 카드를 하이라이트하지 않고, 삽입될 위치에 얇은 수평선(primary 색상)을 표시한다.

```typescript
// 1. 상태: 삽입 위치 추적
const [insertBeforeId, setInsertBeforeId] = useState<number | "end" | null>(null);

// 2. handleDragOver: 마우스 Y 위치로 삽입 위치 결정
const handleDragOver = (e: React.DragEvent, blockId: number) => {
  e.preventDefault();
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const midY = rect.top + rect.height / 2;

  if (e.clientY < midY) {
    setInsertBeforeId(blockId);           // 상반부 → 이 아이템 앞에 삽입
  } else {
    const idx = items.findIndex(b => b.id === blockId);
    const next = items[idx + 1];
    setInsertBeforeId(next ? next.id : "end"); // 하반부 → 다음 아이템 앞 (또는 맨 끝)
  }
};

// 3. handleDrop: insertBeforeId를 기준으로 재정렬
const handleDrop = async (e: React.DragEvent) => {
  e.preventDefault();
  if (draggingId === null || insertBeforeId === null) return;

  const fromIdx = items.findIndex(b => b.id === draggingId);
  const newOrder = [...items];
  const [moved] = newOrder.splice(fromIdx, 1);
  const toIdx = insertBeforeId === "end"
    ? newOrder.length
    : newOrder.findIndex(b => b.id === insertBeforeId);
  newOrder.splice(toIdx < 0 ? newOrder.length : toIdx, 0, moved);
  // ...save
};

// 4. handleDragEnd: 초기화
const handleDragEnd = () => {
  setDraggingId(null);
  setInsertBeforeId(null);
};
```

```tsx
// 5. 렌더링: 아이템 앞에 인디케이터 라인 삽입
{items.map((item) => (
  <div key={item.id}>
    {draggingId !== null && insertBeforeId === item.id && (
      <div className="h-0.5 bg-primary rounded-full mx-1" />
    )}
    <Card draggable onDragStart={...} onDragOver={(e) => handleDragOver(e, item.id)} onDragEnd={handleDragEnd}>
      ...
    </Card>
  </div>
))}
{/* 맨 끝 인디케이터 */}
{draggingId !== null && insertBeforeId === "end" && (
  <div className="h-0.5 bg-primary rounded-full mx-1" />
)}
```

**핵심 포인트**:
- `onDrop`은 컨테이너(`div.space-y-2`) 레벨에 한 번만 → `handleDrop(e: React.DragEvent)` (targetId 파라미터 없음)
- 드래깅 아이템은 `opacity-40`으로 처리 (`border-primary ring-1` X)
- `"end"` sentinel 값으로 맨 끝 삽입 처리

---

## 📐 페이지 레이아웃 표준

### 기본 원칙
모든 페이지 콘텐츠는 **폭 제한 + 중앙 정렬**을 기본으로 한다.
전체 너비를 채우는 레이아웃은 금지. 항상 `max-w-4xl mx-auto`를 기준으로 한다.

### 케이스별 레이아웃 패턴

**① 단일 콘텐츠 (사이드바 없음)**
```tsx
<div className="max-w-4xl mx-auto">
  <Card>
    <CardContent>
      {/* 메인 콘텐츠 */}
    </CardContent>
  </Card>
</div>
```

**② 사이드바 + 메인 (목록/상세 분리)**
```tsx
<div className="max-w-4xl mx-auto flex gap-6 items-start">
  {/* 사이드바: 고정 폭, 목록/네비게이션 */}
  <Card className="h-fit w-[300px] shrink-0">
    <CardHeader>...</CardHeader>
    <CardContent>...</CardContent>
  </Card>

  {/* 메인 패널: 나머지 공간을 채움 */}
  <div className="flex-1 min-w-0">
    {/* 상세 내용 */}
  </div>
</div>
```

**핵심 포인트**:
- 외부 래퍼: `max-w-4xl mx-auto` (폭 제한 + 중앙 정렬)
- 사이드바: `w-[300px] shrink-0` (고정 폭, 줄지 않음)
- 메인: `flex-1 min-w-0` (남은 공간 채우기, overflow 방지)
- 여러 탭이 있을 때 모든 탭에 동일한 래퍼 적용 → 탭 전환 시 폭이 일관됨

### 탭 UI 일관성 (글로벌 규칙)

- 탭 헤더(`TabsList`)와 주요 액션 버튼(예: 새 캠페인/새 블록 템플릿/클러스터 등록)은 **항상 같은 가로선**에 배치한다.
- 탭별 액션 버튼은 **단일 버튼 슬롯**을 재사용하고, 라벨/동작만 바꾼다.
- 탭 전환 시 시각적 점프 방지를 위해 액션 버튼의 크기를 고정한다.
  - 권장: `h-9 min-w-[170px]`
- 탭이 달라도 메인 콘텐츠는 동일한 중심 폭 규칙을 따른다.
  - 권장 3분할 그리드: `300px | 56rem | 300px`
  - 사이드카드가 없는 탭도 좌/우 보조 컬럼(빈 컬럼)으로 그리드를 유지한다.
- 동일 도메인 카드(캠페인 카드, 블록 템플릿 카드)는 헤더 구조/액션 버튼 위치/정보 줄 스타일을 맞춘다.

---

## ✏️ 인라인 편집 패턴

**규칙**: 별도 모달 없이 카드 내부에서 바로 편집할 때 사용. 연필(Pencil) 버튼 → 편집 폼 → 저장/취소.

```tsx
interface EditState {
  name: string;
  description: string;
  // 편집 가능한 필드들
}

function MyComponent({ item, onRefresh }) {
  const [editing, setEditing] = useState<EditState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const startEdit = () => setEditing({
    name: item.name,
    description: item.description ?? "",
  });

  const handleSave = async () => {
    if (!editing || !editing.name.trim()) return;
    setIsSaving(true);
    try {
      await updateItem(item.id, { name: editing.name.trim(), ... });
      toast({ title: "수정 완료" });
      setEditing(null);
      onRefresh();
    } catch (error) {
      toast({ title: "수정 실패", description: ..., variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        {editing ? (
          /* 편집 모드 */
          <div className="space-y-3">
            <Input value={editing.name} onChange={(e) => setEditing(p => p && { ...p, name: e.target.value })} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)} disabled={isSaving}>
                <X className="h-3.5 w-3.5" /> 취소
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving || !editing.name.trim()}>
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                저장
              </Button>
            </div>
          </div>
        ) : (
          /* 보기 모드 */
          <div className="flex items-center gap-2">
            <CardTitle>{item.name}</CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={startEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardHeader>
    </Card>
  );
}
```

**핵심 포인트**:
- `editing` state: `null`이면 보기 모드, 값이 있으면 편집 모드
- 편집 필드 변경: `setEditing(p => p && { ...p, field: value })` 패턴 (null safety)
- 저장 버튼: `disabled={isSaving || !필수필드.trim()}` 필수
- 편집 중엔 다른 액션 버튼들도 `disabled` 처리

---

## 🏷️ 상태 배지 패턴

### 오버라이드 배지 (주황색)
기본값이 아닌 커스텀 값이 적용된 항목 표시.
```tsx
{(override?.commandOverride != null || override?.paramsOverride != null) && (
  <span className="shrink-0 inline-flex items-center rounded-sm border border-orange-400/40 bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-orange-500 leading-none">
    오버라이드
  </span>
)}
```

### 상태별 배지 색상 원칙
- **기본/시스템**: `variant="secondary"` (회색)
- **진행 중/연결됨**: `variant="default"` (primary 색)
- **완료**: `variant="outline"` (테두리만)
- **오류/취소**: `variant="destructive"` (빨간색)
- **오버라이드/주의**: 커스텀 주황 (`bg-orange-500/10 text-orange-500`)
- **링크/템플릿**: `variant="secondary" + Link 아이콘`

### 동적 배지 색상 (계정, 환경 등)
여러 항목을 구분할 때 인덱스 기반 색상 순환:
```tsx
const BADGE_COLORS = [
  "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "bg-green-500/10 text-green-600 border-green-500/20",
  "bg-rose-500/10 text-rose-600 border-rose-500/20",
];

const getColor = (id: string, items: { id: string }[]) => {
  const idx = items.findIndex(i => i.id === id);
  return BADGE_COLORS[idx % BADGE_COLORS.length] ?? BADGE_COLORS[0];
};
```

---

## 🔌 동적 데이터 로드 원칙

**규칙**: 드롭다운, 선택지, 설정값은 **절대 하드코딩하지 않는다**. 항상 API/DB에서 가져온다.

```tsx
// ❌ 금지: 하드코딩된 선택지
const ACCOUNT_OPTIONS = ["dev", "stg", "mgt"];

// ✅ 필수: API에서 동적 로드
const [accounts, setAccounts] = useState<Account[]>([]);

useEffect(() => {
  fetchAccounts().then(setAccounts);
}, []);

// 선택 UI는 accounts 배열로 렌더링
{accounts.map(acc => (
  <button key={acc.id} onClick={() => setSelected(acc.id)}>
    {acc.name}
  </button>
))}
```

**적용 사례**:
- AWS 계정 목록 → `AwsAccountRepository`에서 조회
- IAM Role ARN → 계정 등록 시 저장한 값 사용 (하드코딩 X)
- 클러스터 context 목록 → DB에서 조회

---

## 🎨 UI 용어 & 디자인 규칙

**UIUX는 최우선 품질 요소다. 팀원에게 위임하지 않고 Claude가 직접 구현한다.**

### 크기 & 가독성 기준
- 글씨: 최소 `text-sm`, 주요 콘텐츠(설명, 명령어, 항목)는 `text-base`
- 아이콘 버튼: 최소 `h-8 w-8`, 아이콘 `h-4 w-4`
- 텍스트 버튼: 최소 `h-8`, 여백 `px-3` 이상
- 여백/패딩: 콘텐츠 밀도에 맞게 균형 유지 (너무 좁거나 너무 넓지 않게)

### 용어
- shadcn/ui Card 컴포넌트를 사용하는 UI 요소는 **카드(Card)**라고 부른다. "박스"라는 표현은 사용하지 않는다.

### 편집/삭제 버튼 위치 규칙
- 편집(Pencil) 버튼은 **항상 카드 헤더의 맨 우측**에 배치한다.
- 삭제(Trash) 버튼도 편집 버튼과 함께 우측에 배치한다.
- 헤더 버튼 순서: `... → [편집] → [삭제]` 또는 `... → [Chevron] → [편집]`

### 삭제 확인 규칙
- 모든 삭제 액션은 반드시 `AlertDialog`로 확인을 받은 후 실행한다.
- 확인 없이 바로 삭제하는 코드는 금지.
- AlertDialog 패턴:
```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
      <AlertDialogDescription>이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>취소</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
        삭제
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 템플릿 연결 UI 패턴
- 캠페인에 블록 템플릿이 연결되지 않은 경우: `Select` + "연결" 버튼으로 연결
- 연결 해제 시: AlertDialog로 확인 후 `linkTemplate(campaignId, null)` 호출

---

## 빌드 & 배포

### 개발 서버
```bash
npm run dev        # http://localhost:5173
npm run lint       # ESLint 검사
npm run format     # Prettier 포맷팅
```

### 프로덕션 빌드 & 배포
⚠️ **Claude는 빌드하지 않음** - 사용자가 직접 `deploy_ssm.sh`로 처리
```bash
# 사용자가 직접 실행:
cd ../builder-hub-backend
SSM_INSTANCE_ID=i-0a622044dc86f848a ./deploy_ssm.sh
```

배포 스크립트가 자동으로:
1. Frontend 빌드 (`npm run build`)
2. Backend 빌드 (`./gradlew build -x test`)
3. Docker 이미지 생성 및 ECR 푸시
4. SSM을 통해 원격 서버 배포

---

## 참고

- **프로젝트 구조, 설치, 기술 스택**: README.md 참조
- **React Query, D3.js, localStorage 상세 패턴**: README.md 참조
- **성능 최적화, Troubleshooting**: README.md 참조

**문서 버전**: 1.1.0 (축소 버전, 2026년 2월)
