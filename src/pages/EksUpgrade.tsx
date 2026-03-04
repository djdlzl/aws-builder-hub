import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Loader2, AlertCircle, Zap, Server, ChevronRight, ChevronDown, MoreVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { fetchCampaigns, fetchCampaign, createCampaign, createClusterInstance, deleteCampaign, updateCampaign, fetchVerifiedAwsAccounts, reorderClusterInstances } from "@/lib/api/eks-upgrade";
import type { CampaignSummary, CampaignDetail, CreateClusterInstanceRequest, ClusterInstanceSummary, UpdateCampaignRequest } from "@/types/eks-upgrade";
import { CreateCampaignDialog } from "@/components/eks-upgrade/CreateCampaignDialog";
import { CampaignDetailPanel } from "@/components/eks-upgrade/CampaignDetailPanel";
import { ClusterDetailPanel } from "@/components/eks-upgrade/ClusterDetailPanel";
import { AddClusterDialog } from "@/components/eks-upgrade/AddClusterDialog";
import { KubectlContextSettings } from "@/components/eks-upgrade/KubectlContextSettings";
import { BlockTemplateTab } from "@/components/eks-upgrade/BlockTemplateTab";
import { cn } from "@/lib/utils";

const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  DRAFT: "초안",
  ACTIVE: "진행 중",
  COMPLETED: "완료",
  CANCELLED: "취소",
};

const CAMPAIGN_STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  DRAFT: "secondary",
  ACTIVE: "default",
  COMPLETED: "outline",
  CANCELLED: "destructive",
};

