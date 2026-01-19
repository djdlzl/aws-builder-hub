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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { MandatoryTagKey } from "@/types/module";
import type {
  CreateInstanceTemplatePayload,
  InstanceTemplateType,
  ModuleDetailResponse,
  ProvisioningModuleType,
} from "@/types/provisioning";
import { Loader2 } from "lucide-react";

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modules: ModuleDetailResponse[];
  mandatoryKeys: MandatoryTagKey[];
  isLoading?: boolean;
  onCreate: (payload: CreateInstanceTemplatePayload) => Promise<void>;
  onUpdate?: (payload: CreateInstanceTemplatePayload) => Promise<void>;
  initialValues?: TemplateFormValues | null;
  isSubmitting?: boolean;
}

interface TemplateFormValues {
  name: string;
  description?: string | null;
  templateType: InstanceTemplateType;
  moduleIds: number[];
  mandatoryTagKeys: string[];
}

const templateTypeOptions: Array<{
  value: InstanceTemplateType;
  label: string;
}> = [
  { value: "INSTANCE", label: "인스턴스" },
  { value: "LAMBDA", label: "람다" },
  { value: "VPC", label: "가상 사설망" },
];

const moduleTypeLabel: Record<ProvisioningModuleType, string> = {
  TAG: "태그",
  SECURITY_GROUP: "보안 그룹",
  NETWORK: "네트워크",
  AMI: "머신 이미지",
  KEYPAIR: "키페어",
  VOLUME: "볼륨",
  USER_DATA: "유저 데이터",
  INSTANCE_OPTION: "인스턴스 옵션",
  OPTION: "옵션",
};

const moduleTypeBadge: Record<ProvisioningModuleType, string> = {
  TAG: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  SECURITY_GROUP: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  NETWORK: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  AMI: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  KEYPAIR: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  VOLUME: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  USER_DATA: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  INSTANCE_OPTION: "bg-green-500/10 text-green-400 border-green-500/20",
  OPTION: "bg-pink-500/10 text-pink-400 border-pink-500/20",
};

