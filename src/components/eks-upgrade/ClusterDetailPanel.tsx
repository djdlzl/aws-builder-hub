import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, Server, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
import { fetchClusterInstance, updateClusterInstance, deleteClusterInstance } from "@/lib/api/eks-upgrade";
import { generateClusterUpgradeMarkdown } from "@/lib/eks-upgrade-markdown";
import type { Block, ClusterInstanceDetail, ClusterInstanceSummary, UpdateClusterInstanceRequest } from "@/types/eks-upgrade";
import { ClusterBlockRunner } from "@/components/eks-upgrade/ClusterBlockRunner";
import { ClusterMarkdownDialog } from "@/components/eks-upgrade/ClusterMarkdownDialog";
import { AddClusterDialog } from "@/components/eks-upgrade/AddClusterDialog";

interface Props {
  instance: ClusterInstanceSummary;
  blocks: Block[];
  sourceVersion: string;
  targetVersion: string;
  onRefresh: () => void;
  onDeleted?: () => void;
}

export function ClusterDetailPanel({ instance, blocks, sourceVersion, targetVersion, onRefresh, onDeleted }: Props) {
  const { toast } = useToast();
  const [detail, setDetail] = useState<ClusterInstanceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [markdownOpen, setMarkdownOpen] = useState(false);
  const [markdownTitle, setMarkdownTitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  const loadDetail = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) setIsLoading(true);
        const d = await fetchClusterInstance(instance.id);
        setDetail(d);
      } catch (error) {
        toast({
          title: "클러스터 정보 로드 실패",
          description: error instanceof Error ? error.message : "알 수 없는 오류",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [instance.id, toast]
  );

  useEffect(() => {
    setDetail(null);
    loadDetail();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance.id]);

  const handleRefresh = useCallback(() => {
    loadDetail(false);
    onRefresh();
  }, [loadDetail, onRefresh]);

  const handleGenerateMarkdown = useCallback(async () => {
    try {
      setIsGenerating(true);
      const d = await fetchClusterInstance(instance.id);
      setDetail(d);
      const md = generateClusterUpgradeMarkdown(sourceVersion, targetVersion, d, blocks);
      setMarkdownTitle(`[${d.environment}] ${d.clusterName} Markdown`);
      setMarkdown(md);
      setMarkdownOpen(true);
    } catch (error) {
      toast({
        title: "Markdown 생성 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [instance.id, blocks, sourceVersion, targetVersion, toast]);

  const handleUpdate = useCallback(
    async (req: UpdateClusterInstanceRequest) => {
      await updateClusterInstance(instance.id, req);
      toast({ title: "클러스터 수정 완료" });
      onRefresh();
    },
    [instance.id, onRefresh, toast]
  );

  const handleDelete = useCallback(async () => {
    try {
      await deleteClusterInstance(instance.id);
      toast({ title: "클러스터 삭제 완료" });
      onDeleted?.();
    } catch (error) {
      toast({
        title: "클러스터 삭제 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
    }
  }, [instance.id, onDeleted, toast]);

  const completedCount = detail
    ? detail.blockStates.filter((s) => s.status === "COMPLETED").length
    : instance.completedBlockCount;
  const totalCount = blocks.length || instance.totalBlockCount;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isCompleted = totalCount > 0 && completedCount >= totalCount;

  return (
    <div className="space-y-4">
      {/* 클러스터 헤더 */}
      <Card className={isCompleted ? "border-green-500/60 bg-green-500/5" : ""}>
        <CardHeader className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Server className={`h-4 w-4 shrink-0 ${isCompleted ? "text-green-500" : "text-muted-foreground"}`} />
                <span className="font-semibold text-foreground">{instance.clusterName}</span>
                <Badge variant="outline" className="text-xs">{instance.environment}</Badge>
                {instance.kubectlContext && (
                  <span className="text-xs text-muted-foreground font-mono">{instance.kubectlContext}</span>
                )}
              </div>
              <Badge variant="secondary" className="text-xs font-mono">
                v{sourceVersion} → v{targetVersion}
              </Badge>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {totalCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${isCompleted ? "text-green-500" : "text-muted-foreground"}`}>
                    {completedCount}/{totalCount}
                  </span>
                  <Progress value={progress} className={`w-24 h-1.5 ${isCompleted ? "[&>div]:bg-green-500" : ""}`} />
                </div>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs gap-1.5"
                onClick={handleGenerateMarkdown}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                MD 생성
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                    <AlertDialogDescription>
                      클러스터 "{instance.clusterName}"을 삭제합니다. 블록 실행 상태도 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      삭제
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 블록 작업 목록 */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : detail ? (
        <ClusterBlockRunner instance={detail} blocks={blocks} onRefresh={handleRefresh} />
      ) : null}

      <ClusterMarkdownDialog
        open={markdownOpen}
        onOpenChange={setMarkdownOpen}
        title={markdownTitle}
        markdown={markdown}
      />

      <AddClusterDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={instance}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
