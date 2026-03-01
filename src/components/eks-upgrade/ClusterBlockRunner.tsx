import { useState, useCallback, useEffect, useRef } from "react";
import {
  CheckSquare, Terminal, Package, Tag, FileText, GitBranch, Activity, RotateCcw,
  Check, X, ChevronDown, ChevronUp, RefreshCw, Loader2, PanelRight, Pencil, Play,
} from "lucide-react";
import LocustPanel from "@/components/eks-upgrade/LocustPanel";
import { ClusterBlockOverrideDialog } from "@/components/eks-upgrade/ClusterBlockOverrideDialog";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { updateBlockState, upsertBlockOverride, executeGitClone, fetchDeployments, executeRollout, executeRun } from "@/lib/api/eks-upgrade";
import type { Block, BlockStage, BlockType, BlockState, BlockOverride, BlockStateStatus, ClusterInstanceDetail, CheckItem, CheckOverrideParams, DeploymentListResponse, DeploymentInfo, RolloutResultResponse, RunResultResponse } from "@/types/eks-upgrade";
import { BLOCK_STAGE_META } from "@/types/eks-upgrade";

const BLOCK_ICON: Record<BlockType, React.ComponentType<{ className?: string }>> = {
  CHECK: CheckSquare,
  RUN: Terminal,
  ADDON: Package,
  VERSION: Tag,
  NOTE: FileText,
  GIT_CLONE: GitBranch,
  LOCUST: Activity,
  ROLLOUT: RotateCcw,
};

const BLOCK_COLOR: Record<BlockType, string> = {
  CHECK: "text-green-500",
  RUN: "text-blue-500",
  ADDON: "text-purple-500",
  VERSION: "text-yellow-500",
  NOTE: "text-gray-400",
  GIT_CLONE: "text-pink-500",
  LOCUST: "text-emerald-500",
  ROLLOUT: "text-cyan-500",
};

const STATE_BADGE: Record<string, { label: "완료" | "미완료"; variant: BadgeProps["variant"] }> = {
  PENDING: { label: "미완료", variant: "secondary" },
  IN_PROGRESS: { label: "미완료", variant: "default" },
  COMPLETED: { label: "완료", variant: "outline" },
};

interface Props {
  instance: ClusterInstanceDetail;
  blocks: Block[];
  onRefresh: () => void;
}

