import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export default function RDS() {
  const [instances, setInstances] = useState<RDSInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { accounts } = useAWSContext();
  const [createOpen, setCreateOpen] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const [engine, setEngine] = useState("");
  const [instanceClass, setInstanceClass] = useState("");
  const [selectedModule, setSelectedModule] = useState("");

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
              storage: `${inst.allocatedStorage} GB`,
              accountName: inst.accountName,
              region: inst.region,
            })
          );
          setInstances(list);
        }
      } catch (error) {
        console.error("Failed to fetch RDS instances:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInstances();
  }, [accounts]);

  const handleCreate = () => {
    if (!instanceName || !engine || !instanceClass) {
      toast.error("필수 항목을 입력해주세요.");
      return;
    }
    toast.success("RDS 인스턴스 생성이 시작되었습니다.");
    setCreateOpen(false);
    setInstanceName("");
    setEngine("");
    setInstanceClass("");
    setSelectedModule("");
  };

  const handleSnapshot = (instanceId: string) => {
    toast.success(`${instanceId} 스냅샷 생성이 시작되었습니다.`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            RDS 데이터베이스
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
                새 RDS 인스턴스 생성
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                새로운 RDS 데이터베이스 인스턴스를 생성합니다.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">인스턴스 이름</Label>
                <Input
                  id="name"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  placeholder="예: prod-mysql-main"
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
                      <SelectItem value="mysql">MySQL 8.0</SelectItem>
                      <SelectItem value="postgres">PostgreSQL 15</SelectItem>
                      <SelectItem value="mariadb">MariaDB 10.6</SelectItem>
                      <SelectItem value="aurora-mysql">Aurora MySQL</SelectItem>
                      <SelectItem value="aurora-postgres">
                        Aurora PostgreSQL
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
                        db.t3.micro (2 vCPU, 1GB)
                      </SelectItem>
                      <SelectItem value="db.t3.small">
                        db.t3.small (2 vCPU, 2GB)
                      </SelectItem>
                      <SelectItem value="db.t3.medium">
                        db.t3.medium (2 vCPU, 4GB)
                      </SelectItem>
                      <SelectItem value="db.r5.large">
                        db.r5.large (2 vCPU, 16GB)
                      </SelectItem>
                      <SelectItem value="db.r5.xlarge">
                        db.r5.xlarge (4 vCPU, 32GB)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                    <SelectItem value="rds-standard-options">
                      rds-standard-options
                    </SelectItem>
                    <SelectItem value="rds-security-group">
                      rds-security-group
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
                          {instance.engine}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {instance.engineVersion}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant="outline" className="font-mono text-xs">
                        {instance.instanceClass}
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
