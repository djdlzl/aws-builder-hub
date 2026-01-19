import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import {
  createInstanceTemplate,
  fetchInstanceTemplates,
  fetchProvisioningModules,
  fetchTemplateDefaults,
  updateInstanceTemplate,
} from "@/lib/api/provisioning-defaults";
import { fetchActiveMandatoryTagKeys } from "@/lib/api/tag-modules";
import type {
  InstanceTemplateResponse,
  InstanceTemplateType,
  ModuleDetailResponse,
  ProvisioningInstanceOptions,
  ProvisioningModuleType,
  ProvisioningSecurityGroupRule,
  ProvisioningTag,
  TemplateDefaultResponse,
  TemplateModuleDefaultResponse,
} from "@/types/provisioning";
import type { MandatoryTagKey } from "@/types/module";
import { AlertCircle, Loader2, Plus, RefreshCcw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { CreateTemplateDialog } from "@/components/templates/CreateTemplateDialog";

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

type TemplateFormValues = {
  name: string;
  description?: string | null;
  templateType: InstanceTemplateType;
  moduleIds: number[];
  mandatoryTagKeys: string[];
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

const templateTypeLabel: Record<InstanceTemplateType, string> = {
  INSTANCE: "인스턴스",
  LAMBDA: "람다",
  VPC: "가상 사설망",
};

const formatBoolean = (value?: boolean | null) =>
  value === null || value === undefined ? "-" : value ? "사용" : "미사용";

const formatSecurityRule = (rule: ProvisioningSecurityGroupRule) => {
  const portRange =
    rule.fromPort !== null && rule.fromPort !== undefined
      ? rule.toPort !== null && rule.toPort !== undefined
        ? `${rule.fromPort}-${rule.toPort}`
        : `${rule.fromPort}`
      : "";

  return [
    rule.direction,
    rule.protocol,
    portRange,
    rule.cidr,
    rule.sourceSecurityGroupId,
    rule.description,
  ]
    .filter((value) => value !== null && value !== undefined && value !== "")
    .join(" · ");
};

const instanceOptionLabels: Array<{
  key: keyof ProvisioningInstanceOptions;
  label: string;
}> = [
  { key: "instanceType", label: "인스턴스 타입" },
  { key: "ebsOptimized", label: "스토리지 최적화" },
  { key: "monitoring", label: "모니터링" },
  { key: "tenancy", label: "테넌시" },
  { key: "cpuCredits", label: "처리장치 크레딧" },
  { key: "iamInstanceProfileArn", label: "역할 프로파일 식별자" },
  { key: "hibernationEnabled", label: "최대 절전" },
];

const renderTagList = (tags: ProvisioningTag[]) => (
  <div className="space-y-2">
    {tags.map((tag) => (
      <div
        key={tag.tagKey}
        className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{tag.tagKey}</span>
          {tag.isMandatory && (
            <Badge variant="outline" className="text-[10px]">
              필수
            </Badge>
          )}
        </div>
        <span className="text-muted-foreground">{tag.tagValue ?? "-"}</span>
      </div>
    ))}
  </div>
);

const renderDetailSection = (
  title: string,
  content: React.ReactNode,
  empty?: boolean
) => {
  if (empty) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {content}
    </div>
  );
};

const renderModuleDetails = (module: TemplateModuleDefaultResponse) => {
  const hasTags = module.tags.length > 0;
  const hasSecurityGroups = module.securityGroups.length > 0;
  const hasSecurityGroupRules = module.securityGroupRules.length > 0;
  const hasNetworkConfig = Boolean(module.networkConfig);
  const hasNetworkSubnets = module.networkSubnets.length > 0;
  const hasAmi = Boolean(module.amiConfig);
  const hasKeypair = Boolean(module.keypairConfig);
  const hasUserData = Boolean(module.userData?.content);
  const hasInstanceOptions = Boolean(module.instanceOptions);
  const hasVolumes = module.volumeItems.length > 0;

  return (
    <div className="space-y-4">
      {renderDetailSection("태그", renderTagList(module.tags), !hasTags)}

      {renderDetailSection(
        "보안 그룹",
        <div className="space-y-2">
          {module.securityGroups.map((group) => (
            <div
              key={group.securityGroupId}
              className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
            >
              <span className="font-medium text-foreground">
                {group.securityGroupId}
              </span>
              <span className="text-xs text-muted-foreground">
                우선순위 {group.sortOrder}
              </span>
            </div>
          ))}
        </div>,
        !hasSecurityGroups
      )}

      {renderDetailSection(
        "보안 그룹 규칙",
        <div className="space-y-2">
          {module.securityGroupRules.map((rule, index) => (
            <div
              key={`${rule.direction}-${rule.protocol}-${index}`}
              className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm text-muted-foreground"
            >
              {formatSecurityRule(rule)}
            </div>
          ))}
        </div>,
        !hasSecurityGroupRules
      )}

      {renderDetailSection(
        "네트워크",
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2">
            <span className="text-muted-foreground">가상 사설망</span>
            <span className="font-medium text-foreground">
              {module.networkConfig?.vpcId ?? "-"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2">
            <span className="text-muted-foreground">공인 주소</span>
            <span className="font-medium text-foreground">
              {formatBoolean(module.networkConfig?.assignPublicIp)}
            </span>
          </div>
        </div>,
        !hasNetworkConfig
      )}

      {renderDetailSection(
        "서브넷",
        <div className="space-y-2">
          {module.networkSubnets.map((subnet) => (
            <div
              key={subnet.subnetId}
              className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
            >
              <span className="font-medium text-foreground">
                {subnet.subnetId}
              </span>
              <span className="text-xs text-muted-foreground">
                우선순위 {subnet.sortOrder}
              </span>
            </div>
          ))}
        </div>,
        !hasNetworkSubnets
      )}

      {renderDetailSection(
        "머신 이미지",
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2">
            <span className="text-muted-foreground">이미지 식별자</span>
            <span className="font-medium text-foreground">
              {module.amiConfig?.amiId ?? "-"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2">
            <span className="text-muted-foreground">아키텍처</span>
            <span className="font-medium text-foreground">
              {module.amiConfig?.architecture ?? "-"}
            </span>
          </div>
        </div>,
        !hasAmi
      )}

      {renderDetailSection(
        "키페어",
        <div className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2 text-sm">
          <span className="text-muted-foreground">키페어</span>
          <span className="font-medium text-foreground">
            {module.keypairConfig?.keypairName ?? "-"}
          </span>
        </div>,
        !hasKeypair
      )}

      {renderDetailSection(
        "유저 데이터",
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2 text-sm">
            <span className="text-muted-foreground">타입</span>
            <span className="font-medium text-foreground">
              {module.userData?.contentType ?? "-"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2 text-sm">
            <span className="text-muted-foreground">베이스64</span>
            <span className="font-medium text-foreground">
              {formatBoolean(module.userData?.isBase64)}
            </span>
          </div>
          <pre className="max-h-40 overflow-auto rounded-md border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap">
            {module.userData?.content || "-"}
          </pre>
        </div>,
        !hasUserData
      )}

      {renderDetailSection(
        "인스턴스 옵션",
        <div className="space-y-2">
          {instanceOptionLabels
            .map(({ key, label }) => {
              const value = module.instanceOptions?.[key];
              if (value === undefined || value === null || value === "") {
                return null;
              }
              return (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">
                    {typeof value === "boolean" ? formatBoolean(value) : value}
                  </span>
                </div>
              );
            })
            .filter(Boolean)}
        </div>,
        !hasInstanceOptions
      )}

      {renderDetailSection(
        "볼륨",
        <div className="space-y-2">
          {module.volumeItems.map((volume) => (
            <div
              key={volume.deviceName}
              className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">
                  {volume.deviceName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {volume.sizeGb}GB · {volume.volumeType}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>IOPS: {volume.iops ?? "-"}</span>
                <span>Throughput: {volume.throughput ?? "-"}</span>
                <span>암호화: {formatBoolean(volume.encrypted)}</span>
                <span>루트: {formatBoolean(volume.isRoot)}</span>
              </div>
            </div>
          ))}
        </div>,
        !hasVolumes
      )}
    </div>
  );
};

export default function Templates() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [templates, setTemplates] = useState<InstanceTemplateResponse[]>([]);
  const [modules, setModules] = useState<ModuleDetailResponse[]>([]);
  const [mandatoryKeys, setMandatoryKeys] = useState<MandatoryTagKey[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null
  );
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateDefaultResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModulesLoading, setIsModulesLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogInitialValues, setDialogInitialValues] =
    useState<TemplateFormValues | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      const list = await fetchInstanceTemplates();
      setTemplates(list);
      if (list.length > 0) {
        setSelectedTemplateId((prev) => prev ?? list[0].id);
      } else {
        setSelectedTemplateId(null);
        setSelectedTemplate(null);
      }
    } catch (error) {
      toast({
        title: "템플릿 로딩 실패",
        description:
          error instanceof Error
            ? error.message
            : "템플릿 목록을 불러오지 못했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const loadModules = useCallback(async () => {
    try {
      setIsModulesLoading(true);
      const [list, mandatoryList] = await Promise.all([
        fetchProvisioningModules(),
        fetchActiveMandatoryTagKeys(),
      ]);
      setModules(list);
      setMandatoryKeys(mandatoryList);
    } catch (error) {
      toast({
        title: "모듈 로딩 실패",
        description:
          error instanceof Error
            ? error.message
            : "모듈 목록을 불러오지 못했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsModulesLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  useEffect(() => {
    if (!dialogOpen) {
      setDialogInitialValues(null);
      setEditingTemplateId(null);
    }
  }, [dialogOpen]);

  useEffect(() => {
    if (selectedTemplateId === null) {
      setSelectedTemplate(null);
      return;
    }

    const loadDetails = async () => {
      try {
        setIsDetailLoading(true);
        const detail = await fetchTemplateDefaults(selectedTemplateId);
        setSelectedTemplate(detail);
      } catch (error) {
        toast({
          title: "상세 로딩 실패",
          description:
            error instanceof Error
              ? error.message
              : "템플릿 상세를 불러오지 못했습니다.",
          variant: "destructive",
        });
      } finally {
        setIsDetailLoading(false);
      }
    };

    loadDetails();
  }, [selectedTemplateId, toast]);

  const selectedSummary = useMemo(() => {
    return templates.find((template) => template.id === selectedTemplateId);
  }, [selectedTemplateId, templates]);

  const activeModules = useMemo(() => {
    return modules.filter((module) => module.isActive);
  }, [modules]);

  const handleCreate = useCallback(
    async (payload: Parameters<typeof createInstanceTemplate>[0]) => {
      setIsSubmitting(true);
      try {
        const created = await createInstanceTemplate(payload);
        toast({
          title: "템플릿 생성 완료",
          description: "새 템플릿이 등록되었습니다.",
        });
        setSelectedTemplateId(created.id);
        await loadTemplates();
      } finally {
        setIsSubmitting(false);
      }
    },
    [loadTemplates, toast]
  );

  const handleUpdate = useCallback(
    async (payload: Parameters<typeof updateInstanceTemplate>[1]) => {
      if (!editingTemplateId) {
        toast({
          title: "수정 실패",
          description: "수정할 템플릿을 찾을 수 없습니다.",
          variant: "destructive",
        });
        return;
      }
      setIsSubmitting(true);
      try {
        const updated = await updateInstanceTemplate(
          editingTemplateId,
          payload
        );
        toast({
          title: "템플릿 수정 완료",
          description: "템플릿 정보가 업데이트되었습니다.",
        });
        await loadTemplates();
        setSelectedTemplateId(updated.id);
        try {
          const detail = await fetchTemplateDefaults(updated.id);
          setSelectedTemplate(detail);
        } catch (error) {
          toast({
            title: "상세 로딩 실패",
            description:
              error instanceof Error
                ? error.message
                : "템플릿 상세를 불러오지 못했습니다.",
            variant: "destructive",
          });
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingTemplateId, loadTemplates, toast]
  );

  const handleOpenCreate = () => {
    setDialogInitialValues(null);
    setEditingTemplateId(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = () => {
    if (!selectedTemplate) {
      return;
    }
    const moduleIds = selectedTemplate.modules
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((module) => module.moduleId);
    setDialogInitialValues({
      name: selectedTemplate.name,
      description: selectedTemplate.description ?? "",
      templateType: selectedTemplate.templateType,
      moduleIds,
      mandatoryTagKeys: selectedTemplate.mandatoryTagKeys,
    });
    setEditingTemplateId(selectedTemplate.id);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">템플릿</h1>
          <p className="text-muted-foreground mt-1">
            모듈 조합과 기본값을 관리합니다
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              템플릿 생성
            </Button>
          )}
          <Button variant="outline" onClick={loadTemplates}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-[680px]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">템플릿 목록</CardTitle>
            <CardDescription>등록된 템플릿을 선택하세요.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                템플릿이 아직 없습니다.
              </div>
            ) : (
              <ScrollArea className="h-[520px]">
                <div className="space-y-3 pr-3">
                  {templates.map((template) => {
                    const isSelected = template.id === selectedTemplateId;
                    const moduleCount = template.modules?.length ?? 0;
                    const mandatoryKeys = template.mandatoryTagKeys ?? [];
                    const previewKeys = mandatoryKeys.slice(0, 3);
                    const moreCount = mandatoryKeys.length - previewKeys.length;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedTemplateId(template.id)}
                        className={`w-full text-left rounded-lg border px-4 py-3 transition-all ${
                          isSelected
                            ? "border-primary/50 bg-primary/5 shadow-glow"
                            : "border-border bg-card hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-foreground">
                            {template.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              {templateTypeLabel[template.templateType]}
                            </Badge>
                            <Badge
                              className={
                                template.isActive
                                  ? "bg-success/10 text-success border-success/20"
                                  : "bg-muted text-muted-foreground border-border"
                              }
                            >
                              {template.isActive ? "활성" : "비활성"}
                            </Badge>
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {template.description || "설명이 없습니다."}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="text-muted-foreground">
                            필수 태그
                          </span>
                          {mandatoryKeys.length === 0 ? (
                            <span className="text-muted-foreground">없음</span>
                          ) : (
                            <>
                              {previewKeys.map((key) => (
                                <Badge
                                  key={key}
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {key}
                                </Badge>
                              ))}
                              {moreCount > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  +{moreCount}
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          모듈 {moduleCount}개 · 수정일{" "}
                          {new Date(template.updatedAt).toLocaleDateString(
                            "ko-KR"
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="h-[680px]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">템플릿 상세</CardTitle>
            <CardDescription>
              선택한 템플릿의 모듈 구성과 기본값을 확인합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {isDetailLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !selectedTemplate ? (
              <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-60" />
                템플릿을 선택하면 상세 정보를 확인할 수 있습니다.
              </div>
            ) : (
              <ScrollArea className="h-[520px] pr-3">
                <div className="space-y-6">
                  <div className="rounded-lg border border-border bg-background/40 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">템플릿</p>
                        <h2 className="text-xl font-semibold text-foreground">
                          {selectedTemplate.name}
                        </h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                          유형:{" "}
                          {templateTypeLabel[selectedTemplate.templateType]}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            selectedTemplate.isActive
                              ? "bg-success/10 text-success border-success/20"
                              : "bg-muted text-muted-foreground border-border"
                          }
                        >
                          {selectedTemplate.isActive ? "활성" : "비활성"}
                        </Badge>
                        {isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleOpenEdit}
                          >
                            수정
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {selectedTemplate.description || "설명이 없습니다."}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-muted-foreground">필수 태그:</span>
                      {selectedTemplate.mandatoryTagKeys.length === 0 ? (
                        <span className="text-muted-foreground">없음</span>
                      ) : (
                        selectedTemplate.mandatoryTagKeys.map((key) => (
                          <Badge key={key} variant="outline">
                            {key}
                          </Badge>
                        ))
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>
                        생성자: {selectedTemplate.createdBy.name} (
                        {selectedTemplate.createdBy.email})
                      </span>
                      <span>
                        생성일:{" "}
                        {new Date(
                          selectedTemplate.createdAt
                        ).toLocaleDateString("ko-KR")}
                      </span>
                      <span>
                        수정일:{" "}
                        {new Date(
                          selectedTemplate.updatedAt
                        ).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-foreground">
                      모듈 구성
                    </h3>
                    {selectedTemplate.modules.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                        연결된 모듈이 없습니다.
                      </div>
                    ) : (
                      <Accordion type="multiple" className="w-full">
                        {selectedTemplate.modules
                          .slice()
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((module) => (
                            <AccordionItem
                              key={module.id}
                              value={`module-${module.id}`}
                              className="border border-border rounded-lg mb-3"
                            >
                              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                <div className="flex items-center gap-3 text-left">
                                  <Badge
                                    className={`text-xs ${
                                      moduleTypeBadge[module.moduleType]
                                    }`}
                                  >
                                    {moduleTypeLabel[module.moduleType]}
                                  </Badge>
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">
                                      {module.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      우선순위 {module.sortOrder}
                                    </p>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4">
                                {renderModuleDetails(module)}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                      </Accordion>
                    )}
                  </div>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedSummary && (
        <p className="text-xs text-muted-foreground">
          선택된 템플릿: {selectedSummary.name}
        </p>
      )}

      {isAdmin && (
        <CreateTemplateDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          modules={activeModules}
          mandatoryKeys={mandatoryKeys}
          isLoading={isModulesLoading}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          initialValues={dialogInitialValues}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
