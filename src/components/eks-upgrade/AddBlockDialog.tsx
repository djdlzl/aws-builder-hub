import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { BlockType, BlockStage, CheckItem, CreateBlockRequest } from "@/types/eks-upgrade";
import { BLOCK_STAGE_META } from "@/types/eks-upgrade";
import {
  CUSTOM_LOCUST_GATEWAY_OPTION,
  getLocustGatewaySelectValue,
  LOCUST_GATEWAY_URL_OPTIONS,
} from "@/constants/locust";

const BLOCK_TYPE_OPTIONS: { value: BlockType; label: string; description: string }[] = [
  { value: "CHECK",   label: "체크",             description: "수동으로 확인하는 체크리스트 항목" },
  { value: "RUN",     label: "실행",             description: "kubectl, aws cli 등 명령어 실행 (서버에서 직접 실행)" },
  { value: "ROLLOUT", label: "Rollout",          description: "kubectl rollout restart - 클러스터에서 deployment 선택 후 순차 실행" },
  { value: "ADDON",   label: "애드온 업그레이드", description: "EKS 애드온 버전 업그레이드" },
  { value: "GIT_CLONE", label: "코드 편집",       description: "SSH URL로 repo를 clone하고 code-server에서 편집" },
  { value: "LOCUST",  label: "Locust 헬스체크",  description: "서비스 헬스체크 + Locust 부하 테스트" },
  { value: "NOTE",    label: "메모",             description: "참고 사항이나 설명 텍스트" },
];

interface AddonItem {
  name: string;
  currentVersion: string;
  targetVersion: string;
}

const emptyAddon = (): AddonItem => ({ name: "", currentVersion: "", targetVersion: "" });

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (request: CreateBlockRequest) => Promise<void>;
}