export default function EksUpgrade() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"campaigns" | "blocks" | "settings">("campaigns");
  const createTemplateRef = useRef<(() => void) | null>(null);
  const createContextRef = useRef<(() => void) | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [accountNameMap, setAccountNameMap] = useState<Record<string, string>>({});
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(null);
  const [campaignDetail, setCampaignDetail] = useState<CampaignDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addClusterOpen, setAddClusterOpen] = useState(false);
  const [draggingClusterId, setDraggingClusterId] = useState<number | null>(null);
  const [insertBeforeClusterId, setInsertBeforeClusterId] = useState<number | "end" | null>(null);
  const [blocksRefreshToken, setBlocksRefreshToken] = useState(0);
  const [campaignToEdit, setCampaignToEdit] = useState<CampaignSummary | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSourceVersion, setEditSourceVersion] = useState("");
  const [editTargetVersion, setEditTargetVersion] = useState("");
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<CampaignSummary | null>(null);

  const loadCampaigns = useCallback(async () => {
    try {
      setIsLoading(true);
      const list = await fetchCampaigns();
      setCampaigns(list);
      if (list.length > 0) {
        setSelectedCampaignId((prev) => prev ?? list[0].id);
      }
    } catch (error) {
      toast({
        title: "불러오기 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const loadCampaignDetail = useCallback(async (id: number, showLoader = true) => {
    try {
      if (showLoader) setIsDetailLoading(true);
      const detail = await fetchCampaign(id);
      setCampaignDetail(detail);
    } catch (error) {
      toast({
        title: "캠페인 상세 로드 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
    } finally {
      if (showLoader) setIsDetailLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    fetchVerifiedAwsAccounts()
      .then((accounts) => {
        const map: Record<string, string> = {};
        accounts.forEach((a) => { map[a.accountId] = a.accountName; });
        setAccountNameMap(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedCampaignId === null) {
      setCampaignDetail(null);
      return;
    }
    loadCampaignDetail(selectedCampaignId);
  }, [selectedCampaignId, loadCampaignDetail]);

  const handleToggleCampaign = (campaignId: number) => {
    if (selectedCampaignId === campaignId) {
      setSelectedCampaignId(null);
      setSelectedClusterId(null);
      return;
    }
    setSelectedCampaignId(campaignId);
    setSelectedClusterId(null);
  };

  const handleTabChange = (value: string) => {
    const tab = value as typeof activeTab;
    setActiveTab(tab);

    if (tab === "campaigns") {
      loadCampaigns();
      if (selectedCampaignId) {
        loadCampaignDetail(selectedCampaignId, false);
      }
      return;
    }

    if (tab === "blocks") {
      setBlocksRefreshToken((prev) => prev + 1);
    }
  };

  const currentTabAction =
    activeTab === "campaigns"
      ? {
          label: "새 캠페인",
          onClick: () => setCreateDialogOpen(true),
        }
      : activeTab === "blocks"
        ? {
            label: "새 블록 템플릿",
            onClick: () => createTemplateRef.current?.(),
          }
        : {
            label: "클러스터 등록",
            onClick: () => createContextRef.current?.(),
          };

  const handleSelectCluster = (clusterId: number) => {
    setSelectedClusterId((prev) => (prev === clusterId ? null : clusterId));
  };

  const handleClusterDragStart = (e: React.DragEvent, clusterId: number) => {
    setDraggingClusterId(clusterId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleClusterDragOver = (e: React.DragEvent, clusterId: number, clusterList: ClusterInstanceSummary[]) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    if (e.clientY < midY) {
      setInsertBeforeClusterId(clusterId);
    } else {
      const idx = clusterList.findIndex((c) => c.id === clusterId);
      const next = clusterList[idx + 1];
      setInsertBeforeClusterId(next ? next.id : "end");
    }
  };

  const handleClusterDrop = async (e: React.DragEvent, campaignId: number, clusterList: ClusterInstanceSummary[]) => {
    e.preventDefault();
    if (draggingClusterId === null || insertBeforeClusterId === null) return;
    const fromIdx = clusterList.findIndex((c) => c.id === draggingClusterId);
    const newOrder = [...clusterList];
    const [moved] = newOrder.splice(fromIdx, 1);
    const toIdx =
      insertBeforeClusterId === "end"
        ? newOrder.length
        : newOrder.findIndex((c) => c.id === insertBeforeClusterId);
    newOrder.splice(toIdx < 0 ? newOrder.length : toIdx, 0, moved);
    setDraggingClusterId(null);
    setInsertBeforeClusterId(null);
    try {
      await reorderClusterInstances(campaignId, newOrder.map((c) => c.id));
      if (selectedCampaignId) loadCampaignDetail(selectedCampaignId, false);
    } catch {
      toast({ title: "순서 변경 실패", variant: "destructive" });
    }
  };

  const handleClusterDragEnd = () => {
    setDraggingClusterId(null);
    setInsertBeforeClusterId(null);
  };

  const handleCreateCampaign = useCallback(
    async (values: { name: string; description?: string; sourceVersion: string; targetVersion: string; blockTemplateId?: number }) => {
      try {
        const created = await createCampaign(values);
        toast({ title: "캠페인 생성 완료" });
        await loadCampaigns();
        setSelectedCampaignId(created.id);
        setSelectedClusterId(null);
      } catch (error) {
        toast({
          title: "캠페인 생성 실패",
          description: error instanceof Error ? error.message : "알 수 없는 오류",
          variant: "destructive",
        });
        throw error;
      }
    },
    [loadCampaigns, toast]
  );

  const handleDeleteCampaign = useCallback(
    async (campaignId: number) => {
      try {
        await deleteCampaign(campaignId);
        toast({ title: "캠페인 삭제 완료" });
        if (selectedCampaignId === campaignId) {
          setSelectedCampaignId(null);
          setSelectedClusterId(null);
        }
        await loadCampaigns();
      } catch (error) {
        toast({
          title: "캠페인 삭제 실패",
          description: error instanceof Error ? error.message : "알 수 없는 오류",
          variant: "destructive",
        });
      }
    },
    [selectedCampaignId, loadCampaigns, toast]
  );

  const handleStartEditCampaign = (campaign: CampaignSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setCampaignToEdit(campaign);
    setEditName(campaign.name);
    setEditDescription(campaign.description ?? "");
    setEditSourceVersion(campaign.sourceVersion);
    setEditTargetVersion(campaign.targetVersion);
  };

  const handleSaveEditCampaign = async () => {
    if (!campaignToEdit || !editName.trim()) return;
    setIsEditSaving(true);
    try {
      await updateCampaign(campaignToEdit.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        sourceVersion: editSourceVersion.trim(),
        targetVersion: editTargetVersion.trim(),
      } as UpdateCampaignRequest);
      toast({ title: "캠페인 수정 완료" });
      setCampaignToEdit(null);
      loadCampaigns();
      if (selectedCampaignId === campaignToEdit.id) {
        loadCampaignDetail(campaignToEdit.id, false);
      }
    } catch (error) {
      toast({
        title: "캠페인 수정 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
    } finally {
      setIsEditSaving(false);
    }
  };

  const handleAddCluster = useCallback(
    async (request: CreateClusterInstanceRequest) => {
      try {
        await createClusterInstance(selectedCampaignId!, request);
        toast({ title: "클러스터 추가 완료" });
        if (selectedCampaignId) loadCampaignDetail(selectedCampaignId, false);
      } catch (error) {
        toast({
          title: "클러스터 추가 실패",
          description: error instanceof Error ? error.message : "알 수 없는 오류",
          variant: "destructive",
        });
        throw error;
      }
    },
    [selectedCampaignId, loadCampaignDetail, toast]
  );

  const selectedCluster = campaignDetail?.clusterInstances.find((c) => c.id === selectedClusterId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            EKS 업그레이드
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            클러스터 업그레이드 캠페인을 관리하고 블록 단위로 작업을 실행합니다.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="campaigns">캠페인</TabsTrigger>
            <TabsTrigger value="blocks">블록</TabsTrigger>
            <TabsTrigger value="settings">설정</TabsTrigger>
          </TabsList>

          <Button
            onClick={currentTabAction.onClick}
            className="h-[31px] min-w-[170px] gap-2 px-3 justify-center items-center text-center leading-none"
          >
            <Plus className="h-4 w-4" />
            {currentTabAction.label}
          </Button>
        </div>

        <TabsContent value="campaigns" className="mt-4">
          <div className="mx-auto max-w-4xl flex flex-col gap-6 xl:max-w-none xl:grid xl:grid-cols-[300px_minmax(0,56rem)_300px] xl:gap-6 xl:justify-center">
            {/* 왼쪽: 캠페인 + 클러스터 사이드바 */}
            <Card className="h-fit w-full xl:w-[300px] xl:shrink-0 xl:col-start-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  캠페인 목록
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">캠페인이 없습니다</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setCreateDialogOpen(true)}
                    >
                      첫 캠페인 만들기
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[calc(100vh-320px)]">
                    <div className="p-2 space-y-1">
                      {campaigns.map((campaign) => {
                        const isSelected = selectedCampaignId === campaign.id;
                        const clusters = isSelected && campaignDetail ? campaignDetail.clusterInstances : [];

                        return (
                          <div key={campaign.id} className="group">
                            {/* 캠페인 아이템 */}
                            <div className="relative">
                              <div
                                className={cn(
                                  "w-full text-left rounded-lg p-3 transition-all hover:bg-accent pr-10 cursor-pointer",
                                  isSelected
                                    ? "bg-primary/5 border border-primary/30 shadow-sm"
                                    : "border border-transparent"
                                )}
                                onClick={() => {
                                  if (!isSelected) setSelectedCampaignId(campaign.id);
                                  setSelectedClusterId(null);
                                }}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 shrink-0"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleToggleCampaign(campaign.id);
                                      }}
                                    >
                                      {isSelected ? (
                                        <ChevronDown className="h-3.5 w-3.5 text-primary" />
                                      ) : (
                                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                      )}
                                    </Button>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">{campaign.name}</p>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        v{campaign.sourceVersion} → v{campaign.targetVersion}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge variant={CAMPAIGN_STATUS_VARIANT[campaign.status]} className="text-xs shrink-0">
                                    {CAMPAIGN_STATUS_LABEL[campaign.status] ?? campaign.status}
                                  </Badge>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-1/2 right-1 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-36">
                                  <DropdownMenuItem onClick={(e) => handleStartEditCampaign(campaign, e)}>
                                    편집
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCampaignToDelete(campaign);
                                    }}
                                  >
                                    삭제
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* 클러스터 서브 메뉴 */}
                            {isSelected && (
                              <div className="ml-4 mt-1 mb-1 space-y-0.5 border-l border-border/50 pl-2">
                                {isDetailLoading ? (
                                  <div className="flex items-center gap-2 px-2 py-2">
                                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">로딩 중...</span>
                                  </div>
                                ) : clusters.length === 0 ? (
                                  <button
                                    onClick={() => setAddClusterOpen(true)}
                                    className="w-full text-left px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded transition-colors flex items-center gap-1.5"
                                  >
                                    <Plus className="h-3 w-3" />
                                    클러스터 추가
                                  </button>
                                ) : (
                                  <div
                                    onDrop={(e) => handleClusterDrop(e, campaign.id, clusters)}
                                    onDragOver={(e) => e.preventDefault()}
                                  >
                                    {clusters.map((cluster) => {
                                      const isClusterSelected = selectedClusterId === cluster.id;
                                      const total = campaignDetail?.blocks.length || cluster.totalBlockCount;
                                      const completed = cluster.completedBlockCount;
                                      const clusterProgress = total > 0 ? Math.round((completed / total) * 100) : 0;
                                      const isClusterDone = total > 0 && completed >= total;

                                      return (
                                        <div key={cluster.id}>
                                          {draggingClusterId !== null && insertBeforeClusterId === cluster.id && (
                                            <div className="h-0.5 bg-primary rounded-full mx-1 my-0.5" />
                                          )}
                                          <button
                                            draggable
                                            onDragStart={(e) => handleClusterDragStart(e, cluster.id)}
                                            onDragOver={(e) => handleClusterDragOver(e, cluster.id, clusters)}
                                            onDragEnd={handleClusterDragEnd}
                                            onClick={() => handleSelectCluster(cluster.id)}
                                            className={cn(
                                              "w-full text-left rounded-md px-2 py-2 transition-all",
                                              draggingClusterId === cluster.id ? "opacity-40" : "",
                                              isClusterSelected
                                                ? "bg-primary/10 border border-primary/20"
                                                : "hover:bg-accent border border-transparent"
                                            )}
                                          >
                                            <div className="flex items-center gap-1.5 min-w-0 mb-1">
                                              <Server className={`h-3 w-3 shrink-0 ${isClusterDone ? "text-green-500" : isClusterSelected ? "text-primary" : "text-muted-foreground"}`} />
                                              <span className={`text-xs font-medium truncate ${isClusterSelected ? "text-primary" : "text-foreground"}`}>
                                                {cluster.clusterName}
                                              </span>
                                              <Badge variant="outline" className="text-xs px-1 py-0 h-4 shrink-0">
                                                {accountNameMap[cluster.environment] ?? cluster.environment}
                                              </Badge>
                                            </div>
                                            {total > 0 && (
                                              <div className="flex items-center gap-1.5 pl-4">
                                                <Progress
                                                  value={clusterProgress}
                                                  className={`flex-1 h-1 ${isClusterDone ? "[&>div]:bg-green-500" : ""}`}
                                                />
                                                <span className={`text-xs shrink-0 ${isClusterDone ? "text-green-500" : "text-muted-foreground"}`}>
                                                  {completed}/{total}
                                                </span>
                                              </div>
                                            )}
                                          </button>
                                        </div>
                                      );
                                    })}
                                    {draggingClusterId !== null && insertBeforeClusterId === "end" && (
                                      <div className="h-0.5 bg-primary rounded-full mx-1 my-0.5" />
                                    )}
                                    <button
                                      onClick={() => setAddClusterOpen(true)}
                                      className="w-full text-left px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded transition-colors flex items-center gap-1.5 mt-0.5"
                                    >
                                      <Plus className="h-3 w-3" />
                                      클러스터 추가
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* 오른쪽: 메인 패널 */}
            <div className="w-full min-w-0 max-w-4xl mx-auto xl:mx-0 xl:col-start-2">
              {selectedCluster && campaignDetail ? (
                /* 클러스터 선택 시: 작업 목록 */
                <ClusterDetailPanel
                  key={selectedCluster.id}
                  instance={selectedCluster}
                  blocks={campaignDetail.blocks}
                  sourceVersion={campaignDetail.sourceVersion}
                  targetVersion={campaignDetail.targetVersion}
                  accountNameMap={accountNameMap}
                  onRefresh={() => selectedCampaignId && loadCampaignDetail(selectedCampaignId, false)}
                  onDeleted={() => {
                    setSelectedClusterId(null);
                    if (selectedCampaignId) {
                      loadCampaignDetail(selectedCampaignId, false);
                    }
                  }}
                />
              ) : isDetailLoading ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </CardContent>
                </Card>
              ) : campaignDetail ? (
                /* 캠페인 선택 시: 블록 관리 */
                <CampaignDetailPanel
                  campaign={campaignDetail}
                  onRefresh={() => selectedCampaignId && loadCampaignDetail(selectedCampaignId, false)}
                  onDelete={() => { setSelectedCampaignId(null); setSelectedClusterId(null); loadCampaigns(); }}
                />
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <Zap className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">캠페인을 선택하거나 새로 만드세요.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="blocks" className="mt-4">
          <BlockTemplateTab
            refreshToken={blocksRefreshToken}
            onCreateButtonRef={(fn) => {
              createTemplateRef.current = fn;
            }}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <div className="mx-auto max-w-4xl flex flex-col gap-6 xl:max-w-none xl:grid xl:grid-cols-[300px_minmax(0,56rem)_300px] xl:gap-6 xl:justify-center">
            <div className="hidden xl:block" aria-hidden />

            <div className="w-full min-w-0 max-w-4xl mx-auto xl:mx-0 xl:col-start-2">
              <Card>
                <CardContent className="pt-6">
                  <KubectlContextSettings
                    onCreateButtonRef={(fn) => {
                      createContextRef.current = fn;
                    }}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="hidden xl:block" aria-hidden />
          </div>
        </TabsContent>
      </Tabs>

      <CreateCampaignDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateCampaign}
      />

      <AddClusterDialog
        open={addClusterOpen}
        onOpenChange={setAddClusterOpen}
        onSubmit={handleAddCluster}
      />

      {/* 캠페인 삭제 확인 다이얼로그 */}
      <AlertDialog open={campaignToDelete !== null} onOpenChange={(open) => { if (!open) setCampaignToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              캠페인 "{campaignToDelete?.name}"을 삭제합니다. 연결된 클러스터 및 블록 상태도 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCampaignToDelete(null)}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (campaignToDelete) {
                  handleDeleteCampaign(campaignToDelete.id);
                  setCampaignToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 캠페인 수정 다이얼로그 */}
      <Dialog open={campaignToEdit !== null} onOpenChange={(open) => { if (!open) setCampaignToEdit(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>캠페인 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>이름</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="캠페인 이름" />
            </div>
            <div className="space-y-1.5">
              <Label>설명</Label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="설명 (선택)" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>현재 버전</Label>
                <Input value={editSourceVersion} onChange={(e) => setEditSourceVersion(e.target.value)} placeholder="예: 1.28" />
              </div>
              <div className="space-y-1.5">
                <Label>목표 버전</Label>
                <Input value={editTargetVersion} onChange={(e) => setEditTargetVersion(e.target.value)} placeholder="예: 1.30" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignToEdit(null)} disabled={isEditSaving}>취소</Button>
            <Button onClick={handleSaveEditCampaign} disabled={isEditSaving || !editName.trim()}>
              {isEditSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
