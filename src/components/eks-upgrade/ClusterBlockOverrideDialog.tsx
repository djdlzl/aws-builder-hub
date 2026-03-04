import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, RotateCcw } from "lucide-react";
import { upsertBlockOverride } from "@/lib/api/eks-upgrade";
import { useToast } from "@/hooks/use-toast";
import type { Block, BlockOverride } from "@/types/eks-upgrade";
import {
  CUSTOM_LOCUST_GATEWAY_OPTION,
  getLocustGatewaySelectValue,
  LOCUST_GATEWAY_URL_OPTIONS,
} from "@/constants/locust";

interface AddonItem {
  name: string;
  currentVersion: string;
  targetVersion: string;
}

interface GitParams {
  repoUrl: string;
  branch?: string;
  targetDir?: string;
}

interface LocustParams {
  gatewayUrl: string;
  workerCount?: number;
}

const emptyAddon = (): AddonItem => ({ name: "", currentVersion: "", targetVersion: "" });

interface Props {
  instanceId: number;
  block: Block;
  override: BlockOverride | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

export function ClusterBlockOverrideDialog({ instanceId, block, override, open, onOpenChange, onRefresh }: Props) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // command override (RUN 등)
  const [commandValue, setCommandValue] = useState("");

  // ADDON params override
  const [addonItems, setAddonItems] = useState<AddonItem[]>([emptyAddon()]);

  // GIT_CLONE params override
  const [gitParams, setGitParams] = useState<GitParams>({ repoUrl: "", branch: "", targetDir: "" });

  // LOCUST params override
  const [locustParams, setLocustParams] = useState<LocustParams>({ gatewayUrl: "", workerCount: undefined });
  const [locustGatewaySelectValue, setLocustGatewaySelectValue] = useState(CUSTOM_LOCUST_GATEWAY_OPTION);

  const isAddon = block.blockType === "ADDON";
  const isGitClone = block.blockType === "GIT_CLONE";
  const isLocust = block.blockType === "LOCUST";
  const isNote = block.blockType === "NOTE";
  const isRollout = block.blockType === "ROLLOUT";
  // CHECK: 수동 확인 체크리스트 (명령어 없음), VERSION: 버전 정보 (명령어 없음)
  const isCheck = block.blockType === "CHECK";
  const isVersion = block.blockType === "VERSION";
  const showCommand = !isAddon && !isGitClone && !isLocust && !isNote && !isCheck && !isVersion && !isRollout;

  useEffect(() => {
    if (!open) return;

    if (showCommand) {
      setCommandValue(override?.commandOverride ?? block.command ?? "");
    }

    if (isAddon) {
      const raw = override?.paramsOverride ?? block.params;
      try {
        const parsed = raw ? JSON.parse(raw) : null;
        setAddonItems(Array.isArray(parsed) && parsed.length > 0 ? parsed : [emptyAddon()]);
      } catch {
        setAddonItems([emptyAddon()]);
      }
    }

    if (isGitClone) {
      const raw = override?.paramsOverride ?? block.params;
      try {
        const parsed = raw ? JSON.parse(raw) : {};
        setGitParams({ repoUrl: parsed.repoUrl ?? "", branch: parsed.branch ?? "", targetDir: parsed.targetDir ?? "" });
      } catch {
        setGitParams({ repoUrl: "", branch: "", targetDir: "" });
      }
    }

    if (isLocust) {
      const raw = override?.paramsOverride ?? block.params;
      try {
        const parsed = raw ? JSON.parse(raw) : {};
        const gatewayUrl = parsed.gatewayUrl ?? "";
        setLocustParams({ gatewayUrl, workerCount: parsed.workerCount });
        setLocustGatewaySelectValue(getLocustGatewaySelectValue(gatewayUrl));
      } catch {
        setLocustParams({ gatewayUrl: "", workerCount: undefined });
        setLocustGatewaySelectValue(CUSTOM_LOCUST_GATEWAY_OPTION);
      }
    }
  }, [open, block, override, isAddon, isGitClone, isLocust, showCommand]);

