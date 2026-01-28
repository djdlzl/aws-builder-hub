/**
 * 네트워크 토폴로지 가시화 페이지
 * AWS 멀티 계정 네트워크 구조를 시각적으로 표현합니다.
 */

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  RefreshCw,
  Network,
  Clock,
  Database,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useNetworkTopology,
  NetworkTopologyProvider,
} from "@/hooks/use-network-topology";
import { NetworkVisualizationContainer } from "@/components/network-topology/NetworkVisualizationContainer";
import {
  NotificationSystem,
  NotificationUtils,
  ConnectionStatus,
  type NotificationData,
  type SyncProgressData,
} from "@/components/network-topology/NotificationSystem";

function NetworkTopologyContent() {
  const {
    topologyData,
    cacheStatus,
    syncProgress,
    isLoading,
    isRefreshing,
    error,
    refreshData,
    clearError,
  } = useNetworkTopology();

  const { toast } = useToast();

  // 알림 시스템 상태
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isConnected, setIsConnected] = useState(() => navigator.onLine);
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>();

  // 알림 추가 함수
  const addNotification = useCallback((notification: NotificationData) => {
    setNotifications((prev) => [...prev, notification]);
  }, []);

  // 알림 제거 함수
  const dismissNotification = useCallback(
    (id: string) => {
      setNotifications((prev) => {
        const target = prev.find((notification) => notification.id === id);
        if (target?.type === "error") {
          clearError();
        }
        return prev.filter((notification) => notification.id !== id);
      });
    },
    [clearError],
  );

  // 모든 알림 제거 함수
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // 동기화 진행률을 알림 시스템 형식으로 변환
  const syncProgressData: SyncProgressData | undefined = syncProgress
    ? {
        isInProgress: syncProgress.isInProgress,
        currentStep: syncProgress.currentStep,
        totalSteps: syncProgress.totalSteps,
        completedSteps: syncProgress.completedSteps,
        estimatedTimeRemaining: syncProgress.estimatedTimeRemaining,
        message: syncProgress.message,
        progress: syncProgress.progress,
      }
    : undefined;

  // 새로 고침 시작 시 알림
  const handleRefresh = useCallback(async () => {
    const refreshNotification = NotificationUtils.createInfoNotification(
      "새로 고침 시작",
      "네트워크 데이터 동기화가 시작되었습니다.",
      3000,
    );
    addNotification(refreshNotification);

    try {
      await refreshData();
    } catch (err) {
      const errorNotification = NotificationUtils.createErrorNotification(
        "새로 고침 실패",
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
        [
          {
            label: "다시 시도",
            onClick: () => refreshData(),
            variant: "primary",
          },
        ],
      );
      addNotification(errorNotification);
    }
  }, [refreshData, addNotification]);

  // 오류 발생 시 알림 표시
  useEffect(() => {
    if (!error) {
      return;
    }

    setNotifications((prev) => {
      const hasSameError = prev.some(
        (notification) =>
          notification.type === "error" && notification.message === error,
      );
      if (hasSameError) {
        return prev;
      }

      const errorNotification = NotificationUtils.createErrorNotification(
        "오류 발생",
        error,
      );

      return [
        ...prev,
        {
          ...errorNotification,
          actions: [
            {
              label: "다시 시도",
              onClick: () => {
                clearError();
                dismissNotification(errorNotification.id);
                handleRefresh();
              },
              variant: "primary",
            },
            {
              label: "닫기",
              onClick: () => {
                clearError();
                dismissNotification(errorNotification.id);
              },
              variant: "secondary",
            },
          ],
        },
      ];
    });
  }, [error, clearError, dismissNotification, handleRefresh]);

  // 동기화 완료 시 알림
  useEffect(() => {
    if (
      !syncProgress?.isInProgress &&
      topologyData &&
      cacheStatus?.lastUpdated
    ) {
      const wasRefreshing = sessionStorage.getItem("networkTopologyRefreshing");
      if (wasRefreshing === "true") {
        const successNotification = NotificationUtils.createSuccessNotification(
          "동기화 완료",
          `네트워크 데이터가 성공적으로 업데이트되었습니다. (노드: ${topologyData.nodes?.length || 0}개, 연결: ${topologyData.edges?.length || 0}개)`,
          5000,
        );
        addNotification(successNotification);
        setLastUpdated(new Date(cacheStatus.lastUpdated));
        sessionStorage.removeItem("networkTopologyRefreshing");
      }
    }
  }, [
    syncProgress?.isInProgress,
    topologyData,
    cacheStatus?.lastUpdated,
    addNotification,
  ]);

  // 새로 고침 시작 시 상태 저장
  useEffect(() => {
    if (isRefreshing || syncProgress?.isInProgress) {
      sessionStorage.setItem("networkTopologyRefreshing", "true");
    }
  }, [isRefreshing, syncProgress?.isInProgress]);

  // 연결 상태 모니터링 (WebSocket 연결 상태 시뮬레이션)
  useEffect(() => {
    const checkConnection = () => {
      const connected = navigator.onLine;
      if (connected !== isConnected) {
        setIsConnected(connected);

        if (connected) {
          const reconnectNotification =
            NotificationUtils.createSuccessNotification(
              "연결 복구",
              "네트워크 연결이 복구되었습니다.",
              3000,
            );
          addNotification(reconnectNotification);
        } else {
          const disconnectNotification =
            NotificationUtils.createWarningNotification(
              "연결 끊김",
              "네트워크 연결이 끊어졌습니다.",
              0,
            );
          addNotification(disconnectNotification);
        }
      }
    };

    window.addEventListener("online", checkConnection);
    window.addEventListener("offline", checkConnection);

    return () => {
      window.removeEventListener("online", checkConnection);
      window.removeEventListener("offline", checkConnection);
    };
  }, [isConnected, addNotification]);

  // 시각화 오류 처리
  const handleVisualizationError = useCallback(
    (error: Error) => {
      const errorNotification = NotificationUtils.createErrorNotification(
        "시각화 오류",
        `그래프 렌더링 중 오류가 발생했습니다: ${error.message}`,
        [
          {
            label: "새로 고침",
            onClick: () => handleRefresh(),
            variant: "primary",
          },
        ],
      );
      addNotification(errorNotification);
    },
    [addNotification, handleRefresh],
  );

  // 성능 경고 처리
  const handlePerformanceWarning = useCallback(
    (warning: string) => {
      const warningNotification = NotificationUtils.createWarningNotification(
        "성능 경고",
        warning,
        8000,
      );
      addNotification(warningNotification);
    },
    [addNotification],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>네트워크 토폴로지 로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 알림 시스템 */}
      <NotificationSystem
        notifications={notifications}
        syncProgress={syncProgressData}
        onDismiss={dismissNotification}
        onClearAll={clearAllNotifications}
      />

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Network className="h-8 w-8" />
            네트워크 토폴로지
          </h1>
          <p className="text-muted-foreground">
            AWS 멀티 계정 환경의 네트워크 구조를 시각적으로 탐색하세요
          </p>

          {/* 연결 상태 표시 */}
          <div className="mt-2">
            <ConnectionStatus
              isConnected={isConnected}
              lastUpdated={lastUpdated}
            />
          </div>
        </div>

        <Button
          onClick={handleRefresh}
          disabled={isRefreshing || syncProgress?.isInProgress}
          className="flex items-center gap-2"
        >
          {isRefreshing || syncProgress?.isInProgress ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          새로 고침
        </Button>
      </div>

      {/* 상태 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 캐시 상태 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">캐시 상태</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {cacheStatus?.isDataAvailable ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <Badge variant="secondary">
                    {cacheStatus.isUpdateInProgress ? "업데이트 중" : "캐시됨"}
                  </Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <Badge variant="outline">캐시 없음</Badge>
                </>
              )}
            </div>
            {cacheStatus?.lastUpdated && (
              <p className="text-xs text-muted-foreground mt-2">
                마지막 업데이트:{" "}
                {new Date(cacheStatus.lastUpdated).toLocaleString("ko-KR")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* 동기화 상태 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">동기화 상태</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {syncProgress?.isInProgress ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <Badge>진행 중</Badge>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <Badge variant="secondary">대기 중</Badge>
                </>
              )}
            </div>
            {syncProgress?.isInProgress && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-muted-foreground">
                  {syncProgress.currentStep} ({syncProgress.completedSteps}/
                  {syncProgress.totalSteps})
                </p>
                <Progress
                  value={Math.min(
                    Math.max(syncProgress.progress * 100, 0),
                    100,
                  )}
                  className="h-2"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* 다음 업데이트 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">다음 업데이트</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {cacheStatus?.nextScheduledUpdate ? (
              <p className="text-sm">
                {new Date(cacheStatus.nextScheduledUpdate).toLocaleString(
                  "ko-KR",
                )}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">예정 없음</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              자동 동기화: 오전 7시, 오후 1시
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 동기화 진행 상태 알림 */}
      {syncProgress?.isInProgress && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            <div className="space-y-2">
              <p>
                <strong>{syncProgress.currentStep}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                {syncProgress.message}
              </p>
              <Progress
                value={Math.min(Math.max(syncProgress.progress * 100, 0), 100)}
                className="h-2"
              />
              {syncProgress.estimatedTimeRemaining ? (
                <p className="text-xs text-muted-foreground">
                  예상 남은 시간:{" "}
                  {Math.ceil(syncProgress.estimatedTimeRemaining / 60)}분
                </p>
              ) : null}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 메인 콘텐츠 */}
      <Card>
        <CardHeader>
          <CardTitle>네트워크 토폴로지 시각화</CardTitle>
          <CardDescription>
            계정, 리전, VPC, 서브넷 간의 연결 관계를 탐색하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topologyData ? (
            <div className="space-y-4">
              {/* 토폴로지 통계 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">
                    {topologyData.nodes?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">노드</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">
                    {topologyData.edges?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">연결</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">
                    {Object.keys(topologyData.hierarchy?.accounts || {}).length}
                  </div>
                  <div className="text-sm text-muted-foreground">계정</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">
                    {Object.values(
                      topologyData.hierarchy?.accounts || {},
                    ).reduce(
                      (total: number, account: any) =>
                        total + Object.keys(account.regions || {}).length,
                      0,
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">리전</div>
                </div>
              </div>

              <Separator />

              {/* 네트워크 토폴로지 시각화 */}
              <div className="h-[600px] border rounded-lg overflow-hidden">
                <NetworkVisualizationContainer
                  data={topologyData}
                  onNodeClick={(node) => console.log("Node clicked:", node)}
                  onNodeHover={(node) => console.log("Node hovered:", node)}
                  onError={handleVisualizationError}
                  onPerformanceWarning={handlePerformanceWarning}
                  showStatusMonitor={false}
                  enableRealTimeStatus={false}
                  enableAdvancedFilters={true}
                />
              </div>
            </div>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                네트워크 데이터가 아직 수집되지 않았습니다.
                <Button
                  variant="link"
                  className="p-0 h-auto font-normal"
                  onClick={handleRefresh}
                >
                  새로 고침
                </Button>
                을 클릭하여 데이터를 동기화하세요.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function NetworkTopology() {
  return (
    <NetworkTopologyProvider>
      <NetworkTopologyContent />
    </NetworkTopologyProvider>
  );
}
