import { useState, useRef, useEffect } from "react";
import {
  CheckSquare, Terminal, Package, Tag, FileText, GitBranch, Activity, RotateCcw,
  GripVertical, Pencil, Trash2, ChevronDown, ChevronUp, Power,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { deleteBlock, reorderTemplateBlocks, toggleBlock } from "@/lib/api/eks-upgrade";
import type { Block, BlockStage, BlockType } from "@/types/eks-upgrade";
import { BLOCK_STAGE_META } from "@/types/eks-upgrade";
import { EditBlockDialog } from "@/components/eks-upgrade/EditBlockDialog";
import { cn } from "@/lib/utils";

const BLOCK_TYPE_META: Record<BlockType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  CHECK:    { label: "체크",         icon: CheckSquare, color: "text-green-500"   },
  RUN:      { label: "실행",         icon: Terminal,    color: "text-blue-500"    },
  ROLLOUT:  { label: "Rollout",      icon: RotateCcw,   color: "text-cyan-500"    },
  ADDON:    { label: "애드온",        icon: Package,     color: "text-purple-500"  },
  VERSION:  { label: "버전",         icon: Tag,         color: "text-yellow-500"  },
  NOTE:     { label: "메모",         icon: FileText,    color: "text-gray-400"    },
  GIT_CLONE:{ label: "버전 업데이트", icon: GitBranch,  color: "text-pink-500"    },
  LOCUST:   { label: "Locust",       icon: Activity,    color: "text-emerald-500" },
};

interface Props {
  templateId?: number;
  blocks: Block[];
  onRefresh: () => void;
}

