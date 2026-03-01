import { useCallback, useState } from "react";
import { ChevronDown, ChevronRight, FileText, Loader2, Server } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { fetchClusterInstance } from "@/lib/api/eks-upgrade";
import { generateClusterUpgradeMarkdown } from "@/lib/eks-upgrade-markdown";
import type { Block, ClusterInstanceDetail, ClusterInstanceSummary } from "@/types/eks-upgrade";
import { ClusterBlockRunner } from "@/components/eks-upgrade/ClusterBlockRunner";
import { ClusterMarkdownDialog } from "@/components/eks-upgrade/ClusterMarkdownDialog";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "대기",
  IN_PROGRESS: "진행 중",
  COMPLETED: "완료",
  FAILED: "실패",
};

const STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  PENDING: "secondary",
  IN_PROGRESS: "default",
  COMPLETED: "outline",
  FAILED: "destructive",
};

interface Props {
  sourceVersion: string;
  targetVersion: string;
  instances: ClusterInstanceSummary[];
  blocks: Block[];
  onRefresh: () => void;
}

export function ClusterList({
  sourceVersion,
  targetVersion,
  instances,
  blocks,
  onRefresh,
}: Props) {
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailMap, setDetailMap] = useState<Record<number, ClusterInstanceDetail>>({});
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [markdownDialogOpen, setMarkdownDialogOpen] = useState(false);
  const [markdownPreviewTitle, setMarkdownPreviewTitle] = useState("");
  const [markdownPreview, setMarkdownPreview] = useState("");

  const loadDetail = useCallback(
    async (instanceId: number) => {
      if (detailMap[instanceId]) return;
      try {
        setLoadingId(instanceId);
        const detail = await fetchClusterInstance(instanceId);
        setDetailMap((prev) => ({ ...prev, [instanceId]: detail }));
      } catch (error) {
        toast({
          title: "클러스터 정보 로드 실패",
          description: error instanceof Error ? error.message : "알 수 없는 오류",
          variant: "destructive",
        });
      } finally {
        setLoadingId(null);
      }
    },
    [detailMap, toast]
  );

  const handleToggle = (instanceId: number) => {
    if (expandedId === instanceId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(instanceId);
    loadDetail(instanceId);
  };

  const refreshDetail = useCallback(
    async (instanceId: number) => {
      try {
        const detail = await fetchClusterInstance(instanceId);
        setDetailMap((prev) => ({ ...prev, [instanceId]: detail }));
      } catch (error) {
        toast({
          title: "클러스터 정보 새로고침 실패",
          description: error instanceof Error ? error.message : "알 수 없는 오류",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const handleGenerateMarkdown = useCallback(
    async (instance: ClusterInstanceSummary) => {
      try {
        setGeneratingId(instance.id);
        const detail = await fetchClusterInstance(instance.id);
        setDetailMap((prev) => ({ ...prev, [instance.id]: detail }));

        const markdown = generateClusterUpgradeMarkdown(sourceVersion, targetVersion, detail, blocks);
        setMarkdownPreviewTitle(`[${detail.environment}] ${detail.clusterName} Markdown`);
        setMarkdownPreview(markdown);
        setMarkdownDialogOpen(true);
      } catch (error) {
        toast({
          title: "Markdown 생성 실패",
          description: error instanceof Error ? error.message : "알 수 없는 오류",
          variant: "destructive",
        });
      } finally {
        setGeneratingId(null);
      }
    },
    [blocks, sourceVersion, targetVersion, toast]
  );

  if (instances.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Server className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">클러스터가 없습니다. 업그레이드할 클러스터를 추가하세요.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {instances.map((instance) => {
        const isExpanded = expandedId === instance.id;
        const isLoading = loadingId === instance.id;
        const detail = detailMap[instance.id];
        const totalBlockCount = blocks.length > 0 ? blocks.length : instance.totalBlockCount;
        const completedBlockCount = detail
          ? detail.blockStates.filter((state) => state.status === "COMPLETED").length
          : instance.completedBlockCount;
        const effectiveStatus = detail
          ? completedBlockCount >= totalBlockCount && totalBlockCount > 0
            ? "COMPLETED"
            : completedBlockCount > 0
              ? "IN_PROGRESS"
              : "PENDING"
          : instance.status;
        const progress = totalBlockCount > 0 ? Math.round((completedBlockCount / totalBlockCount) * 100) : 0;
        const isCompleted = effectiveStatus === "COMPLETED";

        return (
          <Card
            key={instance.id}
            className={`overflow-hidden transition-colors ${isCompleted ? "border-green-500/60 bg-green-500/5" : ""}`}
          >
            <CardHeader
              className={`p-4 cursor-pointer transition-colors ${isCompleted ? "hover:bg-green-500/10" : "hover:bg-accent/50"}`}
              onClick={() => handleToggle(instance.id)}
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className={`h-4 w-4 shrink-0 ${isCompleted ? "text-green-500" : "text-muted-foreground"}`} />
                ) : (
                  <ChevronRight className={`h-4 w-4 shrink-0 ${isCompleted ? "text-green-500" : "text-muted-foreground"}`} />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">{instance.clusterName}</span>
                    <Badge variant="outline" className="text-xs">
                      {instance.environment}
                    </Badge>
                    <Badge variant={STATUS_VARIANT[effectiveStatus]} className="text-xs">
                      {STATUS_LABEL[effectiveStatus] ?? effectiveStatus}
                    </Badge>
                  </div>
                  {instance.kubectlContext && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">context: {instance.kubectlContext}</p>
                  )}
                </div>

                {totalBlockCount > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-medium ${isCompleted ? "text-green-500" : "text-muted-foreground"}`}>
                      {completedBlockCount}/{totalBlockCount}
                    </span>
                    <Progress value={progress} className={`w-20 h-1.5 ${isCompleted ? "[&>div]:bg-green-500" : ""}`} />
                  </div>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs gap-1.5"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleGenerateMarkdown(instance);
                  }}
                  disabled={generatingId === instance.id}
                >
                  {generatingId === instance.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileText className="h-3.5 w-3.5" />
                  )}
                  MD 생성
                </Button>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0 border-t border-border/50">
                {isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : detail ? (
                  <ClusterBlockRunner instance={detail} blocks={blocks} onRefresh={() => refreshDetail(instance.id)} />
                ) : null}
              </CardContent>
            )}
          </Card>
        );
      })}

      <ClusterMarkdownDialog
        open={markdownDialogOpen}
        onOpenChange={setMarkdownDialogOpen}
        title={markdownPreviewTitle}
        markdown={markdownPreview}
      />
    </div>
  );
}
