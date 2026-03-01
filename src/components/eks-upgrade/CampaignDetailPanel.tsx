import { useState, useCallback, useEffect } from "react";
import { Users, Settings2, Link, Unlink, Pencil, Check, X, Loader2, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { linkTemplate, updateCampaign, deleteCampaign, fetchBlockTemplates } from "@/lib/api/eks-upgrade";

interface Props {
  campaign: CampaignDetail;
  onRefresh: () => void;
  onDelete?: () => void;
}

interface EditState {
  name: string;
  description: string;
  sourceVersion: string;
  targetVersion: string;
}

export function CampaignDetailPanel({ campaign, onRefresh, onDelete }: Props) {
  const { toast } = useToast();
  const [editing, setEditing] = useState<EditState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [templates, setTemplates] = useState<BlockTemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isLinking, setIsLinking] = useState(false);
  const hasTemplate = campaign.blockTemplateId !== null;

  useEffect(() => {
    if (!hasTemplate) {
      fetchBlockTemplates().then(setTemplates).catch(() => {});
    }
  }, [hasTemplate]);

  const startEdit = () =>
    setEditing({
      name: campaign.name,
      description: campaign.description ?? "",
      sourceVersion: campaign.sourceVersion,
      targetVersion: campaign.targetVersion,
    });

  const handleSave = useCallback(async () => {
    if (!editing || !editing.name.trim()) return;
    setIsSaving(true);
    try {
      await updateCampaign(campaign.id, {
        name: editing.name.trim(),
        description: editing.description.trim() || undefined,
        sourceVersion: editing.sourceVersion.trim() || undefined,
        targetVersion: editing.targetVersion.trim() || undefined,
      });
      toast({ title: "캠페인 정보 수정 완료" });
      setEditing(null);
      onRefresh();
    } catch (error) {
      toast({
        title: "수정 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [editing, campaign.id, onRefresh, toast]);

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

  const handleDeleteCampaign = useCallback(async () => {
    try {
      await deleteCampaign(campaign.id);
      toast({ title: "캠페인 삭제 완료" });
      onDelete?.();
    } catch (error) {
      toast({
        title: "캠페인 삭제 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
    }
  }, [campaign.id, onDelete, toast]);

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <Card>
        <CardHeader className="pb-3">
          {editing ? (
            /* 편집 모드 */
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing((p) => p && { ...p, name: e.target.value })}
                  className="text-base font-semibold h-9"
                  placeholder="캠페인 이름"
                />
              </div>
              <Textarea
                value={editing.description}
                onChange={(e) => setEditing((p) => p && { ...p, description: e.target.value })}
                placeholder="설명 (선택)"
                rows={2}
                className="text-sm resize-none"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">버전</span>
                <Input
                  value={editing.sourceVersion}
                  onChange={(e) => setEditing((p) => p && { ...p, sourceVersion: e.target.value })}
                  className="h-8 text-sm font-mono w-24"
                  placeholder="현재"
                />
                <span className="text-muted-foreground">→</span>
                <Input
                  value={editing.targetVersion}
                  onChange={(e) => setEditing((p) => p && { ...p, targetVersion: e.target.value })}
                  className="h-8 text-sm font-mono w-24"
                  placeholder="목표"
                />
                <div className="flex-1" />
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => setEditing(null)} disabled={isSaving}>
                  <X className="h-3.5 w-3.5" />
                  취소
                </Button>
                <Button size="sm" className="gap-1" onClick={handleSave} disabled={isSaving || !editing.name.trim()}>
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  저장
                </Button>
              </div>
            </div>
          ) : (
            /* 보기 모드 */
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg">{campaign.name}</CardTitle>
                <div className="mt-1">
                  <Badge variant="outline" className="text-sm font-mono">
                    v{campaign.sourceVersion} → v{campaign.targetVersion}
                  </Badge>
                </div>
                {campaign.description && (
                  <p className="text-sm text-muted-foreground mt-1">{campaign.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={startEdit}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                      <AlertDialogDescription>
                        캠페인 "{campaign.name}"을 삭제합니다. 연결된 클러스터 및 블록 상태도 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteCampaign}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        삭제
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}

          {!editing && (
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
          )}
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