export function BlockList({ templateId, blocks, onRefresh }: Props) {
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const sortByStage = (bs: Block[]) =>
    [...bs].sort((a, b) => {
      const stageDiff = (BLOCK_STAGE_META[a.blockStage]?.order ?? 0) - (BLOCK_STAGE_META[b.blockStage]?.order ?? 0);
      return stageDiff !== 0 ? stageDiff : a.sortOrder - b.sortOrder;
    });

  const [orderedBlocks, setOrderedBlocks] = useState<Block[]>(() => sortByStage(blocks));
  const [draggingId, setDraggingId] = useState<number | null>(null);
  // 삽입 위치: 해당 ID의 블록 앞에 삽입, "end"이면 맨 끝에 삽입
  const [insertBeforeId, setInsertBeforeId] = useState<number | "end" | null>(null);
  const isSavingOrder = useRef(false);
  // 그립 핸들에서만 드래그 허용
  const dragFromGripRef = useRef(false);

  // 드래그 중이 아닐 때만 blocks prop 변경을 로컬 순서에 반영 (stage 순서 고정)
  useEffect(() => {
    if (draggingId === null) {
      setOrderedBlocks(sortByStage(blocks));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  const handleDelete = async (blockId: number) => {
    try {
      await deleteBlock(blockId);
      toast({ title: "블록 삭제 완료" });
      onRefresh();
    } catch (error) {
      toast({
        title: "블록 삭제 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
    }
  };

  const handleToggle = async (blockId: number) => {
    try {
      await toggleBlock(blockId);
      onRefresh();
    } catch (error) {
      toast({
        title: "블록 상태 변경 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, blockId: number) => {
    if (!dragFromGripRef.current) {
      e.preventDefault();
      return;
    }
    dragFromGripRef.current = false;
    setDraggingId(blockId);
    e.dataTransfer.effectAllowed = "move";
    setExpandedId(null);
  };

  const handleDragOver = (e: React.DragEvent, blockId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    // 마우스 Y 위치로 삽입 위치 결정 (상반부 = 앞에, 하반부 = 뒤에)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;

    if (e.clientY < midY) {
      setInsertBeforeId(blockId);
    } else {
      const idx = orderedBlocks.findIndex((b) => b.id === blockId);
      const nextBlock = orderedBlocks[idx + 1];
      setInsertBeforeId(nextBlock ? nextBlock.id : "end");
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (draggingId === null || insertBeforeId === null || isSavingOrder.current) return;

    const fromIdx = orderedBlocks.findIndex((b) => b.id === draggingId);
    if (fromIdx === -1) return;

    const newOrder = [...orderedBlocks];
    const [moved] = newOrder.splice(fromIdx, 1);

    let toIdx: number;
    if (insertBeforeId === "end") {
      toIdx = newOrder.length; // 맨 끝
    } else {
      toIdx = newOrder.findIndex((b) => b.id === insertBeforeId);
      if (toIdx === -1) toIdx = newOrder.length;
    }

    newOrder.splice(toIdx, 0, moved);

    // 제자리 드롭이면 무시
    if (newOrder.every((b, i) => b.id === orderedBlocks[i].id)) {
      setDraggingId(null);
      setInsertBeforeId(null);
      return;
    }

    setOrderedBlocks(newOrder);
    setDraggingId(null);
    setInsertBeforeId(null);

    isSavingOrder.current = true;
    try {
      if (templateId !== undefined) {
        await reorderTemplateBlocks(templateId, newOrder.map((b) => b.id));
      }
      onRefresh();
    } catch {
      toast({ title: "순서 변경 실패", variant: "destructive" });
      setOrderedBlocks(blocks);
    } finally {
      isSavingOrder.current = false;
    }
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setInsertBeforeId(null);
  };

  // 삽입 인디케이터 라인 컴포넌트
  const InsertionLine = () => (
    <div
      className="h-0.5 bg-primary rounded-full mx-1 transition-all"
      style={{
        boxShadow: "0 0 1px 1px hsl(var(--primary) / 0.45), 0 0 10px 3px hsl(var(--primary) / 0.18)",
      }}
    />
  );

  if (orderedBlocks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <FileText className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">블록이 없습니다. 블록을 추가해 작업 단계를 정의하세요.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className="space-y-2"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {orderedBlocks.map((block, idx) => {
        const meta = BLOCK_TYPE_META[block.blockType] ?? { label: block.blockType, icon: FileText, color: "text-muted-foreground" };
        const Icon = meta.icon;
        const isExpanded = expandedId === block.id;
        const isDragging = draggingId === block.id;
        const showLineAbove = draggingId !== null && insertBeforeId === block.id;

        // 스테이지 헤더: 이전 블록과 스테이지가 다를 때 표시
        const prevBlock = orderedBlocks[idx - 1];
        const showStageHeader = !prevBlock || prevBlock.blockStage !== block.blockStage;

        return (
          <div key={block.id}>
            {/* 스테이지 구분 헤더 */}
            {showStageHeader && !isDragging && (
              <div className={`flex items-center gap-3 ${idx > 0 ? "mt-7 pt-1" : ""} mb-3`}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
                  {BLOCK_STAGE_META[block.blockStage as BlockStage]?.label ?? block.blockStage}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-border via-border/70 to-transparent" />
              </div>
            )}

            {/* 삽입 위치 인디케이터 라인 */}
            {showLineAbove && <InsertionLine />}

            <Card
              className={cn(
                "overflow-hidden transition-all",
                isDragging ? "opacity-40" : !block.isEnabled && "opacity-50",
              )}
              draggable
              onDragStart={(e) => handleDragStart(e, block.id)}
              onDragOver={(e) => handleDragOver(e, block.id)}
              onDragEnd={handleDragEnd}
            >
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : block.id)}
              >
                <GripVertical
                  className="h-4 w-4 text-muted-foreground/50 cursor-grab active:cursor-grabbing shrink-0"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    dragFromGripRef.current = true;
                  }}
                />
                <Icon className={`h-4 w-4 flex-shrink-0 ${meta.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-medium", block.isEnabled ? "text-foreground" : "text-muted-foreground line-through")}>{block.title}</span>
                  </div>
                  {block.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{block.description}</p>
                  )}
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">{meta.label}</Badge>
                {!block.isEnabled && (
                  <Badge variant="outline" className="text-xs shrink-0 text-muted-foreground">비활성</Badge>
                )}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); setEditingBlock(block); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {templateId === undefined ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("h-7 w-7", block.isEnabled ? "text-muted-foreground" : "text-primary")}
                      title={block.isEnabled ? "비활성화" : "활성화"}
                      onClick={(e) => { e.stopPropagation(); handleToggle(block.id); }}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                          <AlertDialogDescription>블록 "{block.title}"을 삭제합니다. 이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(block.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            삭제
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  }
                </div>
              </div>

              {isExpanded && (
                <CardContent className="pt-0 pb-3 border-t border-border/50">
                  <div className="space-y-2 mt-3">
                    {block.description && (
                      <p className="text-sm text-muted-foreground">{block.description}</p>
                    )}
                    {block.command && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">명령어</p>
                        <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap">
                          {block.command}
                        </pre>
                      </div>
                    )}
                    {block.filePath && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">파일 경로</p>
                        <code className="text-xs bg-muted rounded px-2 py-1">{block.filePath}</code>
                      </div>
                    )}
                    {block.blockType === "ROLLOUT" && (
                      <p className="text-xs text-muted-foreground">
                        각 클러스터 실행 화면에서 Deployment를 선택합니다.
                      </p>
                    )}
                    {block.blockType === "CHECK" && block.params && (() => {
                      try {
                        const p = JSON.parse(block.params) as { items: { id: string; label: string }[] };
                        if (!p.items?.length) return null;
                        return (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1.5">확인 항목 ({p.items.length}개)</p>
                            <div className="rounded border border-border/50 overflow-hidden">
                              {p.items.map((item, i) => (
                                <div
                                  key={item.id}
                                  className={`flex items-start gap-2 px-3 py-2 text-sm ${i > 0 ? "border-t border-border/30" : ""}`}
                                >
                                  <span className="text-muted-foreground text-xs mt-0.5 shrink-0">{i + 1}.</span>
                                  <span>{item.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      } catch { return null; }
                    })()}
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
                    {block.blockType === "GIT_CLONE" && block.params && (() => {
                      try {
                        const p = JSON.parse(block.params) as { repoUrl: string; branch?: string; targetDir?: string };
                        return (
                          <div className="text-xs bg-muted rounded p-2 font-mono space-y-0.5">
                            <div><span className="text-muted-foreground">repo: </span>{p.repoUrl}</div>
                            {p.branch && <div><span className="text-muted-foreground">branch: </span>{p.branch}</div>}
                            {p.targetDir && <div><span className="text-muted-foreground">dir: </span>{p.targetDir}</div>}
                          </div>
                        );
                      } catch { return null; }
                    })()}
                    {block.blockType === "LOCUST" && block.params && (() => {
                      try {
                        const p = JSON.parse(block.params) as { gatewayUrl: string; workerCount?: number };
                        return (
                          <div className="text-xs bg-muted rounded p-2 font-mono space-y-0.5">
                            <div><span className="text-muted-foreground">gateway: </span>{p.gatewayUrl}</div>
                            {p.workerCount != null && <div><span className="text-muted-foreground">workers: </span>{p.workerCount}</div>}
                          </div>
                        );
                      } catch { return null; }
                    })()}
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        );
      })}

      {/* 맨 끝 삽입 인디케이터 */}
      {draggingId !== null && insertBeforeId === "end" && <InsertionLine />}

      {editingBlock && (
        <EditBlockDialog
          block={editingBlock}
          open={!!editingBlock}
          onOpenChange={(open) => { if (!open) setEditingBlock(null); }}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}
