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
  Database,
  Search,
  MoreHorizontal,
  Play,
  Square,
  Copy,
  Camera,
  RefreshCcw,
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

interface RDSInstance {
  id: string;
  name: string;
  engine: string;
  engineVersion: string;
  instanceClass: string;
  status: string;
  endpoint: string;
  az: string;
  storage: string;
  accountName?: string;
  region?: string;
}

const statusStyles = {
  available: "bg-success/10 text-success border-success/20",
  stopped: "bg-muted text-muted-foreground border-muted",
  starting: "bg-warning/10 text-warning border-warning/20",
  stopping: "bg-warning/10 text-warning border-warning/20",
  creating: "bg-primary/10 text-primary border-primary/20",
};

const statusLabels: Record<string, string> = {
  available: "사용가능",
  stopped: "중지됨",
  starting: "시작중",
  stopping: "중지중",
  creating: "생성중",
};

const engineLabels: Record<string, string> = {
  mysql: "마이에스큐엘",
  postgres: "포스트그레에스큐엘",
  postgresql: "포스트그레에스큐엘",
  mariadb: "마리아디비",
  "aurora-mysql": "오로라 마이에스큐엘",
  "aurora-postgres": "오로라 포스트그레에스큐엘",
  "aurora-postgresql": "오로라 포스트그레에스큐엘",
};

const instanceClassLabels: Record<string, string> = {
  "db.t3.micro": "티3 마이크로",
  "db.t3.small": "티3 스몰",
  "db.t3.medium": "티3 미디엄",
  "db.r5.large": "알5 라지",
  "db.r5.xlarge": "알5 엑스라지",
};

const formatEngine = (engine: string) =>
  engineLabels[engine] ?? "알 수 없는 엔진";

const formatInstanceClass = (instanceClass: string) =>
  instanceClassLabels[instanceClass] ?? "알 수 없는 클래스";