export function ClusterBlockRunner({ instance, blocks, onRefresh }: Props) {
  const { toast } = useToast();
  const [expandedBlockId, setExpandedBlockId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [cloningId, setCloningId] = useState<number | null>(null);
  const [cloneResultMap, setCloneResultMap] = useState<Record<number, { success: boolean; output: string; workspacePath: string }>>({});
  const [editorUrl, setEditorUrl] = useState<string | null>(null);
  const [editorTitle, setEditorTitle] = useState<string>("");
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const autoCloneTriggeredRef = useRef<Set<number>>(new Set());

  // CHECK 블록 낙관적 업데이트: 서버 응답 전 즉시 UI 반영
  const [localCheckedMap, setLocalCheckedMap] = useState<Record<number, string[]>>({});

  // 서버 refresh 후 로컬 상태 클리어 (instance.blockOverrides가 업데이트되면 서버 값 사용)
  useEffect(() => {
    setLocalCheckedMap({});
  }, [instance.blockOverrides]);

  // ROLLOUT state
  const [deploymentListMap, setDeploymentListMap] = useState<Record<number, DeploymentListResponse>>({});
  const [loadingDeploymentId, setLoadingDeploymentId] = useState<number | null>(null);
  const [selectedDeploymentsMap, setSelectedDeploymentsMap] = useState<Record<number, Set<string>>>({});
  const [rollingOutId, setRollingOutId] = useState<number | null>(null);
  const [rolloutResultMap, setRolloutResultMap] = useState<Record<number, RolloutResultResponse>>({});

  // RUN state
  const [runningId, setRunningId] = useState<number | null>(null);
  const [runResultMap, setRunResultMap] = useState<Record<number, RunResultResponse>>({});

  // GIT_CLONE 블록 펼칠 때 백그라운드 클론 (UI 블로킹 없이)
  useEffect(() => {
    if (expandedBlockId === null) return;
    const block = blocks.find((b) => b.id === expandedBlockId);
    if (!block || block.blockType !== "GIT_CLONE") return;
    if (autoCloneTriggeredRef.current.has(expandedBlockId)) return;
    const state = getState(expandedBlockId);
    if (state?.status === "COMPLETED") return;
    autoCloneTriggeredRef.current.add(expandedBlockId);
    handleGitClone(expandedBlockId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedBlockId]);

  const getState = useCallback(
    (blockId: number): BlockState | undefined =>
      instance.blockStates.find((s) => s.blockId === blockId),
    [instance.blockStates]
  );

  const getOverride = useCallback(
    (blockId: number): BlockOverride | undefined =>
      instance.blockOverrides.find((o) => o.blockId === blockId),
    [instance.blockOverrides]
  );

  // CHECK 블록용: 로컬 낙관적 상태 우선, 없으면 서버 override에서 읽기
  const getCheckedIds = useCallback(
    (blockId: number, override: BlockOverride | undefined): string[] => {
      if (localCheckedMap[blockId] !== undefined) return localCheckedMap[blockId];
      try {
        const op: CheckOverrideParams = override?.paramsOverride ? JSON.parse(override.paramsOverride) : {};
        return op.checkedItems ?? [];
      } catch {
        return [];
      }
    },
    [localCheckedMap]
  );

  const handleUpdateState = async (blockId: number, status: BlockStateStatus) => {
    try {
      setUpdatingId(blockId);
      await updateBlockState(instance.id, blockId, { status });
      onRefresh();
    } catch (error) {
      toast({
        title: "상태 업데이트 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleEnabled = async (blockId: number, isEnabled: boolean) => {
    const override = getOverride(blockId);
    try {
      await upsertBlockOverride(instance.id, blockId, {
        isEnabled,
        commandOverride: override?.commandOverride ?? undefined,
        paramsOverride: override?.paramsOverride ?? undefined,
      });
      onRefresh();
    } catch (error) {
      toast({
        title: "설정 변경 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
    }
  };

  // CHECK 블록: 서브항목 체크 토글 (낙관적 업데이트 + paramsOverride에 checkedItems 저장)
  const handleToggleCheckItem = async (blockId: number, itemId: string) => {
    const override = getOverride(blockId);
    const currentChecked = getCheckedIds(blockId, override);
    const newChecked = currentChecked.includes(itemId)
      ? currentChecked.filter((id) => id !== itemId)
      : [...currentChecked, itemId];

    // 즉시 UI 반영 (낙관적 업데이트)
    setLocalCheckedMap((prev) => ({ ...prev, [blockId]: newChecked }));

    try {
      await upsertBlockOverride(instance.id, blockId, {
        isEnabled: override?.isEnabled ?? true,
        commandOverride: override?.commandOverride ?? undefined,
        paramsOverride: JSON.stringify({ checkedItems: newChecked } satisfies CheckOverrideParams),
      });
      onRefresh();
    } catch (error) {
      // 실패 시 되돌리기
      setLocalCheckedMap((prev) => ({ ...prev, [blockId]: currentChecked }));
      toast({
        title: "체크 상태 저장 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
    }
  };

  const handleGitClone = async (blockId: number) => {
    try {
      setCloningId(blockId);
      const result = await executeGitClone(instance.id, blockId);
      setCloneResultMap((prev) => ({
        ...prev,
        [blockId]: { success: result.success, output: result.output, workspacePath: result.workspacePath },
      }));
      if (result.success) {
        toast({ title: `Clone 완료: ${result.targetDir}` });
        onRefresh();
      } else {
        toast({ title: "Clone 실패", description: result.errorMessage ?? "", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Clone 실패", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setCloningId(null);
    }
  };

  const handleLoadDeployments = async (blockId: number) => {
    setLoadingDeploymentId(blockId);
    try {
      const result = await fetchDeployments(instance.id);
      setDeploymentListMap((prev) => ({ ...prev, [blockId]: result }));
      // 기본 전체 선택
      const allKeys = new Set(result.deployments.map((d: DeploymentInfo) => `${d.namespace}/${d.name}`));
      setSelectedDeploymentsMap((prev) => ({ ...prev, [blockId]: allKeys }));
    } catch (e) {
      toast({ title: "Deployment 목록 조회 실패", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setLoadingDeploymentId(null);
    }
  };

  const toggleDeployment = (blockId: number, key: string) => {
    setSelectedDeploymentsMap((prev) => {
      const next = new Set(prev[blockId] ?? []);
      if (next.has(key)) next.delete(key); else next.add(key);
      return { ...prev, [blockId]: next };
    });
  };

  const toggleNamespace = (blockId: number, ns: string, deployments: DeploymentInfo[]) => {
    const keys = deployments.filter((d) => d.namespace === ns).map((d) => `${d.namespace}/${d.name}`);
    setSelectedDeploymentsMap((prev) => {
      const current = prev[blockId] ?? new Set<string>();
      const allSelected = keys.every((k) => current.has(k));
      const next = new Set(current);
      if (allSelected) keys.forEach((k) => next.delete(k));
      else keys.forEach((k) => next.add(k));
      return { ...prev, [blockId]: next };
    });
  };

  const handleRollout = async (blockId: number) => {
    const selected = selectedDeploymentsMap[blockId];
    if (!selected || selected.size === 0) {
      toast({ title: "Deployment를 선택하세요", variant: "destructive" }); return;
    }
    const selectedDeployments = [...selected].map((key) => {
      const [namespace, name] = key.split("/");
      return { namespace, name };
    });
    setRollingOutId(blockId);
    try {
      const result = await executeRollout(instance.id, blockId, { selectedDeployments });
      setRolloutResultMap((prev) => ({ ...prev, [blockId]: result }));
      if (result.success) {
        toast({ title: `Rollout 완료 (${result.results.length}개)` });
        onRefresh();
      } else {
        const failCount = result.results.filter((r) => !r.success).length;
        toast({ title: `Rollout 부분 실패 (${failCount}개 실패)`, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Rollout 실패", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setRollingOutId(null);
    }
  };

  const handleRun = async (blockId: number) => {
    setRunningId(blockId);
    try {
      const result = await executeRun(instance.id, blockId);
      setRunResultMap((prev) => ({ ...prev, [blockId]: result }));
      if (result.success) {
        toast({ title: "명령 실행 완료" });
        onRefresh();
      } else {
        toast({ title: "명령 실행 실패", description: result.errorMessage ?? "", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "실행 실패", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setRunningId(null);
    }
  };

  const openEditor = (url: string, title: string) => {
    setEditorUrl(url);
    setEditorTitle(title);
  };

  const resolvedBlocks = [...blocks]
    .sort((a, b) => {
      const stageDiff = (BLOCK_STAGE_META[a.blockStage as BlockStage]?.order ?? 0) - (BLOCK_STAGE_META[b.blockStage as BlockStage]?.order ?? 0);
      return stageDiff !== 0 ? stageDiff : a.sortOrder - b.sortOrder;
    })
    .map((block) => {
      const override = getOverride(block.id);
      return { block, override, isEnabled: override ? override.isEnabled : true };
    });

  const blockList = (
    <div className="space-y-2 pt-3">
      {resolvedBlocks.map(({ block, override, isEnabled }, idx) => {
        const Icon = BLOCK_ICON[block.blockType];
        const state = getState(block.id);
        const isExpanded = expandedBlockId === block.id;
        const isUpdating = updatingId === block.id;
        const stateInfo = state?.status === "COMPLETED" ? STATE_BADGE.COMPLETED : STATE_BADGE.PENDING;

        // 스테이지 헤더: 이전 블록과 스테이지가 다를 때 표시
        const prevBlock = resolvedBlocks[idx - 1]?.block;
        const showStageHeader = !prevBlock || prevBlock.blockStage !== block.blockStage;

        // GIT_CLONE 관련 변수
        let gitParams: { repoUrl: string; branch?: string; targetDir?: string } | null = null;
        let gitEditorUrl = "";
        let isCloningNow = false;
        let cloneResult: { success: boolean; output: string; workspacePath: string } | undefined;
        let gitTargetDir = "";

        if (block.blockType === "GIT_CLONE" && block.params) {
          try {
            gitParams = JSON.parse(block.params);
            gitTargetDir = gitParams!.targetDir || gitParams!.repoUrl.split("/").pop()?.replace(".git", "") || "";
            gitEditorUrl = `/code-server/?folder=/home/coder/project/${gitTargetDir}`;
            cloneResult = cloneResultMap[block.id];
            isCloningNow = cloningId === block.id;
          } catch {
            gitParams = null;
          }
        }

        // 명령어 섹션: block.command 또는 오버라이드가 있는 경우에만 표시
        const showCommand = (block.command != null || override?.commandOverride != null)
          && !["ADDON", "LOCUST", "GIT_CLONE", "NOTE", "ROLLOUT"].includes(block.blockType);

        return (
          <div key={block.id}>
            {/* 스테이지 구분 헤더 */}
            {showStageHeader && (
              <div className={`flex items-center gap-3 ${idx > 0 ? "mt-7 pt-1" : ""} mb-3`}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-sm font-semibold text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
                  {BLOCK_STAGE_META[block.blockStage as BlockStage]?.label ?? block.blockStage}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-border via-border/70 to-transparent" />
              </div>
            )}

          <div
            className={`rounded-lg border transition-colors ${
              !isEnabled ? "opacity-50 bg-muted/30" : "bg-card"
            } ${state?.status === "COMPLETED" ? "border-green-500/30" : "border-border"}`}
          >
            {/* 헤더 */}
            <div
              className="flex items-center gap-3 p-3.5 cursor-pointer"
              onClick={() => setExpandedBlockId(isExpanded ? null : block.id)}
            >
              {state?.status === "COMPLETED" ? (
                <Check className="h-5 w-5 text-green-500 shrink-0" />
              ) : (
                <Icon className={`h-5 w-5 shrink-0 ${BLOCK_COLOR[block.blockType]}`} />
              )}

              <span className="text-base font-medium flex-1 text-foreground">{block.title}</span>
              {(override?.commandOverride != null || override?.paramsOverride != null) && (
                <span className="shrink-0 inline-flex items-center rounded-sm border border-orange-400/40 bg-orange-500/10 px-1.5 py-0.5 text-xs font-semibold text-orange-500 leading-none">
                  오버라이드
                </span>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-sm shrink-0"
                onClick={(e) => { e.stopPropagation(); handleToggleEnabled(block.id, !isEnabled); }}
              >
                {isEnabled ? "비활성화" : "활성화"}
              </Button>

              <Badge variant={stateInfo.variant} className="text-sm shrink-0">
                {stateInfo.label}
              </Badge>

              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={(e) => { e.stopPropagation(); setEditingBlock(block); }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>

            {/* 펼친 내용 */}
            {isExpanded && (
              <div className={`border-t border-border/50 p-4 space-y-4 ${!isEnabled ? "opacity-50 pointer-events-none" : ""}`}>

                {/* 설명 */}
                {block.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1.5">설명</p>
                    <p className="text-base">{block.description}</p>
                  </div>
                )}

                {/* CHECK: 서브항목 체크리스트 */}
                {block.blockType === "CHECK" && (() => {
                  let checkItems: CheckItem[] = [];
                  try {
                    const p = block.params ? JSON.parse(block.params) : null;
                    if (p?.items && Array.isArray(p.items)) checkItems = p.items;
                  } catch { /* ignore */ }

                  const checkedIds = getCheckedIds(block.id, override);

                  if (checkItems.length === 0) return (
                    <p className="text-xs text-muted-foreground">확인 항목이 없습니다. 블록을 편집하여 항목을 추가하세요.</p>
                  );

                  const allChecked = checkItems.every((item) => checkedIds.includes(item.id));

                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">확인 항목 ({checkedIds.length}/{checkItems.length})</p>
                        {allChecked && (
                          <span className="text-sm text-green-600 dark:text-green-400 font-medium">모두 완료 ✓</span>
                        )}
                      </div>
                      <div className="rounded border border-border/50 overflow-hidden">
                        {checkItems.map((item, i) => {
                          const isChecked = checkedIds.includes(item.id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                                i > 0 ? "border-t border-border/30" : ""
                              } ${isChecked ? "bg-green-500/5" : ""}`}
                              onClick={() => handleToggleCheckItem(block.id, item.id)}
                            >
                              <div className={`h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                                isChecked
                                  ? "bg-green-500 border-green-500"
                                  : "border-border bg-background"
                              }`}>
                                {isChecked && <Check className="h-3 w-3 text-white" />}
                              </div>
                              <span className={`text-base flex-1 ${isChecked ? "line-through text-muted-foreground" : ""}`}>
                                {item.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* GIT_CLONE: 저장소 정보 (버튼은 항상 표시, 클론은 백그라운드) */}
                {block.blockType === "GIT_CLONE" && gitParams && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">저장소</p>
                    <div className="text-xs bg-muted rounded p-2.5 font-mono space-y-1">
                      <div><span className="text-muted-foreground">repo: </span>{gitParams.repoUrl}</div>
                      {gitParams.branch && <div><span className="text-muted-foreground">branch: </span>{gitParams.branch}</div>}
                      <div><span className="text-muted-foreground">dir: </span>/home/coder/project/{gitTargetDir}</div>
                    </div>
                    {isCloningNow && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        클론 중...
                      </div>
                    )}
                    {cloneResult && (
                      <pre
                        className={`text-xs rounded p-2 whitespace-pre-wrap overflow-auto ${
                          cloneResult.success
                            ? "bg-green-500/10 text-green-700 dark:text-green-400"
                            : "bg-destructive/10 text-destructive"
                        }`}
                        style={{ resize: "vertical", minHeight: "5rem", height: "10rem" }}
                      >
                        {cloneResult.output || (cloneResult.success ? "완료" : "실패")}
                      </pre>
                    )}
                  </div>
                )}

                {/* ADDON */}
                {block.blockType === "ADDON" && block.params && (() => {
                  try {
                    const items = JSON.parse(block.params) as { name: string; currentVersion: string; targetVersion: string }[];
                    return (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">애드온 목록</p>
                        <div className="rounded border border-border/50 overflow-hidden text-xs">
                          <div className="grid grid-cols-3 bg-muted/50 px-3 py-1.5 font-medium text-muted-foreground">
                            <span>이름</span><span>현재</span><span>목표</span>
                          </div>
                          {items.map((item, i) => (
                            <div key={i} className="grid grid-cols-3 px-3 py-1.5 border-t border-border/30">
                              <span className="font-medium">{item.name}</span>
                              <span className="font-mono text-muted-foreground">{item.currentVersion}</span>
                              <span className="font-mono text-primary">{item.targetVersion}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  } catch { return null; }
                })()}

                {/* LOCUST */}
                {block.blockType === "LOCUST" && block.params && (() => {
                  try {
                    const p = JSON.parse(block.params) as { gatewayUrl: string; workerCount?: number };
                    return (
                      <LocustPanel
                        clusterInstanceId={instance.id}
                        defaultGatewayUrl={p.gatewayUrl}
                        defaultWorkerCount={p.workerCount ?? 5}
                      />
                    );
                  } catch { return null; }
                })()}

                {/* 명령어 (block.command가 있거나 클러스터 오버라이드 설정된 경우만 표시) */}
                {showCommand && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm text-muted-foreground">명령어</p>
                      {override?.commandOverride != null && (
                        <span className="text-sm text-amber-500">클러스터 오버라이드 적용됨</span>
                      )}
                    </div>
                    <pre className={`text-sm rounded p-3 overflow-x-auto whitespace-pre-wrap ${
                      override?.commandOverride != null
                        ? "bg-amber-500/5 border border-amber-500/20"
                        : "bg-muted"
                    }`}>
                      {override?.commandOverride ?? block.command}
                    </pre>
                  </div>
                )}

                {/* VERSION: 현재/목표 버전 */}
                {block.blockType === "VERSION" && block.params && (() => {
                  try {
                    const p = JSON.parse(block.params) as { current: string; target: string };
                    return (
                      <div className="rounded border border-border/50 overflow-hidden text-xs">
                        <div className="grid grid-cols-2 bg-muted/50 px-3 py-1.5 font-medium text-muted-foreground">
                          <span>현재 버전</span><span>목표 버전</span>
                        </div>
                        <div className="grid grid-cols-2 px-3 py-1.5 border-t border-border/30">
                          <span className="font-mono text-muted-foreground">{p.current}</span>
                          <span className="font-mono text-primary">{p.target}</span>
                        </div>
                      </div>
                    );
                  } catch { return null; }
                })()}

                {/* ROLLOUT: deployment 목록 + 선택 + 실행 */}
                {block.blockType === "ROLLOUT" && (() => {
                  const depList = deploymentListMap[block.id];
                  const selectedSet = selectedDeploymentsMap[block.id] ?? new Set<string>();
                  const isLoading = loadingDeploymentId === block.id;
                  const isRolling = rollingOutId === block.id;
                  const rolloutResult = rolloutResultMap[block.id];

                  if (!depList) {
                    return (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          이 클러스터의 Deployment 목록을 불러와 rollout할 대상을 선택하세요.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={isLoading}
                          onClick={() => handleLoadDeployments(block.id)}
                        >
                          {isLoading
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <RefreshCw className="h-3.5 w-3.5" />}
                          Deployment 불러오기
                        </Button>
                      </div>
                    );
                  }

                  // 네임스페이스별 그룹
                  const namespaces = [...new Set(depList.deployments.map((d) => d.namespace))].sort();
                  const totalCount = depList.deployments.length;
                  const selectedCount = selectedSet.size;

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {selectedCount}/{totalCount}개 선택 (컨텍스트: {depList.kubectlContext ?? "없음"})
                        </p>
                        <div className="flex gap-1">
                          <Button
                            size="sm" variant="ghost" className="h-6 px-2 text-xs"
                            onClick={() => setSelectedDeploymentsMap((prev) => ({
                              ...prev,
                              [block.id]: new Set(depList.deployments.map((d) => `${d.namespace}/${d.name}`)),
                            }))}
                          >전체선택</Button>
                          <Button
                            size="sm" variant="ghost" className="h-6 px-2 text-xs"
                            onClick={() => setSelectedDeploymentsMap((prev) => ({ ...prev, [block.id]: new Set() }))}
                          >전체해제</Button>
                          <Button
                            size="sm" variant="ghost" className="h-6 px-2 text-xs"
                            disabled={isLoading}
                            onClick={() => handleLoadDeployments(block.id)}
                          >
                            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
                          </Button>
                        </div>
                      </div>

                      <div className="rounded border border-border/50 overflow-hidden max-h-64 overflow-y-auto text-xs">
                        {namespaces.map((ns) => {
                          const nsDeployments = depList.deployments.filter((d) => d.namespace === ns);
                          const nsKeys = nsDeployments.map((d) => `${d.namespace}/${d.name}`);
                          const allNsSelected = nsKeys.every((k) => selectedSet.has(k));
                          const someNsSelected = nsKeys.some((k) => selectedSet.has(k));
                          return (
                            <div key={ns}>
                              {/* 네임스페이스 헤더 */}
                              <button
                                type="button"
                                className={`w-full flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-b border-border/30 font-medium text-left hover:bg-muted/70 transition-colors`}
                                onClick={() => toggleNamespace(block.id, ns, depList.deployments)}
                              >
                                <div className={`h-3.5 w-3.5 shrink-0 rounded border-2 flex items-center justify-center ${
                                  allNsSelected ? "bg-primary border-primary" : someNsSelected ? "bg-primary/40 border-primary/40" : "border-border bg-background"
                                }`}>
                                  {(allNsSelected || someNsSelected) && <Check className="h-2.5 w-2.5 text-white" />}
                                </div>
                                <span className="text-primary">{ns}</span>
                                <span className="text-muted-foreground ml-auto">{nsKeys.filter((k) => selectedSet.has(k)).length}/{nsDeployments.length}</span>
                              </button>
                              {/* 개별 deployment */}
                              {nsDeployments.map((dep) => {
                                const key = `${dep.namespace}/${dep.name}`;
                                const isChecked = selectedSet.has(key);
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    className={`w-full flex items-center gap-2 px-3 py-1.5 pl-8 border-b border-border/20 text-left hover:bg-muted/50 transition-colors ${isChecked ? "bg-primary/5" : ""}`}
                                    onClick={() => toggleDeployment(block.id, key)}
                                  >
                                    <div className={`h-3.5 w-3.5 shrink-0 rounded border-2 flex items-center justify-center ${isChecked ? "bg-primary border-primary" : "border-border bg-background"}`}>
                                      {isChecked && <Check className="h-2.5 w-2.5 text-white" />}
                                    </div>
                                    <span className="font-mono">{dep.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>

                      {/* rollout 결과 */}
                      {rolloutResult && (
                        <div className={`rounded p-2 text-xs space-y-1 ${rolloutResult.success ? "bg-green-500/10" : "bg-destructive/10"}`}>
                          <p className={`font-medium ${rolloutResult.success ? "text-green-700 dark:text-green-400" : "text-destructive"}`}>
                            {rolloutResult.success ? "✓ Rollout 완료" : "✗ 일부 실패"}
                          </p>
                          {rolloutResult.results.map((r, i) => (
                            <div key={i} className={`flex items-center gap-1.5 ${r.success ? "text-green-700 dark:text-green-400" : "text-destructive"}`}>
                              {r.success ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0" />}
                              <span className="font-mono">{r.namespace}/{r.name}</span>
                              {r.errorMessage && <span className="text-muted-foreground">– {r.errorMessage}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* RUN: 실행 결과 */}
                {block.blockType === "RUN" && (() => {
                  const runResult = runResultMap[block.id];
                  if (!runResult) return null;
                  return (
                    <pre
                      className={`text-xs rounded p-2 whitespace-pre-wrap overflow-auto ${
                        runResult.success
                          ? "bg-green-500/10 text-green-700 dark:text-green-400"
                          : "bg-destructive/10 text-destructive"
                      }`}
                      style={{ resize: "vertical", minHeight: "5rem", height: "10rem" }}
                    >
                      {runResult.output || (runResult.success ? "완료" : runResult.errorMessage)}
                    </pre>
                  );
                })()}

                {/* 하단 액션 바 */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    {/* GIT_CLONE: 에디터/Pull 버튼 항상 표시 */}
                    {block.blockType === "GIT_CLONE" && gitParams && (
                      <>
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => openEditor(gitEditorUrl, gitTargetDir)}
                        >
                          <PanelRight className="h-4 w-4" />
                          에디터 열기
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={isCloningNow}
                          onClick={() => {
                            autoCloneTriggeredRef.current.add(block.id);
                            handleGitClone(block.id);
                          }}
                        >
                          <RefreshCw className={`h-4 w-4 ${isCloningNow ? "animate-spin" : ""}`} />
                          Pull
                        </Button>
                      </>
                    )}

                    {/* RUN: 명령 실행 버튼 */}
                    {block.blockType === "RUN" && (block.command != null || getOverride(block.id)?.commandOverride != null) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={runningId === block.id}
                        onClick={() => handleRun(block.id)}
                      >
                        {runningId === block.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Play className="h-4 w-4" />}
                        실행
                      </Button>
                    )}

                    {/* ROLLOUT: rollout 실행 버튼 */}
                    {block.blockType === "ROLLOUT" && deploymentListMap[block.id] && (
                      <Button
                        size="sm"
                        className="gap-1.5"
                        disabled={rollingOutId === block.id || (selectedDeploymentsMap[block.id]?.size ?? 0) === 0}
                        onClick={() => handleRollout(block.id)}
                      >
                        {rollingOutId === block.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <RotateCcw className="h-4 w-4" />}
                        Rollout 시작 ({selectedDeploymentsMap[block.id]?.size ?? 0}개)
                      </Button>
                    )}
                  </div>

                  {/* 완료 / 완료 취소 */}
                  {(() => {
                    // CHECK 블록: 모든 항목이 체크되어야 완료 버튼 활성화
                    let isAllChecked = true;
                    if (block.blockType === "CHECK" && block.params) {
                      try {
                        const p = JSON.parse(block.params) as { items: CheckItem[] };
                        const checkedIds = getCheckedIds(block.id, override);
                        isAllChecked = p.items?.length > 0 && p.items.every((item) => checkedIds.includes(item.id));
                      } catch { isAllChecked = false; }
                    }

                    return (
                      <div className="flex items-center gap-2">
                        {state?.status === "COMPLETED" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUpdateState(block.id, "PENDING")}
                          >
                            완료 취소 (되돌리기)
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="gap-1.5"
                            disabled={isUpdating || !isAllChecked}
                            title={block.blockType === "CHECK" && !isAllChecked ? "모든 항목을 체크해야 완료할 수 있습니다" : undefined}
                            onClick={() => handleUpdateState(block.id, "COMPLETED")}
                          >
                            <Check className="h-4 w-4" />
                            완료
                          </Button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
          </div>
        );
      })}

      {/* 클러스터 오버라이드 적용 요약 */}
      {(() => {
        const overriddenBlocks = blocks.filter((b) => {
          const o = instance.blockOverrides.find((ov) => ov.blockId === b.id);
          // CHECK 블록의 paramsOverride는 체크 상태 저장용이므로 오버라이드 요약에서 제외
          const hasParamsOverride = b.blockType !== "CHECK" && o?.paramsOverride != null;
          return o?.commandOverride != null || hasParamsOverride;
        });
        if (overriddenBlocks.length === 0) return null;
        return (
          <div className="mt-6 px-3 py-3 rounded-md bg-amber-500/5 border border-amber-500/20">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
              클러스터 오버라이드 적용됨 ({overriddenBlocks.length}개 블록)
            </p>
            <ul className="space-y-1">
              {overriddenBlocks.map((b) => (
                <li key={b.id} className="flex items-center gap-1.5 text-sm text-amber-600/80 dark:text-amber-400/80">
                  <span className="h-1 w-1 rounded-full bg-amber-500 shrink-0" />
                  {b.title}
                </li>
              ))}
            </ul>
          </div>
        );
      })()}
    </div>
  );

  // split view 모드
  if (editorUrl) {
    return (
      <>
        <div className="flex gap-3 pt-3" style={{ height: "calc(100vh - 160px)" }}>
          <div className="w-[420px] shrink-0 overflow-y-auto">{blockList}</div>
          <div className="flex-1 flex flex-col min-w-0 rounded-lg border overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/50 shrink-0">
              <span className="text-xs text-muted-foreground font-mono truncate">{editorTitle}</span>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1 shrink-0" onClick={() => setEditorUrl(null)}>
                <X className="h-3.5 w-3.5" />
                닫기
              </Button>
            </div>
            <iframe src={editorUrl} className="flex-1 w-full" title="code-server" allow="clipboard-read; clipboard-write" />
          </div>
        </div>
        {editingBlock && (
          <ClusterBlockOverrideDialog
            instanceId={instance.id}
            block={editingBlock}
            override={getOverride(editingBlock.id)}
            open={!!editingBlock}
            onOpenChange={(open) => { if (!open) setEditingBlock(null); }}
            onRefresh={onRefresh}
          />
        )}
      </>
    );
  }

  return (
    <>
      {blockList}
      {editingBlock && (
        <ClusterBlockOverrideDialog
          instanceId={instance.id}
          block={editingBlock}
          override={getOverride(editingBlock.id)}
          open={!!editingBlock}
          onOpenChange={(open) => { if (!open) setEditingBlock(null); }}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
}
