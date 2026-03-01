import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Terminal, Check, X, Loader2, Server, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  fetchKubectlContexts,
  createKubectlContext,
  updateKubectlContext,
  deleteKubectlContext,
} from "@/lib/api/eks-upgrade";
import type { KubectlContext } from "@/types/eks-upgrade";
import { API_CONFIG, buildApiUrl } from "@/config/api";
import { cn } from "@/lib/utils";

interface AwsAccountOption {
  accountId: string;
  accountName: string;
  roleArn: string;
}

const REGION_OPTIONS = [
  "ap-northeast-2",
  "ap-northeast-1",
  "ap-southeast-1",
  "us-west-2",
  "us-east-1",
];

const BADGE_COLORS = [
  "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "bg-green-500/10 text-green-600 border-green-500/20",
  "bg-rose-500/10 text-rose-600 border-rose-500/20",
];

const getAccountBadgeColor = (accountId: string, accounts: AwsAccountOption[]) => {
  const idx = accounts.findIndex((a) => a.accountId === accountId);
  return BADGE_COLORS[idx % BADGE_COLORS.length] ?? BADGE_COLORS[0];
};

interface EditingState {
  id: number | null;
  name: string;
  clusterName: string;
  region: string;
  accountEnv: string;
  contextAlias: string;
  description: string;
}

const emptyEditing = (firstAccountId?: string): EditingState => ({
  id: null,
  name: "",
  clusterName: "",
  region: "ap-northeast-2",
  accountEnv: firstAccountId ?? "",
  contextAlias: "",
  description: "",
});

interface KubectlContextSettingsProps {
  onCreateButtonRef?: (fn: () => void) => void;
}

