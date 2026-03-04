import { useState, useCallback, useEffect } from "react";
import { Users, Settings2, Link, Unlink, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { CampaignDetail, BlockTemplateSummary } from "@/types/eks-upgrade";
import { BlockList } from "@/components/eks-upgrade/BlockList";
import { linkTemplate, fetchBlockTemplates } from "@/lib/api/eks-upgrade";

const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  DRAFT: "초안",
  ACTIVE: "진행 중",
  COMPLETED: "완료",
  CANCELLED: "취소",
};

const CAMPAIGN_STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  ACTIVE: "default",
  COMPLETED: "outline",
  CANCELLED: "destructive",
};

interface Props {
  campaign: CampaignDetail;
  onRefresh: () => void;
}

export function CampaignDetailPanel({ campaign, onRefresh }: Props) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<BlockTemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isLinking, setIsLinking] = useState(false);
  const hasTemplate = campaign.blockTemplateId !== null;

  useEffect(() => {
    if (!hasTemplate) {
      fetchBlockTemplates().then(setTemplates).catch(() => {});
    }
  }, [hasTemplate]);

  const handleUnlinkTemplate = useCallback(async () => {
    try {
      await linkTemplate(campaign.id, null);
      toast({ title: "템플릿 연결 해제 완료" });
      onRefresh();
    } catch (error) {
      toast({
        title: "템플릿 연결 해제 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
    }
  }, [campaign.id, onRefresh, toast]);

  const handleLinkTemplate = useCallback(async () => {
    if (!selectedTemplateId) return;
    setIsLinking(true);
    try {
      await linkTemplate(campaign.id, Number(selectedTemplateId));
      toast({ title: "템플릿 연결 완료" });
      onRefresh();
    } catch (error) {
      toast({
        title: "템플릿 연결 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
    } finally {
      setIsLinking(false);
    }
  }, [campaign.id, selectedTemplateId, onRefresh, toast]);

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <Card>
        <CardHeader className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-lg">{campaign.name}</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-sm font-mono">
                  v{campaign.sourceVersion} → v{campaign.targetVersion}
                </Badge>
                <Badge variant={CAMPAIGN_STATUS_VARIANT[campaign.status] ?? "secondary"}>
                  {CAMPAIGN_STATUS_LABEL[campaign.status] ?? campaign.status}
                </Badge>
              </div>
              {campaign.description && (
                <p className="text-sm text-muted-foreground">{campaign.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                클러스터 {campaign.clusterInstances.length}개
              </span>
              <span className="flex items-center gap-1">
                <Settings2 className="h-3.5 w-3.5" />
                블록 {campaign.blocks.length}개
              </span>
            </div>
            {hasTemplate && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Link className="h-3 w-3" />
                  {campaign.blockTemplateName}
                </Badge>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1"
                    >
                      <Unlink className="h-3 w-3" />
                      연결 해제
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>템플릿 연결을 해제하시겠습니까?</AlertDialogTitle>
                      <AlertDialogDescription>
                        템플릿 연결을 해제하면 캠페인에서 블록 목록을 직접 관리해야 합니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleUnlinkTemplate}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        연결 해제
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* 블록 목록 */}
      {hasTemplate ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/40 border rounded-lg px-4 py-2.5">
          <span className="flex items-center gap-1.5">
            <Link className="h-3.5 w-3.5" />
            블록 템플릿 <strong className="text-foreground">{campaign.blockTemplateName}</strong>에서 가져옵니다. 수정은 블록 탭에서 하세요.
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3 border rounded-lg px-4 py-3 bg-muted/20">
          <Link className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground flex-1">블록 템플릿이 연결되지 않았습니다.</span>
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
            <SelectTrigger className="w-[200px] h-8 text-sm">
              <SelectValue placeholder="템플릿 선택..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="gap-1.5 h-8"
            disabled={!selectedTemplateId || isLinking}
            onClick={handleLinkTemplate}
          >
            {isLinking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link className="h-3.5 w-3.5" />}
            연결
          </Button>
        </div>
      )}
      <BlockList
        blocks={campaign.blocks}
        onRefresh={onRefresh}
      />
    </div>
  );
}
