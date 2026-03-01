import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { fetchBlockTemplates } from "@/lib/api/eks-upgrade";
import type { BlockTemplateSummary } from "@/types/eks-upgrade";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: {
    name: string;
    description?: string;
    sourceVersion: string;
    targetVersion: string;
    blockTemplateId?: number;
  }) => Promise<void>;
}

export function CreateCampaignDialog({ open, onOpenChange, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceVersion, setSourceVersion] = useState("");
  const [targetVersion, setTargetVersion] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [templates, setTemplates] = useState<BlockTemplateSummary[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchBlockTemplates().then(setTemplates).catch(() => {});
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim() || !sourceVersion.trim() || !targetVersion.trim()) return;
    try {
      setIsSubmitting(true);
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        sourceVersion: sourceVersion.trim(),
        targetVersion: targetVersion.trim(),
        blockTemplateId: selectedTemplateId ?? undefined,
      });
      setName("");
      setDescription("");
      setSourceVersion("");
      setTargetVersion("");
      setSelectedTemplateId(null);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>새 업그레이드 캠페인</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>캠페인 이름</Label>
            <Input
              placeholder="예: EKS v1.32 → v1.33 업그레이드"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>현재 버전</Label>
              <Input placeholder="예: 1.32" value={sourceVersion} onChange={(e) => setSourceVersion(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>목표 버전</Label>
              <Input placeholder="예: 1.33" value={targetVersion} onChange={(e) => setTargetVersion(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>설명 (선택)</Label>
            <Textarea
              placeholder="이번 업그레이드 캠페인에 대한 설명"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          {templates.length > 0 && (
            <div className="space-y-1.5">
              <Label>블록 템플릿 (선택)</Label>
              <Select
                value={selectedTemplateId !== null ? String(selectedTemplateId) : "none"}
                onValueChange={(v) => setSelectedTemplateId(v === "none" ? null : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="템플릿 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">없음</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name} ({t.blockCount}개 블록)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim() || !sourceVersion.trim() || !targetVersion.trim()}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            생성
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