export function KubectlContextSettings({ onCreateButtonRef }: KubectlContextSettingsProps) {
  const { toast } = useToast();
  const [contexts, setContexts] = useState<KubectlContext[]>([]);
  const [awsAccounts, setAwsAccounts] = useState<AwsAccountOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);

  const loadAccounts = useCallback(async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AWS_ACCOUNTS.LIST), {
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) return;
      const data = await res.json();
      const list: AwsAccountOption[] = (data.results ?? []).map((a: { accountId: string; accountName: string; roleArn: string }) => ({
        accountId: a.accountId,
        accountName: a.accountName,
        roleArn: a.roleArn,
      }));
      setAwsAccounts(list);
      return list;
    } catch { /* 무시 */ }
  }, []);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      await loadAccounts();
      setContexts(await fetchKubectlContexts());
    } catch (e) {
      toast({ title: "불러오기 실패", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, loadAccounts]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    onCreateButtonRef?.(() => setEditing(emptyEditing(awsAccounts[0]?.accountId)));
  }, [onCreateButtonRef, awsAccounts]);

  const handleSave = async () => {
    if (!editing || !editing.name.trim() || !editing.clusterName.trim()) return;
    setIsSaving(true);
    try {
      const payload = {
        name: editing.name.trim(),
        clusterName: editing.clusterName.trim(),
        region: editing.region,
        accountEnv: editing.accountEnv,
        contextAlias: editing.contextAlias.trim() || undefined,
        description: editing.description.trim() || undefined,
      };
      if (editing.id === null) {
        await createKubectlContext(payload);
        toast({ title: "kubectl context 등록 완료", description: "aws eks update-kubeconfig 실행됨" });
      } else {
        await updateKubectlContext(editing.id, payload);
        toast({ title: "kubectl context 수정 완료" });
      }
      setEditing(null);
      await load();
    } catch (e) {
      toast({ title: "저장 실패", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteKubectlContext(id);
      toast({ title: "kubectl context 삭제됨" });
      await load();
    } catch (e) {
      toast({ title: "삭제 실패", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (ctx: KubectlContext) =>
    setEditing({
      id: ctx.id,
      name: ctx.name,
      clusterName: ctx.clusterName ?? "",
      region: ctx.region ?? "ap-northeast-2",
      accountEnv: ctx.accountEnv ?? "",
      contextAlias: ctx.contextName,
      description: ctx.description ?? "",
    });

  const selectedAccount = awsAccounts.find((a) => a.accountId === editing?.accountEnv);
  const effectiveAlias = editing?.contextAlias.trim() || editing?.clusterName.trim() || "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            kubectl context 관리
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            EKS 클러스터를 등록하면 서버에서 자동으로 <code className="bg-muted px-1 rounded">aws eks update-kubeconfig</code>를 실행합니다.
          </p>
        </div>
        {editing === null && !onCreateButtonRef && (
          <Button size="sm" onClick={() => setEditing(emptyEditing(awsAccounts[0]?.accountId))} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            클러스터 등록
          </Button>
        )}
      </div>

      {/* 추가/편집 폼 */}
      {editing !== null && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-4">
          <p className="text-xs font-medium text-foreground">
            {editing.id === null ? "새 EKS 클러스터 등록" : "클러스터 설정 편집"}
          </p>

          {/* 표시 이름 + 클러스터명 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">표시 이름 *</Label>
              <Input
                value={editing.name}
                onChange={(e) => setEditing((p) => p && { ...p, name: e.target.value })}
                placeholder="예: Dev Korea Blue"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">EKS 클러스터명 *</Label>
              <Input
                value={editing.clusterName}
                onChange={(e) => setEditing((p) => p && { ...p, clusterName: e.target.value })}
                placeholder="예: dev-apne2-kr-blue-cluster"
                className="h-8 text-sm font-mono"
              />
            </div>
          </div>

          {/* 계정 환경 선택 */}
          <div className="space-y-1.5">
            <Label className="text-xs">계정 *</Label>
            {awsAccounts.length === 0 ? (
              <p className="text-xs text-muted-foreground">AWS 계정을 먼저 등록해주세요.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {awsAccounts.map((acc) => (
                  <button
                    key={acc.accountId}
                    type="button"
                    onClick={() => setEditing((p) => p && { ...p, accountEnv: acc.accountId })}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium border transition-all",
                      editing.accountEnv === acc.accountId
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    )}
                  >
                    {acc.accountName}
                    <span className="ml-1.5 opacity-60 font-mono">{acc.accountId}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedAccount && (
              <p className="text-xs text-muted-foreground font-mono truncate">
                Assume Role: {selectedAccount.roleArn}
              </p>
            )}
          </div>

          {/* 리전 + 컨텍스트 alias */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">리전 *</Label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowRegionDropdown((v) => !v)}
                  className="w-full h-8 px-3 text-sm text-left rounded-md border border-input bg-background flex items-center justify-between hover:border-primary/50"
                >
                  <span className="font-mono">{editing.region}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                {showRegionDropdown && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md py-1">
                    {REGION_OPTIONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        className="w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-accent"
                        onClick={() => {
                          setEditing((p) => p && { ...p, region: r });
                          setShowRegionDropdown(false);
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">컨텍스트 별칭 (선택)</Label>
              <Input
                value={editing.contextAlias}
                onChange={(e) => setEditing((p) => p && { ...p, contextAlias: e.target.value })}
                placeholder={editing.clusterName || "클러스터명으로 자동 설정"}
                className="h-8 text-sm font-mono"
              />
              {effectiveAlias && (
                <p className="text-xs text-muted-foreground">
                  저장 후 context 이름: <code className="bg-muted px-1 rounded">{effectiveAlias}</code>
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">설명 (선택)</Label>
            <Textarea
              value={editing.description}
              onChange={(e) => setEditing((p) => p && { ...p, description: e.target.value })}
              placeholder="이 context에 대한 간단한 설명"
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => setEditing(null)}
              disabled={isSaving}
            >
              <X className="h-3.5 w-3.5" />
              취소
            </Button>
            <Button
              size="sm"
              className="gap-1"
              onClick={handleSave}
              disabled={isSaving || !editing.name.trim() || !editing.clusterName.trim() || !editing.accountEnv}
            >
              {isSaving
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Check className="h-3.5 w-3.5" />
              }
              {isSaving ? "등록 중..." : "저장"}
            </Button>
          </div>
        </div>
      )}

      {/* 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : contexts.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
          등록된 kubectl context가 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {contexts.map((ctx) => (
            <div
              key={ctx.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
            >
              <Server className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground">{ctx.name}</p>
                  {ctx.accountEnv && (
                    <Badge
                      variant="outline"
                      className={cn("text-xs px-1.5 py-0", getAccountBadgeColor(ctx.accountEnv, awsAccounts))}
                    >
                      {awsAccounts.find((a) => a.accountId === ctx.accountEnv)?.accountName ?? ctx.accountEnv}
                    </Badge>
                  )}
                  {ctx.region && (
                    <span className="text-xs text-muted-foreground">{ctx.region}</span>
                  )}
                </div>
                {ctx.clusterName && (
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">{ctx.clusterName}</p>
                )}
                <p className="text-xs font-mono text-muted-foreground/70 truncate">
                  context: {ctx.contextName}
                </p>
                {ctx.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{ctx.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => startEdit(ctx)}
                  disabled={editing !== null || deletingId === ctx.id}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      disabled={deletingId === ctx.id || editing !== null}
                    >
                      {deletingId === ctx.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />
                      }
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                      <AlertDialogDescription>
                        kubectl context "{ctx.name}"을 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(ctx.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        삭제
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
