import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { updateBlock } from "@/lib/api/eks-upgrade";
import { useToast } from "@/hooks/use-toast";
import type { Block, BlockStage, CheckItem } from "@/types/eks-upgrade";
import { BLOCK_STAGE_META } from "@/types/eks-upgrade";

interface AddonItem {
  name: string;
  currentVersion: string;
  targetVersion: string;
}

const parseAddonParams = (params: string | null): AddonItem[] => {
  if (!params) return [{ name: "", currentVersion: "", targetVersion: "" }];
  try {
    const parsed = JSON.parse(params);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // ignore
  }
  return [{ name: "", currentVersion: "", targetVersion: "" }];
};

const emptyAddon = (): AddonItem => ({ name: "", currentVersion: "", targetVersion: "" });

const parseCheckParams = (params: string | null): CheckItem[] => {
  try {
    const parsed = params ? JSON.parse(params) : null;
    if (parsed?.items && Array.isArray(parsed.items) && parsed.items.length > 0) return parsed.items;
  } catch { /* ignore */ }
  return [{ id: crypto.randomUUID(), label: "" }];
};

interface Props {
  block: Block;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

export function EditBlockDialog({ block, open, onOpenChange, onRefresh }: Props) {
  const { toast } = useToast();
  const [blockStage, setBlockStage] = useState<BlockStage>(block.blockStage);
  const [title, setTitle] = useState(block.title);
  const [description, setDescription] = useState(block.description ?? "");
  const [command, setCommand] = useState(block.command ?? "");
  const [filePath, setFilePath] = useState(block.filePath ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ADDON 전용 상태
  const [addonItems, setAddonItems] = useState<AddonItem[]>(parseAddonParams(block.params));

  // VERSION 전용 상태
  const parseVersionParams = (params: string | null) => {
    try { return params ? JSON.parse(params) : {}; } catch { return {}; }
  };
  const [versionCurrent, setVersionCurrent] = useState(() => parseVersionParams(block.params).current ?? "");
  const [versionTarget, setVersionTarget] = useState(() => parseVersionParams(block.params).target ?? "");

  // CHECK 전용 상태
  const [checkItems, setCheckItems] = useState<CheckItem[]>(() => parseCheckParams(block.params));

  useEffect(() => {
    setBlockStage(block.blockStage);
    setTitle(block.title);
    setDescription(block.description ?? "");
    setCommand(block.command ?? "");
    setFilePath(block.filePath ?? "");
    setAddonItems(parseAddonParams(block.params));
    const vp = parseVersionParams(block.params);
    setVersionCurrent(vp.current ?? "");
    setVersionTarget(vp.target ?? "");
    setCheckItems(parseCheckParams(block.params));
  }, [block]);

  const isCheck = block.blockType === "CHECK";
  const isAddon = block.blockType === "ADDON";
  const isRollout = block.blockType === "ROLLOUT";
  const isVersion = block.blockType === "VERSION";
  const showCommand = block.blockType === "RUN";

  const updateAddon = (index: number, field: keyof AddonItem, value: string) => {
    setAddonItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    let params: string | undefined;
    if (isCheck) {
      const validItems = checkItems.filter((c) => c.label.trim());
      if (validItems.length === 0) return;
      params = JSON.stringify({ items: validItems });
    } else if (isAddon) {
      const validItems = addonItems.filter((a) => a.name.trim());
      if (validItems.length === 0) return;
      params = JSON.stringify(validItems);
    } else if (isVersion) {
      if (!versionCurrent.trim() || !versionTarget.trim()) return;
      params = JSON.stringify({ current: versionCurrent.trim(), target: versionTarget.trim() });
    }

    try {
      setIsSubmitting(true);
      await updateBlock(block.id, {
        title: title.trim(),
        blockStage,
        description: description.trim() || undefined,
        command: command.trim() || undefined,
        filePath: filePath.trim() || undefined,
        params,
        sortOrder: block.sortOrder,
      });
      toast({ title: "블록 수정 완료" });
      onRefresh();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "블록 수정 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>블록 편집</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* 단계 선택 */}
          <div className="space-y-1.5">
            <Label>단계</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["PRE", "UPGRADE", "POST"] as BlockStage[]).map((stage) => (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setBlockStage(stage)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors text-center ${
                    blockStage === stage
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-background hover:bg-muted text-foreground"
                  }`}
                >
                  {BLOCK_STAGE_META[stage].label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>제목</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>설명 (선택)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          {/* VERSION 전용 UI */}
          {isVersion && (
            <div className="space-y-2">
              <Label>버전 정보</Label>
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="grid grid-cols-2 gap-0 bg-muted/50 px-3 py-2 text-xs text-muted-foreground font-medium">
                  <span>현재 버전</span>
                  <span className="pl-3 border-l border-border/50">목표 버전</span>
                </div>
                <div className="grid grid-cols-2 gap-0 border-t border-border/50 px-3 py-2 items-center">
                  <Input
                    placeholder="예: 1.28"
                    value={versionCurrent}
                    onChange={(e) => setVersionCurrent(e.target.value)}
                    className="h-7 text-sm border-0 shadow-none focus-visible:ring-0 px-0 rounded-none font-mono"
                  />
                  <Input
                    placeholder="예: 1.29"
                    value={versionTarget}
                    onChange={(e) => setVersionTarget(e.target.value)}
                    className="h-7 text-sm border-0 border-l border-border/50 shadow-none focus-visible:ring-0 px-3 rounded-none font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CHECK 전용 UI */}
          {isCheck && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>확인 항목</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setCheckItems((prev) => [...prev, { id: crypto.randomUUID(), label: "" }])}
                >
                  <Plus className="h-3 w-3" />
                  항목 추가
                </Button>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                {checkItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 px-3 py-2 ${index > 0 ? "border-t border-border/50" : ""}`}
                  >
                    <span className="text-muted-foreground text-xs w-4 shrink-0">{index + 1}.</span>
                    <Input
                      placeholder="예: kubectl get nodes → 모든 노드 Ready 확인"
                      value={item.label}
                      onChange={(e) =>
                        setCheckItems((prev) =>
                          prev.map((c, i) => (i === index ? { ...c, label: e.target.value } : c))
                        )
                      }
                      className="h-7 text-sm border-0 shadow-none focus-visible:ring-0 px-0 rounded-none flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setCheckItems((prev) => prev.filter((_, i) => i !== index))}
                      disabled={checkItems.length === 1}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">클러스터 탭에서 항목별로 체크하며 진행합니다.</p>
            </div>
          )}

          {/* ADDON 전용 UI */}
          {isAddon && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>애드온 목록</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddonItems((prev) => [...prev, emptyAddon()])}
                  className="h-7 gap-1 text-xs"
                >
                  <Plus className="h-3 w-3" />
                  추가
                </Button>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="grid grid-cols-[1fr_1fr_1fr_32px] gap-0 bg-muted/50 px-3 py-2 text-xs text-muted-foreground font-medium">
                  <span>애드온 이름</span>
                  <span>현재 버전</span>
                  <span>목표 버전</span>
                  <span />
                </div>
                {addonItems.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[1fr_1fr_1fr_32px] gap-0 border-t border-border/50 px-3 py-2 items-center"
                  >
                    <Input
                      placeholder="예: metrics-server"
                      value={item.name}
                      onChange={(e) => updateAddon(index, "name", e.target.value)}
                      className="h-7 text-xs border-0 shadow-none focus-visible:ring-0 px-0 rounded-none"
                    />
                    <Input
                      placeholder="현재 버전"
                      value={item.currentVersion}
                      onChange={(e) => updateAddon(index, "currentVersion", e.target.value)}
                      className="h-7 text-xs border-0 border-l border-border/50 shadow-none focus-visible:ring-0 px-2 rounded-none font-mono"
                    />
                    <Input
                      placeholder="목표 버전"
                      value={item.targetVersion}
                      onChange={(e) => updateAddon(index, "targetVersion", e.target.value)}
                      className="h-7 text-xs border-0 border-l border-border/50 shadow-none focus-visible:ring-0 px-2 rounded-none font-mono"
                    />
                    <div className="flex justify-center border-l border-border/50 pl-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => setAddonItems((prev) => prev.filter((_, i) => i !== index))}
                        disabled={addonItems.length === 1}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showCommand && (
            <div className="space-y-1.5">
              <Label>명령어</Label>
              <Textarea
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          )}

          {/* ROLLOUT: 안내 문구 */}
          {isRollout && (
            <div className="rounded-md bg-muted/50 border border-border/50 p-3 space-y-1">
              <p className="text-xs font-medium text-foreground">Rollout 블록 안내</p>
              <p className="text-xs text-muted-foreground">
                실제 rollout할 Deployment는 각 클러스터 실행 화면에서 선택합니다.
              </p>
            </div>
          )}

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !title.trim()}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