export function AddBlockDialog({ open, onOpenChange, onSubmit }: Props) {
  const [blockType, setBlockType] = useState<BlockType>("CHECK");
  const [blockStage, setBlockStage] = useState<BlockStage>("PRE");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [command, setCommand] = useState("");
  const [filePath, setFilePath] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ADDON 전용 상태
  const [addonItems, setAddonItems] = useState<AddonItem[]>([emptyAddon()]);

  // GIT_CLONE 전용 상태
  const [gitRepoUrl, setGitRepoUrl] = useState("");
  const [gitBranch, setGitBranch] = useState("");
  const [gitTargetDir, setGitTargetDir] = useState("");

  // LOCUST 전용 상태
  const [locustGatewayUrl, setLocustGatewayUrl] = useState("");
  const [locustGatewaySelectValue, setLocustGatewaySelectValue] = useState(CUSTOM_LOCUST_GATEWAY_OPTION);
  const [locustWorkerCount, setLocustWorkerCount] = useState(5);

  // CHECK 전용 상태
  const [checkItems, setCheckItems] = useState<CheckItem[]>([{ id: crypto.randomUUID(), label: "" }]);

  const showCommand = blockType === "RUN";
  const isCheck = blockType === "CHECK";
  const isRollout = blockType === "ROLLOUT";
  const isAddon = blockType === "ADDON";
  const isGitClone = blockType === "GIT_CLONE";
  const isLocust = blockType === "LOCUST";

  const updateAddon = (index: number, field: keyof AddonItem, value: string) => {
    setAddonItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addAddonRow = () => setAddonItems((prev) => [...prev, emptyAddon()]);

  const removeAddonRow = (index: number) =>
    setAddonItems((prev) => prev.filter((_, i) => i !== index));

  const reset = () => {
    setBlockStage("PRE");
    setTitle("");
    setDescription("");
    setCommand("");
    setFilePath("");
    setAddonItems([emptyAddon()]);
    setGitRepoUrl("");
    setGitBranch("");
    setGitTargetDir("");
    setLocustGatewayUrl("");
    setLocustGatewaySelectValue(CUSTOM_LOCUST_GATEWAY_OPTION);
    setLocustWorkerCount(5);
    setCheckItems([{ id: crypto.randomUUID(), label: "" }]);
    setBlockType("CHECK");
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
    } else if (isGitClone) {
      if (!gitRepoUrl.trim()) return;
      params = JSON.stringify({
        repoUrl: gitRepoUrl.trim(),
        ...(gitBranch.trim() && { branch: gitBranch.trim() }),
        ...(gitTargetDir.trim() && { targetDir: gitTargetDir.trim() }),
      });
    } else if (isLocust) {
      if (!locustGatewayUrl.trim()) return;
      params = JSON.stringify({
        gatewayUrl: locustGatewayUrl.trim(),
        workerCount: locustWorkerCount,
      });
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        blockType,
        blockStage,
        title: title.trim(),
        description: description.trim() || undefined,
        command: command.trim() || undefined,
        filePath: filePath.trim() || undefined,
        params,
      });
      reset();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled = isSubmitting || !title.trim() ||
    (isCheck && checkItems.every((c) => !c.label.trim())) ||
    (isAddon && addonItems.every((a) => !a.name.trim())) ||
    (isGitClone && !gitRepoUrl.trim()) ||
    (isLocust && !locustGatewayUrl.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>블록 추가</DialogTitle>
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
            <Label>블록 타입</Label>
            <Select value={blockType} onValueChange={(v) => setBlockType(v as BlockType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BLOCK_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-muted-foreground text-xs ml-2">{opt.description}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>제목</Label>
            <Input
              placeholder="블록 제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>설명 (선택)</Label>
            <Textarea
              placeholder="이 블록에 대한 설명이나 참고 사항"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* CHECK 전용 UI */}
          {isCheck && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>확인 항목 <span className="text-destructive">*</span></Label>
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
                <Button type="button" variant="outline" size="sm" onClick={addAddonRow} className="h-7 gap-1 text-xs">
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
                      placeholder="예: 3.13.0"
                      value={item.currentVersion}
                      onChange={(e) => updateAddon(index, "currentVersion", e.target.value)}
                      className="h-7 text-xs border-0 border-l border-border/50 shadow-none focus-visible:ring-0 px-2 rounded-none font-mono"
                    />
                    <Input
                      placeholder="예: 3.14.0"
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
                        onClick={() => removeAddonRow(index)}
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
                placeholder="실행할 명령어 (여러 줄 입력 가능)"
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
                블록 템플릿에서는 Rollout 블록을 추가만 합니다.
                실제 rollout할 Deployment는 각 클러스터 실행 화면에서 선택합니다.
              </p>
            </div>
          )}

          {isGitClone && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>SSH Repo URL <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="git@bitbucket.org:spooncast/eks-values.git"
                  value={gitRepoUrl}
                  onChange={(e) => setGitRepoUrl(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>브랜치 (선택)</Label>
                  <Input
                    placeholder="main"
                    value={gitBranch}
                    onChange={(e) => setGitBranch(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>저장 디렉토리 (선택)</Label>
                  <Input
                    placeholder="자동: repo 이름"
                    value={gitTargetDir}
                    onChange={(e) => setGitTargetDir(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                서버 workspace에 clone됩니다: <code>/home/coder/project/{"<"}디렉토리명{">"}</code>
              </p>
            </div>
          )}

          {isLocust && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>게이트웨이 URL <span className="text-destructive">*</span></Label>
                <Select
                  value={locustGatewaySelectValue}
                  onValueChange={(value) => {
                    setLocustGatewaySelectValue(value);
                    if (value !== CUSTOM_LOCUST_GATEWAY_OPTION) {
                      setLocustGatewayUrl(value);
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
                    placeholder="https://custom-gateway.example.com"
                    value={locustGatewayUrl}
                    onChange={(e) => {
                      const value = e.target.value;
                      setLocustGatewayUrl(value);
                      setLocustGatewaySelectValue(getLocustGatewaySelectValue(value));
                    }}
                    className="font-mono text-sm"
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Worker 수</Label>
                <Input
                  type="number"
                  value={locustWorkerCount}
                  onChange={(e) => setLocustWorkerCount(Number(e.target.value))}
                  min={1}
                  max={20}
                  className="w-24 text-sm"
                />
              </div>
            </div>
          )}

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitDisabled}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            추가
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
