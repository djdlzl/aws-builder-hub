import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { toast } from "sonner";
import { ModulePreview } from "@/components/modules/ModulePreview";
import { API_CONFIG, buildApiUrl } from "@/config/api";
import { useAWSContext } from "@/hooks/use-aws-context";

interface EC2Instance {
  id: string;
  name: string;
  type: string;
  status: "running" | "stopped" | "pending" | "terminated";
  publicIp: string;
  privateIp: string;
  az: string;
  accountName?: string;
  region?: string;
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

export default function EC2() {
  const [instances, setInstances] = useState<EC2Instance[]>([]);
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
    const fetchInstances = async () => {
      if (accounts.length === 0) {
        setIsLoading(false);
        return;
      }

      // Check if admin_demo user is logged in
      const isDemoAdmin =
        localStorage.getItem("cloudforge_auth_token") ===
        "mock-token-admin-demo";

      if (isDemoAdmin) {
        // Load dummy EC2 instances for admin_demo
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

        setInstances(dummyInstances);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          buildApiUrl(API_CONFIG.ENDPOINTS.AWS_RESOURCES.EC2),
          { headers: getAuthHeaders() }
        );
        if (response.ok) {
          const data = await response.json();
          const list = (data.results || []).map(
            (inst: {
              instanceId: string;
              name?: string;
              instanceType: string;
              state: string;
              publicIpAddress?: string;
              privateIpAddress?: string;
              availabilityZone: string;
              accountName: string;
              region: string;
            }) => ({
              id: inst.instanceId,
              name: inst.name || inst.instanceId,
              type: inst.instanceType,
              status: inst.state.toLowerCase(),
              publicIp: inst.publicIpAddress || "-",
              privateIp: inst.privateIpAddress || "-",
              az: inst.availabilityZone,
              accountName: inst.accountName,
              region: inst.region,
            })
          );
          setInstances(list);
        }
      } catch (error) {
        console.error("Failed to fetch EC2 instances:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInstances();
  }, [accounts]);
  const [createOpen, setCreateOpen] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const [instanceType, setInstanceType] = useState("");
  const [selectedModule, setSelectedModule] = useState("");

  const handleCreate = () => {
    if (!instanceName || !instanceType) {
      toast.error("필수 항목을 입력해주세요.");
      return;
    }
    toast.success("EC2 인스턴스 생성이 시작되었습니다.");
    setCreateOpen(false);
    setInstanceName("");
    setInstanceType("");
    setSelectedModule("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">EC2 인스턴스</h1>
          <p className="text-muted-foreground mt-1">
            가상 서버 인스턴스를 관리합니다
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            연결된 AWS 계정이 없습니다
          </h2>
          <p className="text-muted-foreground">AWS 계정을 먼저 연결해주세요.</p>
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
            가상 서버 인스턴스를 관리합니다
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
                  placeholder="예: web-server-prod-01"
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
                      t3.micro (1 vCPU, 1GB)
                    </SelectItem>
                    <SelectItem value="t3.small">
                      t3.small (2 vCPU, 2GB)
                    </SelectItem>
                    <SelectItem value="t3.medium">
                      t3.medium (2 vCPU, 4GB)
                    </SelectItem>
                    <SelectItem value="t3.large">
                      t3.large (2 vCPU, 8GB)
                    </SelectItem>
                    <SelectItem value="c5.xlarge">
                      c5.xlarge (4 vCPU, 8GB)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>모듈 적용</Label>
                <Select
                  value={selectedModule}
                  onValueChange={setSelectedModule}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="모듈 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="production-tags">
                      production-tags
                    </SelectItem>
                    <SelectItem value="staging-tags">staging-tags</SelectItem>
                    <SelectItem value="ec2-standard-options">
                      ec2-standard-options
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedModule && <ModulePreview moduleName={selectedModule} />}
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
            <SelectItem value="running">실행중</SelectItem>
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
                유형
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                상태
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                퍼블릭 IP
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                프라이빗 IP
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
                    <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Server className="h-4 w-4 text-orange-400" />
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
                  <Badge variant="outline" className="font-mono text-xs">
                    {instance.type}
                  </Badge>
                </td>
                <td className="px-4 py-4">
                  <Badge className={statusStyles[instance.status]}>
                    {statusLabels[instance.status]}
                  </Badge>
                </td>
                <td className="px-4 py-4">
                  <code className="text-sm font-mono text-foreground">
                    {instance.publicIp}
                  </code>
                </td>
                <td className="px-4 py-4">
                  <code className="text-sm font-mono text-muted-foreground">
                    {instance.privateIp}
                  </code>
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
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <RotateCcw className="h-4 w-4" />
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
    </div>
  );
}
