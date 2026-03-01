import { useState, useCallback } from "react";
import { Plus, Loader2, AlertCircle, FileText, Pencil, Trash2, Link, Unlink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  fetchBlockTemplates,
  fetchBlockTemplate,
  createBlockTemplate,
  updateBlockTemplate,
  deleteBlockTemplate,
  createTemplateBlock,
} from "@/lib/api/eks-upgrade";
import type { BlockTemplateSummary, BlockTemplateDetail, CreateBlockRequest } from "@/types/eks-upgrade";
import { BlockList } from "@/components/eks-upgrade/BlockList";
import { AddBlockDialog } from "@/components/eks-upgrade/AddBlockDialog";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, description?: string) => Promise<void>;
  initial?: { name: string; description?: string };
}

function CreateTemplateDialog({ open, onOpenChange, onSubmit, initial }: CreateTemplateDialogProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
    }
  }, [open, initial]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(name.trim(), description.trim() || undefined);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "블록 템플릿 수정" : "새 블록 템플릿"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>이름</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="템플릿 이름"
            />
          </div>
          <div className="space-y-1.5">
            <Label>설명 (선택)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="템플릿 설명"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {initial ? "저장" : "생성"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface Props {
  refreshToken?: number;
  onCreateButtonRef?: (fn: () => void) => void;
}

interface EditingTemplate {
  id: number;
  name: string;
  description: string | null;
}

export function BlockTemplateTab({ refreshToken = 0, onCreateButtonRef }: Props) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<BlockTemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [templateDetail, setTemplateDetail] = useState<BlockTemplateDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EditingTemplate | null>(null);
  const [addBlockOpen, setAddBlockOpen] = useState(false);

  const loadTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      const list = await fetchBlockTemplates();
      setTemplates(list);
    } catch (error) {
      toast({
        title: "템플릿 목록 로드 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const loadTemplateDetail = useCallback(async (id: number) => {
    try {
      setIsDetailLoading(true);
      const detail = await fetchBlockTemplate(id);
      setTemplateDetail(detail);
    } catch (error) {
      toast({
        title: "템플릿 상세 로드 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
    } finally {
      setIsDetailLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    loadTemplates();
    setTemplateDetail(null);
    setSelectedTemplateId(null);
  }, [refreshToken, loadTemplates]);

  useEffect(() => {
    if (selectedTemplateId === null) {
      setTemplateDetail(null);
      return;
    }
    loadTemplateDetail(selectedTemplateId);
  }, [selectedTemplateId, loadTemplateDetail]);

  // 외부에서 "새 템플릿" 버튼 클릭을 트리거할 수 있도록 ref 전달
  useEffect(() => {
    onCreateButtonRef?.(() => setCreateDialogOpen(true));
  }, [onCreateButtonRef]);

  const handleCreateTemplate = async (name: string, description?: string) => {
    try {
      const created = await createBlockTemplate({ name, description });
      toast({ title: "블록 템플릿 생성 완료" });
      await loadTemplates();
      setSelectedTemplateId(created.id);
    } catch (error) {
      toast({
        title: "블록 템플릿 생성 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleUpdateTemplate = async (name: string, description?: string) => {
    if (!editingTemplate) return;
    try {
      await updateBlockTemplate(editingTemplate.id, { name, description });
      toast({ title: "블록 템플릿 수정 완료" });
      await loadTemplates();
      if (selectedTemplateId === editingTemplate.id) {
        loadTemplateDetail(editingTemplate.id);
      }
      setEditingTemplate(null);
    } catch (error) {
      toast({
        title: "블록 템플릿 수정 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      await deleteBlockTemplate(id);
      toast({ title: "블록 템플릿 삭제 완료" });
      if (selectedTemplateId === id) {
        setSelectedTemplateId(null);
      }
      await loadTemplates();
    } catch (error) {
      toast({
        title: "블록 템플릿 삭제 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
    }
  };

  const handleAddBlock = async (request: CreateBlockRequest) => {
    if (!selectedTemplateId) return;
    try {
      await createTemplateBlock(selectedTemplateId, request);
      toast({ title: "블록 추가 완료" });
      loadTemplateDetail(selectedTemplateId);
    } catch (error) {
      toast({
        title: "블록 추가 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <div className="mx-auto max-w-4xl flex flex-col gap-6 xl:max-w-none xl:grid xl:grid-cols-[300px_minmax(0,56rem)_300px] xl:gap-6 xl:justify-center">
      {/* 왼쪽: 템플릿 사이드바 */}
      <Card className="h-fit w-full xl:w-[300px] xl:shrink-0 xl:col-start-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            블록 템플릿
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">블록 템플릿이 없습니다</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[calc(100vh-320px)]">
              <div className="p-2 space-y-1">
                {templates.map((template) => {
                  const isSelected = selectedTemplateId === template.id;
                  const usedByCount = template.usedByCampaigns.length;

                  return (
                    <div
                      key={template.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedTemplateId(template.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedTemplateId(template.id);
                        }
                      }}
                      className={cn(
                        "w-full text-left rounded-lg p-3 transition-all hover:bg-accent cursor-pointer",
                        isSelected
                          ? "bg-primary/5 border border-primary/30 shadow-sm"
                          : "border border-transparent"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{template.name}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant="secondary" className="h-5 px-2 text-[11px]">
                              블록 {template.blockCount}개
                            </Badge>
                            <Badge variant="secondary" className="h-5 px-2 text-[11px]">
                              연결 캠페인 {usedByCount}개
                            </Badge>
                          </div>
                        </div>
                        <Badge
                          variant={usedByCount > 0 ? "outline" : "secondary"}
                          className={cn("text-xs shrink-0", usedByCount > 0 && "border-emerald-500/40 text-emerald-600")}
                        >
                          {usedByCount > 0 ? "연결됨" : "미연결"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* 오른쪽: 템플릿 상세 */}
      <div className="w-full min-w-0 max-w-4xl mx-auto xl:mx-0 xl:col-start-2">
        {isDetailLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : templateDetail ? (
          <div className="space-y-4">
            {/* 템플릿 헤더 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg">{templateDetail.name}</CardTitle>
                    {templateDetail.description && (
                      <p className="text-sm text-muted-foreground mt-1">{templateDetail.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setEditingTemplate({
                          id: templateDetail.id,
                          name: templateDetail.name,
                          description: templateDetail.description ?? null,
                        })
                      }
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
                            블록 템플릿 "{templateDetail.name}"을 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteTemplate(templateDetail.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            삭제
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="h-6 px-2.5 text-xs">
                      블록 {templateDetail.blocks.length}개
                    </Badge>
                    <Badge variant="secondary" className="h-6 px-2.5 text-xs">
                      연결 캠페인 {templateDetail.usedByCampaigns.length}개
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-7"
                    onClick={() => setAddBlockOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    블록 추가
                  </Button>
                </div>

                {templateDetail.usedByCampaigns.length > 0 ? (
                  <div className="pt-3 border-t border-border/50">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Link className="h-3 w-3" />
                      사용 중인 캠페인
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {templateDetail.usedByCampaigns.map((campaign) => (
                        <Badge key={campaign.id} variant="secondary" className="text-xs">
                          {campaign.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Unlink className="h-3 w-3" />
                      아직 연결된 캠페인이 없습니다
                    </p>
                  </div>
                )}
              </CardHeader>
            </Card>

            {/* 블록 목록 */}
            <BlockList
              templateId={templateDetail.id}
              blocks={templateDetail.blocks}
              onRefresh={() => loadTemplateDetail(templateDetail.id)}
            />
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                블록 템플릿을 선택하거나 새로 만드세요.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="hidden xl:block" aria-hidden />

      <CreateTemplateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateTemplate}
      />

      {editingTemplate && (
        <CreateTemplateDialog
          open={!!editingTemplate}
          onOpenChange={(open) => { if (!open) setEditingTemplate(null); }}
          onSubmit={handleUpdateTemplate}
          initial={{ name: editingTemplate.name, description: editingTemplate.description ?? undefined }}
        />
      )}

      <AddBlockDialog
        open={addBlockOpen}
        onOpenChange={setAddBlockOpen}
        onSubmit={handleAddBlock}
      />
    </div>
  );
}
