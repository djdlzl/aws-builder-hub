import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  ExternalLink,
  Play,
  RefreshCw,
  Square,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  getLatestSession,
  scanServices,
  startLocust,
  stopLocust,
} from "@/lib/api/locust";
import type { LocustSession } from "@/types/locust";

interface LocustPanelProps {
  clusterInstanceId: number;
  defaultGatewayUrl?: string;
  defaultWorkerCount?: number;
}

export default function LocustPanel({
  clusterInstanceId,
  defaultGatewayUrl = "",
  defaultWorkerCount = 5,
}: LocustPanelProps) {
  const { toast } = useToast();

  const [session, setSession] = useState<LocustSession | null>(null);
  const [gatewayUrl, setGatewayUrl] = useState(defaultGatewayUrl);
  const [workerCount, setWorkerCount] = useState(defaultWorkerCount);
  const [scannedServices, setScannedServices] = useState<string[]>([]);

  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  useEffect(() => {
    getLatestSession(clusterInstanceId)
      .then(setSession)
      .catch(() => {});
  }, [clusterInstanceId]);

  const handleScan = async () => {
    if (!gatewayUrl) {
      toast({ title: "게이트웨이 URL을 입력해주세요.", variant: "destructive" });
      return;
    }
    setIsScanning(true);
    try {
      const result = await scanServices(clusterInstanceId, gatewayUrl);
      setScannedServices(result.services);
      toast({ title: `${result.count}개 서비스 감지됨` });
    } catch (e: unknown) {
      toast({
        title: "서비스 스캔 실패",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleStart = async () => {
    if (!gatewayUrl) {
      toast({ title: "게이트웨이 URL을 입력해주세요.", variant: "destructive" });
      return;
    }
    setIsStarting(true);
    try {
      const result = await startLocust(clusterInstanceId, gatewayUrl, workerCount);
      setSession(result);
      setScannedServices(result.services);
      toast({ title: `Locust 시작됨 (port: ${result.port})` });
    } catch (e: unknown) {
      toast({
        title: "Locust 시작 실패",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    setIsStopping(true);
    try {
      const result = await stopLocust(clusterInstanceId);
      setSession(result);
      toast({ title: "Locust 중지됨" });
    } catch (e: unknown) {
      toast({
        title: "Locust 중지 실패",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setIsStopping(false);
    }
  };

  const isRunning = session?.status === "RUNNING";
  const displayServices = isRunning
    ? session?.services ?? []
    : scannedServices;

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">Locust 헬스체크</span>
        {session && (
          <StatusBadge status={session.status} />
        )}
      </div>

      {/* 설정 입력 */}
      <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-xs">게이트웨이 URL</Label>
          <Input
            value={gatewayUrl}
            onChange={(e) => setGatewayUrl(e.target.value)}
            placeholder="https://kr-gw.spooncast.net"
            disabled={isRunning}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Worker 수</Label>
          <Input
            type="number"
            value={workerCount}
            onChange={(e) => setWorkerCount(Number(e.target.value))}
            min={1}
            max={20}
            disabled={isRunning}
            className="h-8 text-sm w-20"
          />
        </div>
      </div>

      {/* 버튼 영역 */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleScan}
          disabled={isScanning || isRunning}
          className="gap-1.5"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isScanning && "animate-spin")} />
          {isScanning ? "스캔 중..." : "서비스 스캔"}
        </Button>

        {!isRunning ? (
          <Button
            size="sm"
            onClick={handleStart}
            disabled={isStarting || isScanning}
            className="gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            {isStarting ? "시작 중..." : "Locust 시작"}
          </Button>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleStop}
            disabled={isStopping}
            className="gap-1.5"
          >
            <Square className="h-3.5 w-3.5" />
            {isStopping ? "중지 중..." : "중지"}
          </Button>
        )}

        {isRunning && session?.locustUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(session.locustUrl!, "_blank")}
            className="gap-1.5 ml-auto"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Locust 열기
          </Button>
        )}
      </div>

      {/* 서비스 목록 */}
      {displayServices.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              대상 서비스 ({displayServices.length}개)
            </span>
          </div>
          <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-2 rounded-md bg-muted/30 border border-border">
            {displayServices.map((svc) => (
              <span
                key={svc}
                className="text-[11px] px-1.5 py-0.5 rounded bg-background border border-border text-foreground"
              >
                {svc}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {session?.status === "ERROR" && session.errorMessage && (
        <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">
          {session.errorMessage}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: LocustSession["status"] }) {
  const map: Record<
    LocustSession["status"],
    { label: string; className: string }
  > = {
    SCANNING: { label: "스캔 중", className: "bg-blue-500/20 text-blue-500" },
    RUNNING: { label: "실행 중", className: "bg-green-500/20 text-green-500" },
    STOPPING: { label: "중지 중", className: "bg-yellow-500/20 text-yellow-500" },
    STOPPED: { label: "중지됨", className: "bg-muted text-muted-foreground" },
    ERROR: { label: "오류", className: "bg-destructive/20 text-destructive" },
  };
  const { label, className } = map[status];
  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5", className)}>
      {label}
    </Badge>
  );
}
