import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Activity,
  ExternalLink,
  Loader2,
  Play,
  Square,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  getLatestSession,
  startLocust,
  stopLocust,
} from "@/lib/api/locust";
import type { LocustSession } from "@/types/locust";
import {
  CUSTOM_LOCUST_GATEWAY_OPTION,
  getLocustGatewaySelectValue,
  LOCUST_GATEWAY_URL_OPTIONS,
} from "@/constants/locust";

interface LocustPanelProps {
  clusterInstanceId: number;
  defaultGatewayUrl?: string;
}

export default function LocustPanel({
  clusterInstanceId,
  defaultGatewayUrl = "",
}: LocustPanelProps) {
  const { toast } = useToast();

  const [session, setSession] = useState<LocustSession | null>(null);
  const [gatewayUrl, setGatewayUrl] = useState(defaultGatewayUrl);
  const [gatewaySelectValue, setGatewaySelectValue] = useState(getLocustGatewaySelectValue(defaultGatewayUrl));

  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isOpenButtonCoolingDown, setIsOpenButtonCoolingDown] = useState(false);
  const openButtonCooldownTimerRef = useRef<number | null>(null);

  useEffect(() => {
    getLatestSession(clusterInstanceId)
      .then(setSession)
      .catch(() => {});
  }, [clusterInstanceId]);

  useEffect(() => {
    setGatewayUrl(defaultGatewayUrl);
    setGatewaySelectValue(getLocustGatewaySelectValue(defaultGatewayUrl));
  }, [defaultGatewayUrl]);

  useEffect(() => {
    return () => {
      if (openButtonCooldownTimerRef.current != null) {
        window.clearTimeout(openButtonCooldownTimerRef.current);
      }
    };
  }, []);

  const handleStart = async () => {
    if (!gatewayUrl) {
      toast({ title: "게이트웨이 URL을 입력해주세요.", variant: "destructive" });
      return;
    }
    setIsStarting(true);
    try {
      const result = await startLocust(clusterInstanceId, gatewayUrl, 5);
      setSession(result);
      setIsOpenButtonCoolingDown(true);
      if (openButtonCooldownTimerRef.current != null) {
        window.clearTimeout(openButtonCooldownTimerRef.current);
      }
      openButtonCooldownTimerRef.current = window.setTimeout(() => {
        setIsOpenButtonCoolingDown(false);
      }, 5000);
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
      setIsOpenButtonCoolingDown(false);
      if (openButtonCooldownTimerRef.current != null) {
        window.clearTimeout(openButtonCooldownTimerRef.current);
        openButtonCooldownTimerRef.current = null;
      }
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
  const resolvedLocustUrl = (() => {
    if (!session?.port && !session?.locustUrl) return null;
    const fallbackPath = session?.port ? `/locust/${session.port}/` : null;
    const fallback = fallbackPath ? `${window.location.origin}${fallbackPath}` : null;
    if (!session?.locustUrl) return fallback;
    if (session.locustUrl.startsWith("/")) {
      return `${window.location.origin}${session.locustUrl}`;
    }
    try {
      const parsed = new URL(session.locustUrl);
      // 서버가 localhost로 내려주더라도 현재 접속 도메인으로 자동 보정
      if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
        return fallback;
      }
      return session.locustUrl;
    } catch {
      return fallback;
    }
  })();
  const displayServices = session?.services ?? [];

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
      <div className="grid grid-cols-1 gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-xs">게이트웨이 URL</Label>
          <Select
            value={gatewaySelectValue}
            onValueChange={(value) => {
              setGatewaySelectValue(value);
              if (value !== CUSTOM_LOCUST_GATEWAY_OPTION) {
                setGatewayUrl(value);
              }
            }}
            disabled={isRunning}
          >
            <SelectTrigger className="h-8 text-sm font-mono">
              <SelectValue placeholder="게이트웨이 URL 선택" />
            </SelectTrigger>
            <SelectContent>
              {LOCUST_GATEWAY_URL_OPTIONS.map((url) => (
                <SelectItem key={url} value={url} className="font-mono text-xs">
                  {url}
                </SelectItem>
              ))}
              <SelectItem value={CUSTOM_LOCUST_GATEWAY_OPTION}>직접 입력</SelectItem>
            </SelectContent>
          </Select>
          {gatewaySelectValue === CUSTOM_LOCUST_GATEWAY_OPTION && (
            <Input
              value={gatewayUrl}
              onChange={(e) => {
                const value = e.target.value;
                setGatewayUrl(value);
                setGatewaySelectValue(getLocustGatewaySelectValue(value));
              }}
              placeholder="https://custom-gateway.example.com"
              disabled={isRunning}
              className="h-8 text-sm font-mono"
            />
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">실행 시 worker 수는 고정값 5로 동작합니다.</p>

      {/* 버튼 영역 */}
      <div className="flex items-center gap-2">
        {!isRunning ? (
          <Button
            size="sm"
            onClick={handleStart}
            disabled={isStarting}
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

        {isRunning && resolvedLocustUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(resolvedLocustUrl, "_blank")}
            disabled={isOpenButtonCoolingDown}
            className="gap-1.5 ml-auto"
          >
            {isOpenButtonCoolingDown ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ExternalLink className="h-3.5 w-3.5" />
            )}
            {isOpenButtonCoolingDown ? "준비 중..." : "Locust 열기"}
          </Button>
        )}
      </div>

      {isRunning && resolvedLocustUrl && (
        <div className="space-y-1">
          <Label className="text-xs">Locust URL</Label>
          <a
            href={resolvedLocustUrl}
            target="_blank"
            rel="noreferrer"
            className="block text-xs font-mono text-primary underline underline-offset-2 break-all"
          >
            {resolvedLocustUrl}
          </a>
        </div>
      )}

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
