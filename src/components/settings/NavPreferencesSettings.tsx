import { useRef, useState, useEffect } from "react";
import { GripVertical, RotateCcw, Save } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ALL_NAV_ITEMS } from "@/lib/nav-items";
import { useNavPreferences, type NavItemPreference } from "@/hooks/use-nav-preferences";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface DraftItem {
  id: string;
  visible: boolean;
  order: number;
}

type DropPosition = { id: string; position: "before" | "after" } | null;

function buildDraft(preferences: NavItemPreference[], isAdmin: boolean): DraftItem[] {
  return ALL_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)
    .map((item) => {
      const pref = preferences.find((p) => p.id === item.id);
      return { id: item.id, visible: pref?.visible !== false, order: pref?.order ?? Infinity };
    })
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index }));
}

export default function NavPreferencesSettings() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { preferences, savePreferences, resetToDefault } = useNavPreferences();

  const [draft, setDraft] = useState<DraftItem[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [dropPos, setDropPos] = useState<DropPosition>(null);
  const dragIdRef = useRef<string | null>(null);

  // preferences가 바뀌면 (외부 저장 포함) draft 동기화
  useEffect(() => {
    setDraft(buildDraft(preferences, isAdmin));
    setIsDirty(false);
  }, [preferences, isAdmin]);

  // ── 드래그 핸들러 ─────────────────────────────────────────────

  const handleDragStart = (id: string) => {
    dragIdRef.current = id;
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    setDropPos((prev) =>
      prev?.id === id && prev.position === position ? prev : { id, position }
    );
  };

  const handleDrop = (toId: string) => {
    const fromId = dragIdRef.current;
    if (!fromId || fromId === toId || !dropPos) {
      dragIdRef.current = null;
      setDropPos(null);
      return;
    }

    setDraft((prev) => {
      const fromIdx = prev.findIndex((d) => d.id === fromId);
      const toIdx = prev.findIndex((d) => d.id === toId);
      if (fromIdx === -1 || toIdx === -1) return prev;

      const next = [...prev];
      const [removed] = next.splice(fromIdx, 1);

      // dropPos.position 기준으로 삽입 위치 계산
      const insertAt = next.findIndex((d) => d.id === toId);
      const offset = dropPos.position === "after" ? 1 : 0;
      next.splice(insertAt + offset, 0, removed);

      return next.map((item, i) => ({ ...item, order: i }));
    });

    dragIdRef.current = null;
    setDropPos(null);
    setIsDirty(true);
  };

  const handleDragEnd = () => {
    dragIdRef.current = null;
    setDropPos(null);
  };

  // ── 토글 ──────────────────────────────────────────────────────

  const handleToggle = (id: string) => {
    setDraft((prev) =>
      prev.map((d) => (d.id === id ? { ...d, visible: !d.visible } : d))
    );
    setIsDirty(true);
  };

  // ── 저장 ──────────────────────────────────────────────────────

  const handleSave = () => {
    // draft를 NavItemPreference[] 형태로 변환 (adminOnly가 아닌 항목 포함 전체)
    const updated: NavItemPreference[] = ALL_NAV_ITEMS.map((item) => {
      const d = draft.find((x) => x.id === item.id);
      return {
        id: item.id,
        visible: d?.visible !== false,
        order: d?.order ?? Infinity,
      };
    });
    savePreferences(updated);
    setIsDirty(false);
    toast({ title: "메뉴 설정이 저장되었습니다." });
  };

  const handleReset = () => {
    resetToDefault();
    setIsDirty(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">사이드바 메뉴 설정</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            메뉴를 드래그해서 순서를 변경하고, 토글로 표시 여부를 설정하세요
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="gap-2 text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            기본값으로
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty}
            className="gap-2"
          >
            <Save className="h-3.5 w-3.5" />
            저장
          </Button>
        </div>
      </div>

      <div className="space-y-0.5">
        {draft.map(({ id, visible }) => {
          const navItem = ALL_NAV_ITEMS.find((i) => i.id === id);
          if (!navItem) return null;

          const isDropBefore = dropPos?.id === id && dropPos.position === "before";
          const isDropAfter = dropPos?.id === id && dropPos.position === "after";
          const isDragging = dragIdRef.current === id;

          return (
            <div key={id}>
              {/* before 가로선 */}
              <div
                className={cn(
                  "h-0.5 rounded-full mx-1 transition-all duration-100",
                  isDropBefore ? "bg-primary" : "bg-transparent"
                )}
                style={isDropBefore ? {
                  boxShadow: "0 0 1px 1px hsl(var(--primary) / 0.45), 0 0 10px 3px hsl(var(--primary) / 0.18)",
                } : undefined}
              />

              <div
                draggable
                onDragStart={() => handleDragStart(id)}
                onDragOver={(e) => handleDragOver(e, id)}
                onDrop={() => handleDrop(id)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 transition-colors select-none",
                  isDragging && "opacity-40",
                  !visible && "opacity-50"
                )}
              >
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" />
                <navItem.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-sm font-medium text-foreground">
                  {navItem.label}
                </span>
                {navItem.adminOnly && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                    Admin
                  </span>
                )}
                <Switch
                  checked={visible}
                  onCheckedChange={() => handleToggle(id)}
                  aria-label={`${navItem.label} 메뉴 표시 여부`}
                />
              </div>

              {/* after 가로선 */}
              <div
                className={cn(
                  "h-0.5 rounded-full mx-1 transition-all duration-100",
                  isDropAfter ? "bg-primary" : "bg-transparent"
                )}
                style={isDropAfter ? {
                  boxShadow: "0 0 1px 1px hsl(var(--primary) / 0.45), 0 0 10px 3px hsl(var(--primary) / 0.18)",
                } : undefined}
              />
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        * 최소 1개 이상의 메뉴는 표시 상태여야 합니다
      </p>
    </div>
  );
}
