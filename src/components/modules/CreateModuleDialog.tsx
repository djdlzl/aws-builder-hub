import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type {
  MandatoryTagKey,
  TagModule,
  TagModulePayload,
} from "@/types/module";
import { Plus, X } from "lucide-react";

interface TagItem {
  key: string;
  value: string;
}

interface CreateModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mandatoryKeys: MandatoryTagKey[];
  onCreate: (payload: TagModulePayload) => Promise<void>;
  onUpdate: (id: number, payload: TagModulePayload) => Promise<void>;
  module?: TagModule | null;
  isSubmitting?: boolean;
}

export function CreateModuleDialog({
  open,
  onOpenChange,
  mandatoryKeys,
  onCreate,
  onUpdate,
  module,
  isSubmitting = false,
}: CreateModuleDialogProps) {
  const { toast } = useToast();
  const isEditMode = Boolean(module);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mandatoryValues, setMandatoryValues] = useState<
    Record<string, string>
  >({});
  const [tags, setTags] = useState<TagItem[]>([{ key: "", value: "" }]);

  const mandatoryKeySet = useMemo(() => {
    return new Set(mandatoryKeys.map((key) => key.tagKey));
  }, [mandatoryKeys]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextName = module?.name ?? "";
    const nextDescription = module?.description ?? "";
    const nextMandatoryValues: Record<string, string> = {};
    const moduleItems = module?.items ?? [];
    const optionalItems = moduleItems.filter(
      (item) => !item.isMandatory && !mandatoryKeySet.has(item.key)
    );

    moduleItems.forEach((item) => {
      if (item.isMandatory || mandatoryKeySet.has(item.key)) {
        nextMandatoryValues[item.key] = item.value ?? "";
      }
    });

    mandatoryKeys.forEach((key) => {
      if (!nextMandatoryValues[key.tagKey]) {
        nextMandatoryValues[key.tagKey] = "";
      }
    });

    setName(nextName);
    setDescription(nextDescription ?? "");
    setMandatoryValues(nextMandatoryValues);
    if (optionalItems.length > 0) {
      setTags(
        optionalItems.map((item) => ({
          key: item.key,
          value: item.value ?? "",
        }))
      );
    } else {
      setTags([{ key: "", value: "" }]);
    }
  }, [open, module, mandatoryKeys, mandatoryKeySet]);

  const addTag = () => {
    setTags((prev) => [...prev, { key: "", value: "" }]);
  };

  const removeTag = (index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTag = (index: number, field: "key" | "value", value: string) => {
    setTags((prev) => {
      const nextTags = [...prev];
      nextTags[index][field] = value;
      return nextTags;
    });
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({
        title: "입력 오류",
        description: "모듈 이름을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    const normalizedOptional = tags
      .map((tag) => ({ key: tag.key.trim(), value: tag.value.trim() }))
      .filter((tag) => tag.key.length > 0 || tag.value.length > 0);

    const missingKey = normalizedOptional.some((tag) => !tag.key && tag.value);
    if (missingKey) {
      toast({
        title: "입력 오류",
        description: "태그 키를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    const optionalKeys = normalizedOptional
      .filter((tag) => tag.key.length > 0)
      .map((tag) => tag.key);
    const duplicateOptional = optionalKeys.filter(
      (key, index) => optionalKeys.indexOf(key) !== index
    );
    const duplicateWithMandatory = optionalKeys.filter((key) =>
      mandatoryKeySet.has(key)
    );

    if (duplicateOptional.length > 0 || duplicateWithMandatory.length > 0) {
      toast({
        title: "입력 오류",
        description:
          "중복된 태그 키가 있습니다. 필수 태그 키는 별도로 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    const items = [
      ...mandatoryKeys.map((key) => ({
        key: key.tagKey,
        value: mandatoryValues[key.tagKey]?.trim() || null,
      })),
      ...normalizedOptional
        .filter((tag) => tag.key.length > 0)
        .map((tag) => ({ key: tag.key, value: tag.value || null })),
    ];

    const payload: TagModulePayload = {
      name: trimmedName,
      description: description.trim() || null,
      items,
    };

    try {
      if (module) {
        await onUpdate(module.id, payload);
      } else {
        await onCreate(payload);
      }
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "처리 실패",
        description:
          error instanceof Error ? error.message : "요청에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {isEditMode ? "태그 모듈 편집" : "새 태그 모듈 생성"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            필수 태그 키는 자동 포함되며, 필요 시 값을 입력할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">모듈 이름</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: production-tags"
              className="bg-secondary border-border"
            />
          </div>

          <div className="grid gap-2">
            <Label>모듈 유형</Label>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                TAG
              </Badge>
              <span className="text-sm text-muted-foreground">태그 모듈</span>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 모듈에 대한 설명을 입력하세요"
              className="bg-secondary border-border resize-none"
            />
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label>필수 태그 키</Label>
              <Badge variant="outline">자동 포함</Badge>
            </div>

            {mandatoryKeys.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                활성화된 필수 태그 키가 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {mandatoryKeys.map((key) => (
                  <div key={key.id} className="flex items-center gap-2">
                    <Input
                      value={key.tagKey}
                      disabled
                      className="bg-secondary border-border flex-[0.8]"
                    />
                    <Input
                      placeholder="값 (선택)"
                      value={mandatoryValues[key.tagKey] ?? ""}
                      onChange={(e) =>
                        setMandatoryValues((prev) => ({
                          ...prev,
                          [key.tagKey]: e.target.value,
                        }))
                      }
                      className="bg-secondary border-border flex-1"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label>추가 태그 항목</Label>
              <Button variant="outline" size="sm" onClick={addTag}>
                <Plus className="h-4 w-4 mr-1" />
                항목 추가
              </Button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {tags.map((tag, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="키"
                    value={tag.key}
                    onChange={(e) => updateTag(index, "key", e.target.value)}
                    className="bg-secondary border-border flex-1"
                  />
                  <Input
                    placeholder="값"
                    value={tag.value}
                    onChange={(e) => updateTag(index, "value", e.target.value)}
                    className="bg-secondary border-border flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTag(index)}
                    className="h-10 w-10 shrink-0 text-destructive hover:text-destructive"
                    disabled={tags.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isEditMode ? "저장" : "생성"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