export function CreateTemplateDialog({
  open,
  onOpenChange,
  modules,
  mandatoryKeys,
  isLoading = false,
  onCreate,
  onUpdate,
  initialValues,
  isSubmitting = false,
}: CreateTemplateDialogProps) {
  const { toast } = useToast();
  const isEditMode = Boolean(initialValues);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateType, setTemplateType] =
    useState<InstanceTemplateType>("INSTANCE");
  const [selectedModuleIds, setSelectedModuleIds] = useState<number[]>([]);
  const [selectedMandatoryKeys, setSelectedMandatoryKeys] = useState<string[]>(
    []
  );

  const selectedSet = useMemo(
    () => new Set(selectedModuleIds),
    [selectedModuleIds]
  );

  const selectedOrderMap = useMemo(() => {
    return new Map(selectedModuleIds.map((id, index) => [id, index + 1]));
  }, [selectedModuleIds]);

  const sortedModules = useMemo(() => {
    return modules
      .slice()
      .sort((a, b) =>
        a.moduleType === b.moduleType
          ? a.name.localeCompare(b.name)
          : a.moduleType.localeCompare(b.moduleType)
      );
  }, [modules]);

  const sortedMandatoryKeys = mandatoryKeys
    .slice()
    .sort((a, b) => a.tagKey.localeCompare(b.tagKey));

  useEffect(() => {
    if (!open) {
      return;
    }
    if (initialValues) {
      setName(initialValues.name);
      setDescription(initialValues.description ?? "");
      setTemplateType(initialValues.templateType);
      setSelectedModuleIds(initialValues.moduleIds);
      setSelectedMandatoryKeys(initialValues.mandatoryTagKeys);
      return;
    }
    setName("");
    setDescription("");
    setTemplateType("INSTANCE");
    setSelectedModuleIds([]);
    setSelectedMandatoryKeys([]);
  }, [initialValues, open]);

  const toggleModule = (moduleId: number, checked: boolean) => {
    setSelectedModuleIds((prev) => {
      if (checked) {
        if (prev.includes(moduleId)) {
          return prev;
        }
        return [...prev, moduleId];
      }
      return prev.filter((id) => id !== moduleId);
    });
  };

  const toggleMandatoryKey = (tagKey: string, checked: boolean) => {
    setSelectedMandatoryKeys((prev) => {
      if (checked) {
        return prev.includes(tagKey) ? prev : [...prev, tagKey];
      }
      return prev.filter((key) => key !== tagKey);
    });
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({
        title: "입력 오류",
        description: "템플릿 이름을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (selectedModuleIds.length === 0) {
      toast({
        title: "입력 오류",
        description: "모듈을 하나 이상 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    const payload: CreateInstanceTemplatePayload = {
      name: trimmedName,
      description: description.trim() || null,
      templateType,
      mandatoryTagKeys:
        templateType === "INSTANCE" ? selectedMandatoryKeys : [],
      modules: selectedModuleIds.map((moduleId, index) => ({
        moduleId,
        sortOrder: index,
      })),
    };

    try {
      const submitAction = isEditMode ? onUpdate : onCreate;
      if (!submitAction) {
        toast({
          title: "처리 실패",
          description: "수정 작업을 진행할 수 없습니다.",
          variant: "destructive",
        });
        return;
      }
      await submitAction(payload);
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
      <DialogContent className="sm:max-w-[760px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {isEditMode ? "템플릿 수정" : "새 템플릿 생성"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEditMode
              ? "템플릿 유형과 모듈 구성을 수정합니다."
              : "템플릿 유형과 모듈 구성을 지정해 새 템플릿을 만듭니다."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="template-name">템플릿 이름</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 운영-인스턴스-01"
              className="bg-secondary border-border"
            />
          </div>

          <div className="grid gap-2">
            <Label>템플릿 유형</Label>
            <Select
              value={templateType}
              onValueChange={(value) =>
                setTemplateType(value as InstanceTemplateType)
              }
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="템플릿 유형 선택" />
              </SelectTrigger>
              <SelectContent>
                {templateTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="template-description">설명</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="템플릿의 목적이나 사용 범위를 입력하세요"
              className="bg-secondary border-border resize-none"
            />
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label>필수 태그 키</Label>
              <Badge variant="outline">
                {selectedMandatoryKeys.length}개 선택
              </Badge>
            </div>

            {templateType !== "INSTANCE" ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                인스턴스 템플릿에서만 필수 태그 키를 지정할 수 있습니다.
              </div>
            ) : sortedMandatoryKeys.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                활성화된 필수 태그 키가 없습니다.
              </div>
            ) : (
              <ScrollArea className="h-[180px] rounded-lg border border-border bg-background/40">
                <div className="space-y-2 p-3">
                  {sortedMandatoryKeys.map((key) => {
                    const isChecked = selectedMandatoryKeys.includes(
                      key.tagKey
                    );
                    return (
                      <div
                        key={key.id}
                        className={`flex items-start gap-3 rounded-md border px-3 py-2 transition-colors ${
                          isChecked
                            ? "border-primary/40 bg-primary/5"
                            : "border-border bg-background"
                        }`}
                      >
                        <Checkbox
                          id={`template-mandatory-${key.id}`}
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            toggleMandatoryKey(key.tagKey, Boolean(checked))
                          }
                        />
                        <Label
                          htmlFor={`template-mandatory-${key.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="text-sm font-medium text-foreground">
                            {key.tagKey}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {key.description || "설명이 없습니다."}
                          </p>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label>모듈 선택</Label>
              <Badge variant="outline">{selectedModuleIds.length}개 선택</Badge>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                모듈을 불러오는 중입니다.
              </div>
            ) : sortedModules.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                선택 가능한 모듈이 없습니다.
              </div>
            ) : (
              <ScrollArea className="h-[260px] rounded-lg border border-border bg-background/40">
                <div className="space-y-2 p-3">
                  {sortedModules.map((module) => {
                    const isChecked = selectedSet.has(module.id);
                    const order = selectedOrderMap.get(module.id);
                    return (
                      <div
                        key={module.id}
                        className={`flex items-start gap-3 rounded-md border px-3 py-2 transition-colors ${
                          isChecked
                            ? "border-primary/40 bg-primary/5"
                            : "border-border bg-background"
                        }`}
                      >
                        <Checkbox
                          id={`template-module-${module.id}`}
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            toggleModule(module.id, Boolean(checked))
                          }
                        />
                        <Label
                          htmlFor={`template-module-${module.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              className={`text-[10px] ${
                                moduleTypeBadge[module.moduleType]
                              }`}
                            >
                              {moduleTypeLabel[module.moduleType]}
                            </Badge>
                            <span className="text-sm font-medium text-foreground">
                              {module.name}
                            </span>
                            {order && (
                              <Badge variant="outline" className="text-[10px]">
                                순서 {order}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {module.description || "설명이 없습니다."}
                          </p>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? "수정 중..." : "생성 중..."}
              </>
            ) : isEditMode ? (
              "템플릿 수정"
            ) : (
              "템플릿 생성"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
