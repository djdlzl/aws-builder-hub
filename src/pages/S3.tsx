import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Search,
  MoreHorizontal,
  Upload,
  Layers,
  Lock,
  Globe,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ModulePreview } from "@/components/modules/ModulePreview";
import { API_CONFIG, buildApiUrl } from "@/config/api";
import { useAWSContext } from "@/hooks/use-aws-context";
import {
  fetchInstanceTemplates,
  fetchProvisioningModules,
  fetchTemplateDefaults,
} from "@/lib/api/provisioning-defaults";
import {
  emptyProvisioningState,
  mergeProvisioningDefaults,
  toProvisioningDefaultsSource,
} from "@/lib/provisioning";
import type {
  InstanceTemplateResponse,
  ModuleDetailResponse,
  ProvisioningFormState,
  TemplateDefaultResponse,
} from "@/types/provisioning";

interface S3Bucket {
  name: string;
  region: string;
  createdAt: string;
  accountName?: string;
}

const regionLabels: Record<string, string> = {
  "ap-northeast-2": "아시아 태평양(서울)",
  "ap-northeast-1": "아시아 태평양(도쿄)",
  "us-east-1": "미국 동부(버지니아 북부)",
  "eu-west-1": "유럽(아일랜드)",
};

const formatRegionLabel = (region?: string) =>
  regionLabels[region ?? ""] ?? "기타 리전";

