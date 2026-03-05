import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Plus,
  Server,
  Play,
  Square,
  RotateCcw,
  MoreHorizontal,
  Search,
  Loader2,
  AlertCircle,
  CalendarIcon,
  Clock,
  Terminal,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { SSMTerminal } from "@/components/terminal/SSMTerminal";
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
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface EC2Instance {
  id: string;
  name: string;
  type: string;
  status: "running" | "stopped" | "pending" | "terminated";
  publicIp: string;
  privateIp: string;
  az: string;
  accountId?: string;
  accountName?: string;
  region?: string;
  scheduledStopDate?: Date;
}

const statusStyles: Record<string, string> = {
  running: "bg-success/10 text-success border-success/20",
  stopped: "bg-muted text-muted-foreground border-muted",
  pending: "bg-warning/10 text-warning border-warning/20",
  terminated: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusLabels: Record<string, string> = {
  running: "실행중",
  stopped: "중지됨",
  pending: "대기중",
  terminated: "종료됨",
};

const instanceTypeLabels: Record<string, string> = {
  "t3.micro": "t3.micro",
  "t3.small": "t3.small",
  "t3.medium": "t3.medium",
  "t3.large": "t3.large",
  "c5.xlarge": "c5.xlarge",
};

const formatInstanceType = (type: string) => instanceTypeLabels[type] ?? type;

const COLUMN_WIDTHS_STORAGE_KEY = "ec2-column-widths";

// 기본 컬럼 너비 설정
const DEFAULT_COLUMN_WIDTHS = {
  name: 180,
  id: 200,
  type: 110,
  account: 180,
  status: 90,
  publicIp: 140,
  privateIp: 140,
  az: 160,
  action: 150,
};

type SortColumn = 'name' | 'id' | 'type' | 'account' | 'status' | 'publicIp' | 'privateIp' | 'az';
type SortDirection = 'asc' | 'desc' | null;

export default function EC2() {
  const [instances, setInstances] = useState<EC2Instance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const refreshPollRef = useRef<number | null>(null);
  const refreshAttemptsRef = useRef(0);
  const { accounts, selectedAccount, selectedRegion } = useAWSContext();

  // 컬럼 너비 상태 (localStorage에서 로드 또는 기본값)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_COLUMN_WIDTHS;
    } catch (error) {
      console.error("Failed to load column widths:", error);
      return DEFAULT_COLUMN_WIDTHS;
    }
  });

  // 정렬 상태
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // 컬럼 리사이즈
  const resizingRef = useRef<{
    key: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const handleResizeStart = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = columnWidths[key] || 100;
    resizingRef.current = { key, startX, startWidth };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (me: MouseEvent) => {
      if (!resizingRef.current) return;
      const minW = 60;
      const delta = me.clientX - resizingRef.current.startX;
      const newWidth = Math.max(minW, resizingRef.current.startWidth + delta);

      setColumnWidths((prev) => ({
        ...prev,
        [resizingRef.current!.key]: newWidth,
      }));
    };

    const onMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      if (resizingRef.current) {
        setColumnWidths((prev) => {
          localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(prev));
          return prev;
        });
      }
      resizingRef.current = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  // 컬럼 정렬 핸들러
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // 같은 컬럼 클릭: asc -> desc -> null 순환
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      // 다른 컬럼 클릭: 오름차순으로 시작
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("access_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const normalizeEc2Status = (state?: string): EC2Instance["status"] | null => {
    const normalized = state?.toLowerCase() ?? "";
    if (normalized === "running") return "running";
    if (normalized === "pending") return "pending";
    if (normalized === "stopped" || normalized === "stopping") return "stopped";
    if (normalized === "terminated" || normalized === "shutting-down") {
      return null;
    }
    return null;
  };

  const fetchInstances = useCallback(
    async (showToast = false, forceRefresh = false) => {
      const isDemoAdmin =
        localStorage.getItem("access_token") ===
        "mock-token-admin-demo";
      const isMockAdmin =
        localStorage.getItem("access_token") === "mock-token-admin";

      if (isDemoAdmin) {
        const dummyInstances: EC2Instance[] = [
          {
            id: "i-1234567890abcdef0",
            name: "demo-web-server-01",
            type: "t3.medium",
            status: "running",
            publicIp: "54.180.1.100",
            privateIp: "10.0.1.100",
            az: "ap-northeast-2a",
            accountName: "Demo Production Account",
            region: "ap-northeast-2",
          },
          {
            id: "i-0987654321fedcba0",
            name: "demo-app-server-01",
            type: "t3.large",
            status: "running",
            publicIp: "54.180.1.101",
            privateIp: "10.0.1.101",
            az: "ap-northeast-2b",
            accountName: "Demo Production Account",
            region: "ap-northeast-2",
          },
          {
            id: "i-abcdef1234567890",
            name: "demo-dev-server-01",
            type: "t3.micro",
            status: "stopped",
            publicIp: "-",
            privateIp: "10.0.2.50",
            az: "ap-northeast-2a",
            accountName: "Demo Development Account",
            region: "ap-northeast-2",
          },
          {
            id: "i-fedcba0987654321",
            name: "demo-dev-server-02",
            type: "t3.small",
            status: "running",
            publicIp: "54.180.1.102",
            privateIp: "10.0.2.51",
            az: "ap-northeast-2c",
            accountName: "Demo Development Account",
            region: "ap-northeast-2",
          },
          {
            id: "i-1234567890abcde0",
            name: "demo-staging-server",
            type: "t3.medium",
            status: "pending",
            publicIp: "-",
            privateIp: "10.0.3.100",
            az: "ap-northeast-2a",
            accountName: "Demo Staging Account",
            region: "ap-northeast-2",
          },
          {
            id: "i-0987654321abcde0",
            name: "demo-batch-server-01",
            type: "c5.xlarge",
            status: "running",
            publicIp: "54.180.1.103",
            privateIp: "10.0.1.200",
            az: "ap-northeast-2b",
            accountName: "Demo Production Account",
            region: "ap-northeast-2",
          },
          {
            id: "i-abcdef1234fedcba0",
            name: "demo-test-server-01",
            type: "t3.micro",
            status: "stopped",
            publicIp: "-",
            privateIp: "10.0.2.52",
            az: "ap-northeast-2a",
            accountName: "Demo Development Account",
            region: "ap-northeast-2",
          },
          {
            id: "i-5678901234abcdefg",
            name: "demo-db-server-01",
            type: "t3.large",
            status: "running",
            publicIp: "54.180.1.104",
            privateIp: "10.0.1.150",
            az: "ap-northeast-2c",
            accountName: "Demo Production Account",
            region: "ap-northeast-2",
          },
        ];
        const filtered = selectedAccount
          ? dummyInstances.filter((i) => i.accountName === selectedAccount.name)
          : dummyInstances;
        setInstances(filtered);
        setIsLoading(false);
        setIsRefreshing(false);
        if (showToast) toast.success("EC2 instances refreshed");
        return;
      }

      if (isMockAdmin) {
        const dummyInstances: EC2Instance[] = [
          {
            id: "i-1111111111111111",
            name: "prod-web-server-01",
            type: "t3.medium",
            status: "running",
            publicIp: "54.180.1.10",
            privateIp: "10.0.1.10",
            az: "ap-northeast-2a",
            accountName: "Production Account",
            region: "ap-northeast-2",
          },
          {
            id: "i-2222222222222222",
            name: "prod-app-server-01",
            type: "t3.large",
            status: "running",
            publicIp: "54.180.1.11",
            privateIp: "10.0.1.11",
            az: "ap-northeast-2b",
            accountName: "Production Account",
            region: "ap-northeast-2",
          },
        ];
        const filtered = selectedAccount
          ? dummyInstances.filter((i) => i.accountName === selectedAccount.name)
          : dummyInstances;
        setInstances(filtered);
        setIsLoading(false);
        setIsRefreshing(false);
        if (showToast) toast.success("EC2 instances refreshed");
        return;
      }

      if (accounts.length === 0) {
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      try {
        const listEndpoint = API_CONFIG.ENDPOINTS.AWS_RESOURCES.EC2;
        const listResponse = await fetch(buildApiUrl(listEndpoint), {
          method: "GET",
          headers: getAuthHeaders(),
        });
        if (listResponse.ok) {
          const data = await listResponse.json();
          const list = (data.results || [])
            .map(
              (inst: {
                instanceId: string;
                name?: string;
                instanceType: string;
                state: string;
                publicIpAddress?: string;
                privateIpAddress?: string;
                availabilityZone: string;
                accountId: string;
                accountName: string;
                region: string;
              }) => {
                const status = normalizeEc2Status(inst.state);
                if (!status) return null;
                return {
                  id: inst.instanceId,
                  name: inst.name || inst.instanceId,
                  type: inst.instanceType,
                  status,
                  publicIp: inst.publicIpAddress || "-",
                  privateIp: inst.privateIpAddress || "-",
                  az: inst.availabilityZone,
                  accountId: inst.accountId,
                  accountName: inst.accountName,
                  region: inst.region,
                };
              },
            )
            .filter((item): item is EC2Instance => item !== null);

          // Filter by selected account if set
          const filtered = selectedAccount
            ? list.filter(
                (i: EC2Instance) => i.accountId === selectedAccount.accountId,
              )
            : list;

          // Filter by selected region if set
          const filteredByRegion = selectedRegion
            ? filtered.filter(
                (i: EC2Instance) => i.region === selectedRegion.code,
              )
            : filtered;

          setInstances(filteredByRegion);
          if (!forceRefresh && showToast) {
            toast.success("EC2 instances refreshed");
          }
        }
      } catch (error) {
        console.error("Failed to fetch EC2 instances:", error);
        if (showToast) toast.error("Failed to refresh EC2 instances");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [accounts, selectedAccount, selectedRegion],
  );

  const stopRefreshPolling = useCallback(() => {
    if (refreshPollRef.current !== null) {
      window.clearInterval(refreshPollRef.current);
      refreshPollRef.current = null;
    }
    refreshAttemptsRef.current = 0;
  }, []);

  const startRefreshPolling = useCallback(() => {
    const statusEndpoint = API_CONFIG.ENDPOINTS.AWS_RESOURCES.EC2_REFRESH_STATUS;
    if (refreshPollRef.current !== null) {
      return;
    }

    refreshPollRef.current = window.setInterval(async () => {
      refreshAttemptsRef.current += 1;
      if (refreshAttemptsRef.current > 60) {
        stopRefreshPolling();
        setIsRefreshing(false);
        return;
      }

      try {
        const statusResponse = await fetch(buildApiUrl(statusEndpoint), {
          headers: getAuthHeaders(),
        });
        if (!statusResponse.ok) {
          throw new Error("Failed to fetch refresh status");
        }
        const statusData = await statusResponse.json();
        const inProgress = statusData?.result?.inProgress ?? false;
        if (!inProgress) {
          stopRefreshPolling();
          await fetchInstances(false, false);
          setIsRefreshing(false);
        }
      } catch (error) {
        console.error("Failed to poll EC2 refresh status:", error);
        stopRefreshPolling();
        setIsRefreshing(false);
      }
    }, 5000);
  }, [fetchInstances, stopRefreshPolling]);

  const triggerBackgroundRefresh = useCallback(
    async (showToast: boolean) => {
      if (accounts.length === 0) {
        return;
      }
      setIsRefreshing(true);
      const refreshEndpoint = API_CONFIG.ENDPOINTS.AWS_RESOURCES.EC2_REFRESH;
      try {
        const refreshResponse = await fetch(buildApiUrl(refreshEndpoint), {
          method: "POST",
          headers: getAuthHeaders(),
        });
        if (!refreshResponse.ok) {
          if (showToast) toast.error("Failed to refresh EC2 instances");
          setIsRefreshing(false);
          return;
        }
        if (showToast) toast.success("EC2 instances refreshed");
        startRefreshPolling();
      } catch (error) {
        console.error("Failed to start EC2 refresh:", error);
        if (showToast) toast.error("Failed to refresh EC2 instances");
        setIsRefreshing(false);
      }
    },
    [accounts.length, startRefreshPolling],
  );

  const handleRefresh = async () => {
    await triggerBackgroundRefresh(true);
  };

  useEffect(() => {
    fetchInstances();
    triggerBackgroundRefresh(false);
    return () => {
      stopRefreshPolling();
    };
  }, [fetchInstances, stopRefreshPolling, triggerBackgroundRefresh]);

  // Filtered and sorted instances based on search, filters, and sort
  const filteredInstances = useMemo(() => {
    let result = instances.filter((inst) => {
      const matchesSearch =
        searchQuery === "" ||
        inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inst.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inst.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inst.publicIp.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inst.privateIp.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || inst.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // 정렬 적용
    if (sortColumn && sortDirection) {
      result = [...result].sort((a, b) => {
        let aValue: string | number = '';
        let bValue: string | number = '';

        switch (sortColumn) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'id':
            aValue = a.id.toLowerCase();
            bValue = b.id.toLowerCase();
            break;
          case 'type':
            aValue = a.type.toLowerCase();
            bValue = b.type.toLowerCase();
            break;
          case 'account':
            aValue = (a.accountName || '').toLowerCase();
            bValue = (b.accountName || '').toLowerCase();
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          case 'publicIp':
            aValue = a.publicIp.toLowerCase();
            bValue = b.publicIp.toLowerCase();
            break;
          case 'privateIp':
            aValue = a.privateIp.toLowerCase();
            bValue = b.privateIp.toLowerCase();
            break;
          case 'az':
            aValue = a.az.toLowerCase();
            bValue = b.az.toLowerCase();
            break;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [instances, searchQuery, statusFilter, sortColumn, sortDirection]);

  // Get unique account names for filter
  const uniqueAccounts = useMemo(() => {
    return [
      ...new Set(instances.map((inst) => inst.accountName).filter(Boolean)),
    ];
  }, [instances]);
  const [createOpen, setCreateOpen] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const [instanceType, setInstanceType] = useState("");
  const [templateOptions, setTemplateOptions] = useState<
    InstanceTemplateResponse[]
  >([]);
  const [moduleOptions, setModuleOptions] = useState<ModuleDetailResponse[]>(
    [],
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

  // 중지 예약 다이얼로그 상태
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<EC2Instance | null>(
    null,
  );
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    undefined,
  );
  const [scheduledTime, setScheduledTime] = useState("18:00");

  // 터미널 확장 상태 - 열려있는 인스턴스 추적
  const [expandedTerminalId, setExpandedTerminalId] = useState<string | null>(
    null,
  );

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
              template.isActive && template.templateType === "INSTANCE",
          ),
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
      templateDefaults.modules.map((module) => module.moduleId),
    );
    setSelectedModuleIds((prev) =>
      prev.filter((moduleId) => !templateModuleIds.has(moduleId)),
    );
  }, [templateDefaults]);

  useEffect(() => {
    const selectedModules = selectedModuleIds
      .map((moduleId) => moduleOptions.find((module) => module.id === moduleId))
      .filter((module): module is ModuleDetailResponse => module !== undefined);
    const sources = [] as ReturnType<typeof toProvisioningDefaultsSource>[];
    if (selectedModules.length > 0) {
      sources.push(
        ...selectedModules.map((module) =>
          toProvisioningDefaultsSource(module),
        ),
      );
    }
    if (templateDefaults) {
      sources.push(
        ...templateDefaults.modules.map((module) =>
          toProvisioningDefaultsSource(module),
        ),
      );
    }
    const merged = mergeProvisioningDefaults(sources);
    setProvisioningDefaults(merged);
    setProvisioningState(merged);
  }, [templateDefaults, selectedModuleIds, moduleOptions]);

  useEffect(() => {
    if (provisioningDefaults.instanceOptions?.instanceType) {
      setInstanceType(provisioningDefaults.instanceOptions.instanceType);
    }
  }, [provisioningDefaults]);

  const handleTagChange = (tagKey: string, value: string) => {
    setProvisioningState((prev) => ({
      ...prev,
      tags: prev.tags.map((tag) =>
        tag.tagKey === tagKey ? { ...tag, tagValue: value } : tag,
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

  const handleOpenTerminal = (instance: EC2Instance) => {
    // 터미널 토글 - 같은 인스턴스를 클릭하면 닫기
    if (expandedTerminalId === instance.id) {
      setExpandedTerminalId(null);
    } else {
      setExpandedTerminalId(instance.id);
    }
  };

  const handleCloseTerminal = () => {
    setExpandedTerminalId(null);
  };

  const handleCreate = () => {
    const missingMandatoryTags = provisioningState.tags.filter(
      (tag) => tag.isMandatory && !tag.tagValue?.trim(),
    ).length;
    if (missingMandatoryTags > 0) {
      toast.error("필수 태그 값을 입력해주세요.");
      return;
    }
    if (!selectedTemplateId) {
      toast.error("템플릿을 선택해주세요.");
      return;
    }
    if (!instanceName || !instanceType) {
      toast.error("필수 항목을 입력해주세요.");
      return;
    }
    toast.success("EC2 인스턴스 생성이 시작되었습니다.");
    setCreateOpen(false);
    setInstanceName("");
    setInstanceType("");
    setSelectedTemplateId("");
    setSelectedModuleIds([]);
    setTemplateDefaults(null);
    setProvisioningDefaults(emptyProvisioningState);
    setProvisioningState(emptyProvisioningState);
  };

  const handleScheduleStop = (instance: EC2Instance) => {
    setSelectedInstance(instance);
    setScheduledDate(instance.scheduledStopDate || undefined);
    setScheduleDialogOpen(true);
  };

  const handleSaveSchedule = () => {
    if (!scheduledDate || !selectedInstance) {
      toast.error("날짜를 선택해주세요.");
      return;
    }

    // Update instance with scheduled stop date
    setInstances((prev) =>
      prev.map((inst) =>
        inst.id === selectedInstance.id
          ? { ...inst, scheduledStopDate: scheduledDate }
          : inst,
      ),
    );

    toast.success(
      `${selectedInstance.name} 인스턴스의 Stop 예정일이 설정되었습니다.`,
    );
    setScheduleDialogOpen(false);
    setSelectedInstance(null);
    setScheduledDate(undefined);
  };

  const handleCancelSchedule = () => {
    if (!selectedInstance) return;

    setInstances((prev) =>
      prev.map((inst) =>
        inst.id === selectedInstance.id
          ? { ...inst, scheduledStopDate: undefined }
          : inst,
      ),
    );

    toast.success(
      `${selectedInstance.name} 인스턴스의 Stop 예정이 취소되었습니다.`,
    );
    setScheduleDialogOpen(false);
    setSelectedInstance(null);
    setScheduledDate(undefined);
  };

  const selectedTemplate = templateOptions.find(
    (template) => template.id === Number(selectedTemplateId),
  );
  const selectedModules = selectedModuleIds
    .map((moduleId) => moduleOptions.find((module) => module.id === moduleId))
    .filter((module): module is ModuleDetailResponse => module !== undefined);
  const availableModules = useMemo(() => {
    if (!templateDefaults) {
      return moduleOptions;
    }
    const templateModuleIds = new Set(
      templateDefaults.modules.map((module) => module.moduleId),
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 데모/모의 관리자 여부 확인 - 계정이 없어도 인스턴스 표시
  const isDemoOrMockAdmin =
    localStorage.getItem("access_token") === "mock-token-admin-demo" ||
    localStorage.getItem("access_token") === "mock-token-admin";

  if (accounts.length === 0 && !isDemoOrMockAdmin) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">EC2 인스턴스</h1>
          <p className="text-muted-foreground mt-1">
            EC2 인스턴스를 관리합니다
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            연결된 클라우드 계정이 없습니다
          </h2>
          <p className="text-muted-foreground">
            클라우드 계정을 먼저 연결해주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">EC2 인스턴스</h1>
          <p className="text-muted-foreground mt-1">
            EC2 인스턴스를 관리합니다
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
                새 EC2 인스턴스 생성
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                새로운 EC2 인스턴스를 생성합니다.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">인스턴스 이름</Label>
                <Input
                  id="name"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  placeholder="예: 운영-웹-서버-01"
                  className="bg-secondary border-border"
                />
              </div>

              <div className="grid gap-2">
                <Label>인스턴스 유형</Label>
                <Select value={instanceType} onValueChange={setInstanceType}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="유형 선택" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="t3.micro">
                      티3 마이크로 (가상 처리장치 1개, 메모리 1기가바이트)
                    </SelectItem>
                    <SelectItem value="t3.small">
                      티3 스몰 (가상 처리장치 2개, 메모리 2기가바이트)
                    </SelectItem>
                    <SelectItem value="t3.medium">
                      티3 미디엄 (가상 처리장치 2개, 메모리 4기가바이트)
                    </SelectItem>
                    <SelectItem value="t3.large">
                      티3 라지 (가상 처리장치 2개, 메모리 8기가바이트)
                    </SelectItem>
                    <SelectItem value="c5.xlarge">
                      씨5 엑스라지 (가상 처리장치 4개, 메모리 8기가바이트)
                    </SelectItem>
                  </SelectContent>
                </Select>
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
                              id={`ec2-module-${module.id}`}
                              checked={isChecked}
                              onCheckedChange={(checked) =>
                                handleToggleModule(module.id, Boolean(checked))
                              }
                            />
                            <Label
                              htmlFor={`ec2-module-${module.id}`}
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

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="인스턴스 검색 (이름, ID, 타입, IP)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary border-border"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 bg-secondary border-border">
            <SelectValue placeholder="상태 필터" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="running">실행중</SelectItem>
            <SelectItem value="stopped">중지됨</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {/* 이름 */}
              <th className="relative px-4 py-3 text-left" style={{ width: columnWidths.name }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('name')}
                  className="h-auto p-0 hover:bg-transparent text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  <span className="flex items-center gap-1">
                    이름 ({filteredInstances.length})
                    {sortColumn === 'name' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </span>
                </Button>
                <div className="absolute right-0 top-0 h-full w-1 flex items-center justify-center cursor-col-resize group hover:bg-primary/10 z-10" onMouseDown={(e) => handleResizeStart("name", e)}>
                  <div className="w-px h-full bg-border group-hover:bg-primary transition-colors" />
                </div>
              </th>
              {/* ID */}
              <th className="relative px-4 py-3 text-left" style={{ width: columnWidths.id }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('id')}
                  className="h-auto p-0 hover:bg-transparent text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  <span className="flex items-center gap-1">
                    인스턴스 ID
                    {sortColumn === 'id' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </span>
                </Button>
                <div className="absolute right-0 top-0 h-full w-1 flex items-center justify-center cursor-col-resize group hover:bg-primary/10 z-10" onMouseDown={(e) => handleResizeStart("id", e)}>
                  <div className="w-px h-full bg-border group-hover:bg-primary transition-colors" />
                </div>
              </th>
              {/* 타입 */}
              <th className="relative px-4 py-3 text-left" style={{ width: columnWidths.type }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('type')}
                  className="h-auto p-0 hover:bg-transparent text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  <span className="flex items-center gap-1">
                    타입
                    {sortColumn === 'type' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </span>
                </Button>
                <div className="absolute right-0 top-0 h-full w-1 flex items-center justify-center cursor-col-resize group hover:bg-primary/10 z-10" onMouseDown={(e) => handleResizeStart("type", e)}>
                  <div className="w-px h-full bg-border group-hover:bg-primary transition-colors" />
                </div>
              </th>
              {/* 계정 */}
              <th className="relative px-4 py-3 text-left" style={{ width: columnWidths.account }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('account')}
                  className="h-auto p-0 hover:bg-transparent text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  <span className="flex items-center gap-1">
                    계정
                    {sortColumn === 'account' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </span>
                </Button>
                <div className="absolute right-0 top-0 h-full w-1 flex items-center justify-center cursor-col-resize group hover:bg-primary/10 z-10" onMouseDown={(e) => handleResizeStart("account", e)}>
                  <div className="w-px h-full bg-border group-hover:bg-primary transition-colors" />
                </div>
              </th>
              {/* 상태 */}
              <th className="relative px-4 py-3 text-left" style={{ width: columnWidths.status }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('status')}
                  className="h-auto p-0 hover:bg-transparent text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  <span className="flex items-center gap-1">
                    상태
                    {sortColumn === 'status' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </span>
                </Button>
                <div className="absolute right-0 top-0 h-full w-1 flex items-center justify-center cursor-col-resize group hover:bg-primary/10 z-10" onMouseDown={(e) => handleResizeStart("status", e)}>
                  <div className="w-px h-full bg-border group-hover:bg-primary transition-colors" />
                </div>
              </th>
              {/* Public IP */}
              <th className="relative px-4 py-3 text-left" style={{ width: columnWidths.publicIp }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('publicIp')}
                  className="h-auto p-0 hover:bg-transparent text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  <span className="flex items-center gap-1">
                    Public IP
                    {sortColumn === 'publicIp' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </span>
                </Button>
                <div className="absolute right-0 top-0 h-full w-1 flex items-center justify-center cursor-col-resize group hover:bg-primary/10 z-10" onMouseDown={(e) => handleResizeStart("publicIp", e)}>
                  <div className="w-px h-full bg-border group-hover:bg-primary transition-colors" />
                </div>
              </th>
              {/* Private IP */}
              <th className="relative px-4 py-3 text-left" style={{ width: columnWidths.privateIp }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('privateIp')}
                  className="h-auto p-0 hover:bg-transparent text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  <span className="flex items-center gap-1">
                    Private IP
                    {sortColumn === 'privateIp' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </span>
                </Button>
                <div className="absolute right-0 top-0 h-full w-1 flex items-center justify-center cursor-col-resize group hover:bg-primary/10 z-10" onMouseDown={(e) => handleResizeStart("privateIp", e)}>
                  <div className="w-px h-full bg-border group-hover:bg-primary transition-colors" />
                </div>
              </th>
              {/* 가용영역 */}
              <th className="relative px-4 py-3 text-left" style={{ width: columnWidths.az }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('az')}
                  className="h-auto p-0 hover:bg-transparent text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  <span className="flex items-center gap-1">
                    가용영역
                    {sortColumn === 'az' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </span>
                </Button>
                <div className="absolute right-0 top-0 h-full w-1 flex items-center justify-center cursor-col-resize group hover:bg-primary/10 z-10" onMouseDown={(e) => handleResizeStart("az", e)}>
                  <div className="w-px h-full bg-border group-hover:bg-primary transition-colors" />
                </div>
              </th>
              {/* 액션 */}
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap text-right" style={{ width: columnWidths.action }}>
                액션
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredInstances.map((instance) => (
              <>
                <tr
                  key={instance.id}
                  className={`hover:bg-accent/50 transition-colors ${
                    expandedTerminalId === instance.id ? "bg-accent/30" : ""
                  }`}
                >
                  <td className="px-4 py-4" style={{ width: columnWidths.name }}>
                    <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                      <div className="h-9 w-9 shrink-0 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <Server className="h-4 w-4 text-orange-400" />
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">
                        {instance.name}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4" style={{ width: columnWidths.id }}>
                    <code className="text-xs font-mono text-muted-foreground truncate block">
                      {instance.id}
                    </code>
                  </td>
                  <td className="px-4 py-4" style={{ width: columnWidths.type }}>
                    <Badge variant="outline" className="font-mono text-xs whitespace-nowrap">
                      {instance.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 overflow-hidden" style={{ width: columnWidths.account }}>
                    <span className="text-sm text-muted-foreground truncate block">
                      {instance.accountName || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-4" style={{ width: columnWidths.status }}>
                    <Badge className={`${statusStyles[instance.status]} whitespace-nowrap`}>
                      {statusLabels[instance.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-4" style={{ width: columnWidths.publicIp }}>
                    <code className="text-sm font-mono text-foreground truncate block">
                      {instance.publicIp}
                    </code>
                  </td>
                  <td className="px-4 py-4" style={{ width: columnWidths.privateIp }}>
                    <code className="text-sm font-mono text-muted-foreground truncate block">
                      {instance.privateIp}
                    </code>
                  </td>
                  <td className="px-4 py-4 overflow-hidden" style={{ width: columnWidths.az }}>
                    <span className="text-sm text-muted-foreground truncate block">
                      {instance.az}
                    </span>
                  </td>
                  <td className="px-4 py-4" style={{ width: columnWidths.action }}>
                    <div className="flex items-center justify-end gap-1">
                      {instance.scheduledStopDate && (
                        <Badge
                          variant="outline"
                          className="mr-2 text-xs bg-warning/10 text-warning border-warning/20"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {format(instance.scheduledStopDate, "MM/dd HH:mm")}
                        </Badge>
                      )}
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
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-popover border-border"
                        >
                          <DropdownMenuItem
                            onClick={() => handleOpenTerminal(instance)}
                            disabled={instance.status !== "running"}
                          >
                            <Terminal className="h-4 w-4 mr-2" />
                            {expandedTerminalId === instance.id
                              ? "터미널 닫기"
                              : "터미널 (원격 관리)"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleScheduleStop(instance)}
                          >
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            중지 예정일 설정
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
                {/* 터미널 확장 행 */}
                {expandedTerminalId === instance.id && (
                  <tr key={`${instance.id}-terminal`}>
                    <td colSpan={9} className="p-0">
                      <div
                        className="border-t border-border bg-background animate-in slide-in-from-top-2 duration-200 overflow-hidden"
                        style={{ height: "700px" }}
                      >
                        {selectedAccount ? (
                          <SSMTerminal
                            instanceId={instance.id}
                            accountId={instance.accountId ?? selectedAccount.accountId}
                            instanceName={instance.name}
                            onClose={handleCloseTerminal}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            계정을 선택해주세요
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* 중지 예정일 설정 다이얼로그 */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              중지 예정일 설정
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedInstance?.name} 인스턴스의 자동 중지 예정일을 설정합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>예정 날짜</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-secondary border-border"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate
                      ? format(scheduledDate, "PPP", { locale: ko })
                      : "날짜 선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 bg-popover border-border"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label>예정 시간</Label>
              <Select value={scheduledTime} onValueChange={setScheduledTime}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border max-h-48">
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = i.toString().padStart(2, "0");
                    return (
                      <SelectItem key={hour} value={`${hour}:00`}>
                        {hour}:00
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedInstance?.scheduledStopDate && (
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                <p className="text-sm text-warning">
                  현재 설정된 예정일:{" "}
                  {format(selectedInstance.scheduledStopDate, "PPP p", {
                    locale: ko,
                  })}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {selectedInstance?.scheduledStopDate && (
              <Button variant="destructive" onClick={handleCancelSchedule}>
                예정 취소
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setScheduleDialogOpen(false)}
            >
              닫기
            </Button>
            <Button onClick={handleSaveSchedule}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