export default function RDS() {
  const [instances, setInstances] = useState<RDSInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { accounts } = useAWSContext();
  const [createOpen, setCreateOpen] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const [engine, setEngine] = useState("");
  const [instanceClass, setInstanceClass] = useState("");
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
  const [provisioningDefaults, setProvisioningDefaults] =
    useState<ProvisioningFormState>(emptyProvisioningState);
  const [provisioningState, setProvisioningState] =
    useState<ProvisioningFormState>(emptyProvisioningState);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("access_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  useEffect(() => {
    const fetchInstances = async () => {
      if (accounts.length === 0) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch(
          buildApiUrl(API_CONFIG.ENDPOINTS.AWS_RESOURCES.RDS),
          { headers: getAuthHeaders() }
        );
        if (response.ok) {
          const data = await response.json();
          const list = (data.results || []).map(
            (inst: {
              dbInstanceIdentifier: string;
              dbInstanceClass: string;
              engine: string;
              engineVersion: string;
              status: string;
              endpoint?: string;
              port?: number;
              availabilityZone?: string;
              allocatedStorage: number;
              accountName: string;
              region: string;
            }) => ({
              id: inst.dbInstanceIdentifier,
              name: inst.dbInstanceIdentifier,
              engine: inst.engine,
              engineVersion: inst.engineVersion,
              instanceClass: inst.dbInstanceClass,
              status: inst.status,
              endpoint: inst.endpoint ? `${inst.endpoint}:${inst.port}` : "-",
              az: inst.availabilityZone || "-",
              storage: `${inst.allocatedStorage}기가바이트`,
              accountName: inst.accountName,
              region: inst.region,
            })
          );
          setInstances(list);
        }
      } catch (error) {
        console.error(
          "관계형 데이터베이스 인스턴스를 불러오지 못했습니다:",
          error
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchInstances();
  }, [accounts]);

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
    setProvisioningDefaults(merged);
    setProvisioningState(merged);
  }, [templateDefaults, selectedModuleIds, moduleOptions]);

  useEffect(() => {
    if (provisioningDefaults.instanceOptions?.instanceType) {
      setInstanceClass(provisioningDefaults.instanceOptions.instanceType);
    }
  }, [provisioningDefaults]);

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
    if (!instanceName || !engine || !instanceClass) {
      toast.error("필수 항목을 입력해주세요.");
      return;
    }
    toast.success("관계형 데이터베이스 인스턴스 생성이 시작되었습니다.");
    setCreateOpen(false);
    setInstanceName("");
    setEngine("");
    setInstanceClass("");
    setSelectedTemplateId("");
    setSelectedModuleIds([]);
    setTemplateDefaults(null);
    setProvisioningDefaults(emptyProvisioningState);
    setProvisioningState(emptyProvisioningState);
  };

  const handleSnapshot = (instanceId: string) => {
    toast.success(`${instanceId} 스냅샷 생성이 시작되었습니다.`);
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            관계형 데이터베이스
          </h1>
          <p className="text-muted-foreground mt-1">
            관계형 데이터베이스 인스턴스를 관리합니다
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              인스턴스 생성
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                새 관계형 데이터베이스 인스턴스 생성
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                새로운 관계형 데이터베이스 인스턴스를 생성합니다.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">인스턴스 이름</Label>
                <Input
                  id="name"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  placeholder="예: 운영-데이터베이스-01"
                  className="bg-secondary border-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>데이터베이스 엔진</Label>
                  <Select value={engine} onValueChange={setEngine}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="엔진 선택" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="mysql">마이에스큐엘 8.0</SelectItem>
                      <SelectItem value="postgres">
                        포스트그레에스큐엘 15
                      </SelectItem>
                      <SelectItem value="mariadb">마리아디비 10.6</SelectItem>
                      <SelectItem value="aurora-mysql">
                        오로라 마이에스큐엘
                      </SelectItem>
                      <SelectItem value="aurora-postgres">
                        오로라 포스트그레에스큐엘
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>인스턴스 클래스</Label>
                  <Select
                    value={instanceClass}
                    onValueChange={setInstanceClass}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="클래스 선택" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="db.t3.micro">
                        티3 마이크로 (가상 처리장치 2개, 메모리 1기가바이트)
                      </SelectItem>
                      <SelectItem value="db.t3.small">
                        티3 스몰 (가상 처리장치 2개, 메모리 2기가바이트)
                      </SelectItem>
                      <SelectItem value="db.t3.medium">
                        티3 미디엄 (가상 처리장치 2개, 메모리 4기가바이트)
                      </SelectItem>
                      <SelectItem value="db.r5.large">
                        알5 라지 (가상 처리장치 2개, 메모리 16기가바이트)
                      </SelectItem>
                      <SelectItem value="db.r5.xlarge">
                        알5 엑스라지 (가상 처리장치 4개, 메모리 32기가바이트)
                      </SelectItem>
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
                              id={`rds-module-${module.id}`}
                              checked={isChecked}
                              onCheckedChange={(checked) =>
                                handleToggleModule(module.id, Boolean(checked))
                              }
                            />
                            <Label
                              htmlFor={`rds-module-${module.id}`}
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

      <Tabs defaultValue="instances" className="space-y-4">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="instances">인스턴스</TabsTrigger>
          <TabsTrigger value="snapshots">스냅샷</TabsTrigger>
        </TabsList>

        <TabsContent value="instances" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="인스턴스 검색..."
                className="pl-10 bg-secondary border-border"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-40 bg-secondary border-border">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="available">사용가능</SelectItem>
                <SelectItem value="stopped">중지됨</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    인스턴스
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    엔진
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    클래스
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    스토리지
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    가용영역
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {instances.map((instance) => (
                  <tr
                    key={instance.id}
                    className="hover:bg-accent/50 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Database className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {instance.name}
                          </p>
                          <code className="text-xs font-mono text-muted-foreground">
                            {instance.id}
                          </code>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm text-foreground">
                          {formatEngine(instance.engine)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {instance.engineVersion}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant="outline" className="font-mono text-xs">
                        {formatInstanceClass(instance.instanceClass)}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={statusStyles[instance.status]}>
                        {statusLabels[instance.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-foreground">
                        {instance.storage}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-muted-foreground">
                        {instance.az}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {instance.status === "stopped" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-success hover:text-success"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-warning hover:text-warning"
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleSnapshot(instance.name)}
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="snapshots" className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              스냅샷 기능은 준비 중입니다.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
