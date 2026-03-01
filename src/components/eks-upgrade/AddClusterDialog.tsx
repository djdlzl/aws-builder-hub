import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Terminal } from "lucide-react";
import { fetchKubectlContexts } from "@/lib/api/eks-upgrade";
import type { CreateClusterInstanceRequest, UpdateClusterInstanceRequest, KubectlContext, ClusterInstanceSummary } from "@/types/eks-upgrade";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (request: CreateClusterInstanceRequest) => Promise<void>;
  onUpdate?: (request: UpdateClusterInstanceRequest) => Promise<void>;
  initial?: ClusterInstanceSummary;
}

export function AddClusterDialog({ open, onOpenChange, onSubmit, onUpdate, initial }: Props) {
  const isEditMode = !!initial;
  const [clusterName, setClusterName] = useState("");
  const [environment, setEnvironment] = useState("");
  const [accountId, setAccountId] = useState("");
  const [region, setRegion] = useState("");
  const [selectedContextId, setSelectedContextId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contexts, setContexts] = useState<KubectlContext[]>([]);

  useEffect(() => {
    if (open) {
      fetchKubectlContexts().then(setContexts).catch(() => {});
      if (initial) {
        setClusterName(initial.clusterName);
        setEnvironment(initial.environment);
        setAccountId(initial.accountId ?? "");
        setRegion(initial.region ?? "");
        setSelectedContextId("");
      }
    }
  }, [open, initial]);

  const selectedContext = contexts.find((c) => String(c.id) === selectedContextId);

  // 편집 모드에서는 kubectlContext를 selectedContext 또는 초기값에서 결정
  const effectiveKubectlContext = selectedContext?.contextName || (isEditMode ? initial?.kubectlContext ?? undefined : undefined);

  const handleSubmit = async () => {
    if (!clusterName.trim() || !environment.trim()) return;
    try {
      setIsSubmitting(true);
      if (isEditMode && onUpdate) {
        await onUpdate({
          clusterName: clusterName.trim(),
          environment: environment.trim(),
          accountId: accountId.trim() || undefined,
          region: region.trim() || undefined,
          kubectlContext: effectiveKubectlContext,
        });
      } else if (onSubmit) {
        await onSubmit({
          clusterName: clusterName.trim(),
          environment: environment.trim(),
          accountId: accountId.trim() || undefined,
          region: region.trim() || undefined,
          kubectlContext: selectedContext?.contextName || undefined,
        });
      }
      if (!isEditMode) {
        setClusterName("");
        setEnvironment("");
        setAccountId("");
        setRegion("");
        setSelectedContextId("");
      }
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "클러스터 편집" : "클러스터 추가"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>클러스터 이름</Label>
              <Input
                placeholder="예: prd-apse1-tw-blue-cluster"
                value={clusterName}
                onChange={(e) => setClusterName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>환경</Label>
              <Input
                placeholder="예: prd-tw"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>AWS Account ID (선택)</Label>
              <Input
                placeholder="123456789012"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>리전 (선택)</Label>
              <Input
                placeholder="예: ap-southeast-1"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>kubectl context (선택)</Label>
            {isEditMode && initial?.kubectlContext && !selectedContextId && (
              <p className="text-xs font-mono text-muted-foreground">현재: {initial.kubectlContext}</p>
            )}
            {contexts.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md border border-dashed border-border p-2.5 text-xs text-muted-foreground">
                <Terminal className="h-3.5 w-3.5 shrink-0" />
                등록된 kubectl context가 없습니다. EKS 업그레이드 설정 탭에서 먼저 등록해주세요.
              </div>
            ) : (
              <>
                <Select value={selectedContextId} onValueChange={setSelectedContextId}>
                  <SelectTrigger>
                    <SelectValue placeholder={isEditMode ? "변경할 context 선택 (선택사항)" : "context 선택 (선택사항)"} />
                  </SelectTrigger>
                  <SelectContent>
                    {contexts.map((ctx) => (
                      <SelectItem key={ctx.id} value={String(ctx.id)}>
                        <span className="font-medium">{ctx.name}</span>
                        <span className="text-muted-foreground text-xs ml-2">
                          {ctx.contextName.length > 40 ? ctx.contextName.slice(-40) : ctx.contextName}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedContext && (
                  <p className="text-xs font-mono text-muted-foreground truncate">
                    {selectedContext.contextName}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !clusterName.trim() || !environment.trim()}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEditMode ? "저장" : "추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