  const handleReset = () => {
    if (showCommand) setCommandValue(block.command ?? "");
    if (isAddon) {
      try {
        const parsed = block.params ? JSON.parse(block.params) : null;
        setAddonItems(Array.isArray(parsed) && parsed.length > 0 ? parsed : [emptyAddon()]);
      } catch { setAddonItems([emptyAddon()]); }
    }
    if (isGitClone) {
      try {
        const parsed = block.params ? JSON.parse(block.params) : {};
        setGitParams({ repoUrl: parsed.repoUrl ?? "", branch: parsed.branch ?? "", targetDir: parsed.targetDir ?? "" });
      } catch { setGitParams({ repoUrl: "", branch: "", targetDir: "" }); }
    }
    if (isLocust) {
      try {
        const parsed = block.params ? JSON.parse(block.params) : {};
        const gatewayUrl = parsed.gatewayUrl ?? "";
        setLocustParams({ gatewayUrl, workerCount: parsed.workerCount });
        setLocustGatewaySelectValue(getLocustGatewaySelectValue(gatewayUrl));
      } catch {
        setLocustParams({ gatewayUrl: "", workerCount: undefined });
        setLocustGatewaySelectValue(CUSTOM_LOCUST_GATEWAY_OPTION);
      }
    }
  };

  const handleSubmit = async () => {
    let commandOverride: string | undefined;
    let paramsOverride: string | undefined;

    if (showCommand) {
      const trimmed = commandValue.trim();
      const originalTrimmed = (block.command ?? "").trim();
      commandOverride = trimmed === "" || trimmed === originalTrimmed ? undefined : commandValue;
    }

    if (isAddon) {
      const validItems = addonItems.filter((a) => a.name.trim());
      if (validItems.length === 0) return;
      const originalJson = block.params ?? "[]";
      const newJson = JSON.stringify(validItems);
      paramsOverride = newJson === originalJson ? undefined : newJson;
    }

    if (isGitClone) {
      const newJson = JSON.stringify({
        repoUrl: gitParams.repoUrl,
        ...(gitParams.branch ? { branch: gitParams.branch } : {}),
        ...(gitParams.targetDir ? { targetDir: gitParams.targetDir } : {}),
      });
      paramsOverride = newJson === block.params ? undefined : newJson;
    }

    if (isLocust) {
      const newJson = JSON.stringify({
        gatewayUrl: locustParams.gatewayUrl,
        ...(locustParams.workerCount != null ? { workerCount: locustParams.workerCount } : {}),
      });
      paramsOverride = newJson === block.params ? undefined : newJson;
    }

    try {
      setIsSubmitting(true);
      await upsertBlockOverride(instanceId, block.id, {
        isEnabled: override?.isEnabled ?? true,
        commandOverride,
        paramsOverride,
      });
      toast({ title: "클러스터 오버라이드 저장 완료" });
      onRefresh();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "저장 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateAddon = (index: number, field: keyof AddonItem, value: string) => {
    setAddonItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const hasOverride = override?.commandOverride != null || override?.paramsOverride != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>클러스터 블록 오버라이드</DialogTitle>
        </DialogHeader>

        <div className="space-y-1 pb-1">
          <p className="text-xs text-muted-foreground">
            이 클러스터에만 적용되는 값을 설정합니다. 원본 블록은 변경되지 않습니다.
          </p>
          <p className="text-sm font-medium">{block.title}</p>
        </div>

        {isNote || isRollout ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {isRollout ? "Rollout 블록은 클러스터 실행 화면에서 직접 Deployment를 선택합니다." : "메모 블록은 오버라이드할 값이 없습니다."}
          </p>
        ) : (
          <div className="space-y-4 py-2">
            {showCommand && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>명령어</Label>
                  {hasOverride && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs gap-1 text-muted-foreground"
                      onClick={handleReset}
                    >
                      <RotateCcw className="h-3 w-3" />
                      원본으로 초기화
                    </Button>
                  )}
                </div>
                <Textarea
                  value={commandValue}
                  onChange={(e) => setCommandValue(e.target.value)}
                  rows={Math.max(3, Math.min(10, commandValue.split("\n").length + 1))}
                  className="font-mono text-sm resize-none"
                />
                <p className="text-[11px] text-muted-foreground/60">원본과 동일하거나 비우면 오버라이드가 해제됩니다.</p>
              </div>
            )}

            {isAddon && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>애드온 목록</Label>
                  <div className="flex items-center gap-1">
                    {hasOverride && (
                      <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1 text-muted-foreground" onClick={handleReset}>
                        <RotateCcw className="h-3 w-3" />
                        초기화
                      </Button>
                    )}
                    <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setAddonItems((prev) => [...prev, emptyAddon()])}>
                      <Plus className="h-3 w-3" />
                      추가
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="grid grid-cols-[1fr_1fr_1fr_32px] gap-0 bg-muted/50 px-3 py-2 text-xs text-muted-foreground font-medium">
                    <span>애드온 이름</span><span>현재 버전</span><span>목표 버전</span><span />
                  </div>
                  {addonItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-0 border-t border-border/50 px-3 py-2 items-center">
                      <Input placeholder="예: metrics-server" value={item.name} onChange={(e) => updateAddon(index, "name", e.target.value)} className="h-7 text-xs border-0 shadow-none focus-visible:ring-0 px-0 rounded-none" />
                      <Input placeholder="현재 버전" value={item.currentVersion} onChange={(e) => updateAddon(index, "currentVersion", e.target.value)} className="h-7 text-xs border-0 border-l border-border/50 shadow-none focus-visible:ring-0 px-2 rounded-none font-mono" />
                      <Input placeholder="목표 버전" value={item.targetVersion} onChange={(e) => updateAddon(index, "targetVersion", e.target.value)} className="h-7 text-xs border-0 border-l border-border/50 shadow-none focus-visible:ring-0 px-2 rounded-none font-mono" />
                      <div className="flex justify-center border-l border-border/50 pl-1">
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => setAddonItems((prev) => prev.filter((_, i) => i !== index))} disabled={addonItems.length === 1}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isGitClone && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Git 저장소 설정</Label>
                  {hasOverride && (
                    <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1 text-muted-foreground" onClick={handleReset}>
                      <RotateCcw className="h-3 w-3" />
                      초기화
                    </Button>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Repository URL</Label>
                  <Input value={gitParams.repoUrl} onChange={(e) => setGitParams((p) => ({ ...p, repoUrl: e.target.value }))} className="font-mono text-sm" placeholder="https://github.com/org/repo.git" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Branch (선택)</Label>
                  <Input value={gitParams.branch ?? ""} onChange={(e) => setGitParams((p) => ({ ...p, branch: e.target.value }))} className="font-mono text-sm" placeholder="main" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Target Directory (선택)</Label>
                  <Input value={gitParams.targetDir ?? ""} onChange={(e) => setGitParams((p) => ({ ...p, targetDir: e.target.value }))} className="font-mono text-sm" placeholder="my-repo" />
                </div>
              </div>
            )}

            {isLocust && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Locust 설정</Label>
                  {hasOverride && (
                    <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1 text-muted-foreground" onClick={handleReset}>
                      <RotateCcw className="h-3 w-3" />
                      초기화
                    </Button>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Gateway URL</Label>
                  <Select
                    value={locustGatewaySelectValue}
                    onValueChange={(value) => {
                      setLocustGatewaySelectValue(value);
                      if (value !== CUSTOM_LOCUST_GATEWAY_OPTION) {
                        setLocustParams((p) => ({ ...p, gatewayUrl: value }));
                      }
                    }}
                  >
                    <SelectTrigger className="font-mono text-sm">
                      <SelectValue placeholder="게이트웨이 URL 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCUST_GATEWAY_URL_OPTIONS.map((url) => (
                        <SelectItem key={url} value={url} className="font-mono text-xs">
                          {url}
                        </SelectItem>
                      ))}
                      <SelectItem value={CUSTOM_LOCUST_GATEWAY_OPTION}>직접 입력</SelectItem>
                    </SelectContent>
                  </Select>
                  {locustGatewaySelectValue === CUSTOM_LOCUST_GATEWAY_OPTION && (
                    <Input
                      value={locustParams.gatewayUrl}
                      onChange={(e) => {
                        const gatewayUrl = e.target.value;
                        setLocustParams((p) => ({ ...p, gatewayUrl }));
                        setLocustGatewaySelectValue(getLocustGatewaySelectValue(gatewayUrl));
                      }}
                      className="font-mono text-sm"
                      placeholder="https://custom-gateway.example.com"
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Worker Count (선택)</Label>
                  <Input
                    type="number"
                    value={locustParams.workerCount ?? ""}
                    onChange={(e) => setLocustParams((p) => ({ ...p, workerCount: e.target.value ? Number(e.target.value) : undefined }))}
                    className="font-mono text-sm"
                    placeholder="5"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            취소
          </Button>
          {!isNote && !isRollout && (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              저장
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