export default function S3() {
  const [buckets, setBuckets] = useState<S3Bucket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { accounts } = useAWSContext();

  const getAuthHeaders = () => {
    const token = localStorage.getItem("access_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  useEffect(() => {
    const fetchBuckets = async () => {
      if (accounts.length === 0) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch(
          buildApiUrl(API_CONFIG.ENDPOINTS.AWS_RESOURCES.S3),
          { headers: getAuthHeaders() }
        );
        if (response.ok) {
          const data = await response.json();
          const list = (data.results || []).map(
            (b: {
              name: string;
              creationDate?: string;
              region?: string;
              accountName: string;
            }) => ({
              name: b.name,
              region: b.region || "us-east-1",
              createdAt: b.creationDate
                ? new Date(b.creationDate).toLocaleDateString()
                : "-",
              accountName: b.accountName,
            })
          );
          setBuckets(list);
        }
      } catch (error) {
        console.error("오브젝트 스토리지 버킷을 불러오지 못했습니다:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBuckets();
  }, [accounts]);
  const [createOpen, setCreateOpen] = useState(false);
  const [bucketName, setBucketName] = useState("");
  const [bucketRegion, setBucketRegion] = useState("");
  const [accessType, setAccessType] = useState("");
  const [templateOptions, setTemplateOptions] = useState<
    InstanceTemplateResponse[]
  >([]);
  const [moduleOptions, setModuleOptions] = useState<ModuleDetailResponse[]>(
    []
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedModuleIds, setSelectedModuleIds] = useState<number[]>([]);
  const [templateDefaults, setTemplateDefaults] =
    useState<TemplateDefaultResponse | null>(null);
  const [defaultsLoading, setDefaultsLoading] = useState(false);
  const [defaultsError, setDefaultsError] = useState<string | null>(null);
  const [provisioningState, setProvisioningState] =
    useState<ProvisioningFormState>(emptyProvisioningState);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [modules, templates] = await Promise.all([
          fetchProvisioningModules(),
          fetchInstanceTemplates(),
        ]);
        setModuleOptions(modules.filter((module) => module.isActive));
        setTemplateOptions(
          templates.filter(
            (template) =>
              template.isActive && template.templateType === "INSTANCE"
          )
        );
      } catch (error) {
        console.error("프로비저닝 기본값을 불러오지 못했습니다:", error);
        toast.error("프로비저닝 기본값을 불러오지 못했습니다.");
      }
    };
    loadOptions();
  }, []);

  useEffect(() => {
    const loadTemplateDefaults = async () => {
      if (!selectedTemplateId) {
        setTemplateDefaults(null);
        setDefaultsError(null);
        setDefaultsLoading(false);
        return;
      }
      setDefaultsLoading(true);
      setDefaultsError(null);
      setTemplateDefaults(null);
      try {
        const detail = await fetchTemplateDefaults(Number(selectedTemplateId));
        setTemplateDefaults(detail);
      } catch (error) {
        console.error("템플릿 기본값을 불러오지 못했습니다:", error);
        setDefaultsError("템플릿 기본값을 불러오지 못했습니다.");
        toast.error("템플릿 기본값을 불러오지 못했습니다.");
      } finally {
        setDefaultsLoading(false);
      }
    };
    loadTemplateDefaults();
  }, [selectedTemplateId]);

  useEffect(() => {
    if (!templateDefaults) {
      return;
    }
    const templateModuleIds = new Set(
      templateDefaults.modules.map((module) => module.moduleId)
    );
    setSelectedModuleIds((prev) =>
      prev.filter((moduleId) => !templateModuleIds.has(moduleId))
    );
  }, [templateDefaults]);

  useEffect(() => {
    const selectedModules = selectedModuleIds
      .map((moduleId) => moduleOptions.find((module) => module.id === moduleId))
      .filter((module): module is ModuleDetailResponse => module !== undefined);
    const sources = [] as ReturnType<typeof toProvisioningDefaultsSource>[];
    if (selectedModules.length > 0) {
      sources.push(
        ...selectedModules.map((module) => toProvisioningDefaultsSource(module))
      );
    }
    if (templateDefaults) {
      sources.push(
        ...templateDefaults.modules.map((module) =>
          toProvisioningDefaultsSource(module)
        )
      );
    }
    const merged = mergeProvisioningDefaults(sources);
    setProvisioningState(merged);
  }, [templateDefaults, selectedModuleIds, moduleOptions]);

  const handleTagChange = (tagKey: string, value: string) => {
    setProvisioningState((prev) => ({
      ...prev,
      tags: prev.tags.map((tag) =>
        tag.tagKey === tagKey ? { ...tag, tagValue: value } : tag
      ),
    }));
  };

  const handleToggleModule = (moduleId: number, checked: boolean) => {
    setSelectedModuleIds((prev) => {
      if (checked) {
        return prev.includes(moduleId) ? prev : [...prev, moduleId];
      }
      return prev.filter((id) => id !== moduleId);
    });
  };

  const handleCreate = () => {
    const missingMandatoryTags = provisioningState.tags.filter(
      (tag) => tag.isMandatory && !tag.tagValue?.trim()
    ).length;
    if (missingMandatoryTags > 0) {
      toast.error("필수 태그 값을 입력해주세요.");
      return;
    }
    if (!selectedTemplateId) {
      toast.error("템플릿을 선택해주세요.");
      return;
    }
    if (!bucketName || !bucketRegion) {
      toast.error("필수 항목을 입력해주세요.");
      return;
    }
    toast.success("버킷 생성이 완료되었습니다.");
    setCreateOpen(false);
    setBucketName("");
    setBucketRegion("");
    setAccessType("");
    setSelectedTemplateId("");
    setSelectedModuleIds([]);
    setTemplateDefaults(null);
    setProvisioningState(emptyProvisioningState);
  };

  const selectedTemplate = templateOptions.find(
    (template) => template.id === Number(selectedTemplateId)
  );
  const selectedModules = selectedModuleIds
    .map((moduleId) => moduleOptions.find((module) => module.id === moduleId))
    .filter((module): module is ModuleDetailResponse => module !== undefined);
  const availableModules = useMemo(() => {
    if (!templateDefaults) {
      return moduleOptions;
    }
    const templateModuleIds = new Set(
      templateDefaults.modules.map((module) => module.moduleId)
    );
    return moduleOptions.filter((module) => !templateModuleIds.has(module.id));
  }, [moduleOptions, templateDefaults]);
  const selectedModuleNames = selectedModules.map((module) => module.name);
  const previewSubtitle = selectedTemplate
    ? selectedModuleNames.length > 0
      ? `${selectedTemplate.name} + ${selectedModuleNames.join(", ")}`
      : selectedTemplate.name
    : selectedModuleNames.length > 0
    ? selectedModuleNames.join(", ")
    : undefined;

  const handleUpload = () => {
    toast.success("파일 업로드가 시작되었습니다.");
  };

  const handleDownload = (key: string) => {
    toast.success(`${key} 다운로드가 시작되었습니다.`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            오브젝트 스토리지 버킷
          </h1>
          <p className="text-muted-foreground mt-1">
            오브젝트 스토리지 버킷을 관리합니다
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              버킷 생성
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                새 오브젝트 스토리지 버킷 생성
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                새로운 오브젝트 스토리지 버킷을 생성합니다.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="bucket-name">버킷 이름</Label>
                <Input
                  id="bucket-name"
                  value={bucketName}
                  onChange={(e) => setBucketName(e.target.value)}
                  placeholder="예: 운영-에셋-버킷"
                  className="bg-secondary border-border"
                />
                <p className="text-xs text-muted-foreground">
                  버킷 이름은 전역적으로 고유해야 합니다
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>리전</Label>
                  <Select value={bucketRegion} onValueChange={setBucketRegion}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="리전 선택" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="ap-northeast-2">
                        아시아 태평양(서울)
                      </SelectItem>
                      <SelectItem value="ap-northeast-1">
                        아시아 태평양(도쿄)
                      </SelectItem>
                      <SelectItem value="us-east-1">
                        미국 동부(버지니아 북부)
                      </SelectItem>
                      <SelectItem value="eu-west-1">유럽(아일랜드)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>접근 권한</Label>
                  <Select value={accessType} onValueChange={setAccessType}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="권한 선택" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="private">프라이빗</SelectItem>
                      <SelectItem value="public">퍼블릭</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>템플릿 적용</Label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={setSelectedTemplateId}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="템플릿 선택 (필수)" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {templateOptions.length === 0 ? (
                      <SelectItem value="empty" disabled>
                        등록된 템플릿 없음
                      </SelectItem>
                    ) : (
                      templateOptions.map((template) => (
                        <SelectItem
                          key={template.id}
                          value={String(template.id)}
                        >
                          {template.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {templateDefaults && (
                <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">필수 태그</span>
                    {templateDefaults.mandatoryTagKeys.length === 0 ? (
                      <span className="text-muted-foreground">없음</span>
                    ) : (
                      templateDefaults.mandatoryTagKeys.map((key) => (
                        <Badge
                          key={key}
                          variant="outline"
                          className="text-[10px]"
                        >
                          {key}
                        </Badge>
                      ))
                    )}
                  </div>
                  {templateDefaults.mandatoryTagKeys.length > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      필수 태그 값은 프로비저닝 기본값에서 입력해야 합니다.
                    </p>
                  )}
                </div>
              )}

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>모듈 추가</Label>
                  <Badge variant="outline">
                    {selectedModuleIds.length}개 선택
                  </Badge>
                </div>
                {availableModules.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    추가 가능한 모듈이 없습니다.
                  </div>
                ) : (
                  <ScrollArea className="h-[200px] rounded-lg border border-border bg-secondary/30">
                    <div className="space-y-2 p-3">
                      {availableModules.map((module) => {
                        const isChecked = selectedModuleIds.includes(module.id);
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
                              id={`s3-module-${module.id}`}
                              checked={isChecked}
                              onCheckedChange={(checked) =>
                                handleToggleModule(module.id, Boolean(checked))
                              }
                            />
                            <Label
                              htmlFor={`s3-module-${module.id}`}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {module.moduleType}
                                </Badge>
                                <span className="text-sm font-medium text-foreground">
                                  {module.name}
                                </span>
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

              {defaultsError && (
                <p className="text-xs text-destructive">{defaultsError}</p>
              )}

              <ModulePreview
                title="프로비저닝 기본값"
                subtitle={previewSubtitle}
                state={provisioningState}
                isLoading={defaultsLoading}
                onTagChange={handleTagChange}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                취소
              </Button>
              <Button onClick={handleCreate}>생성</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="buckets" className="space-y-4">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="buckets">버킷 목록</TabsTrigger>
          <TabsTrigger value="browser">파일 브라우저</TabsTrigger>
        </TabsList>

        <TabsContent value="buckets" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="버킷 검색..."
                className="pl-10 bg-secondary border-border"
              />
            </div>
          </div>

          {buckets.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">표시할 버킷이 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {buckets.map((bucket) => (
                <div
                  key={bucket.name}
                  className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-glow cursor-pointer"
                  onClick={() => setSelectedBucket(bucket.name)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <Layers className="h-5 w-5 text-green-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {bucket.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {formatRegionLabel(bucket.region)}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <Lock className="h-3 w-3" />
                      프라이빗
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">계정</p>
                      <p className="font-medium text-foreground">
                        {bucket.accountName}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">생성일</p>
                      <p className="font-medium text-foreground">
                        {bucket.createdAt}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="browser" className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              파일 브라우저 기능은 준비 중입니다.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
