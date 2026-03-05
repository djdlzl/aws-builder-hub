import { useState, useEffect, useCallback } from "react";
import {
  Server,
  Database,
  Layers,
  Cloud,
  AlertCircle,
  Settings,
  RefreshCw,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ResourceTable } from "@/components/dashboard/ResourceTable";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { API_CONFIG, buildApiUrl } from "@/config/api";
import { toast } from "sonner";

interface DashboardStats {
  ec2Count: number;
  rdsCount: number;
  s3Count: number;
  accountCount: number;
}

import { useAWSContext } from "@/hooks/use-aws-context";

const regionLabels: Record<string, string> = {
  "ap-northeast-2": "서울(apne2)",
  "ap-northeast-1": "도쿄(apne1)",
  "us-west-2": "오레곤(uswe2)",
  "us-east-1": "버지니아(use1)",
  "eu-west-1": "아일랜드(euw1)",
};

const formatRegionLabel = (region?: string) =>
  regionLabels[region ?? ""] ?? region ?? "Unknown";

export default function Dashboard() {
  const { selectedAccount, selectedRegion, accounts } = useAWSContext();
  const [stats, setStats] = useState<DashboardStats>({
    ec2Count: 0,
    rdsCount: 0,
    s3Count: 0,
    accountCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isAdmin = localStorage.getItem("user_role") === "ADMIN";

  const getAuthHeaders = () => {
    const token = localStorage.getItem("access_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const isEc2Terminated = (state?: string) => {
    const normalized = state?.toLowerCase() ?? "";
    return normalized === "terminated" || normalized === "shutting-down";
  };

  const isRdsTerminated = (status?: string) => {
    const normalized = status?.toLowerCase() ?? "";
    return normalized === "deleted" || normalized === "deleting";
  };

  const fetchDashboardData = useCallback(
    async (showRefreshToast = false) => {
      if (accounts.length === 0) {
        setStats({ ec2Count: 0, rdsCount: 0, s3Count: 0, accountCount: 0 });
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const isDemoAdmin =
        localStorage.getItem("access_token") ===
        "mock-token-admin-demo";
      const isMockAdmin =
        localStorage.getItem("access_token") === "mock-token-admin";

      if (isDemoAdmin) {
        const dummyStats = {
          ec2Count: 15,
          rdsCount: 8,
          s3Count: 12,
          accountCount: 3,
        };

        setStats(dummyStats);
        setIsLoading(false);
        if (showRefreshToast) toast.success("Dashboard refreshed");
        return;
      }

      if (isMockAdmin) {
        const dummyStats = {
          ec2Count: 8,
          rdsCount: 4,
          s3Count: 6,
          accountCount: 2,
        };

        setStats(dummyStats);
        setIsLoading(false);
        if (showRefreshToast) toast.success("Dashboard refreshed");
        return;
      }

      try {
        const [ec2Res, rdsRes, s3Res] = await Promise.all([
          fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AWS_RESOURCES.EC2), {
            headers: getAuthHeaders(),
          }),
          fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AWS_RESOURCES.RDS), {
            headers: getAuthHeaders(),
          }),
          fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AWS_RESOURCES.S3), {
            headers: getAuthHeaders(),
          }),
        ]);

        const ec2List = ec2Res.ok ? (await ec2Res.json()).results || [] : [];
        const rdsList = rdsRes.ok ? (await rdsRes.json()).results || [] : [];
        const s3List = s3Res.ok ? (await s3Res.json()).results || [] : [];

        const filterByAccountAndRegion = (list: any[]) => {
          let filtered = list;
          if (selectedAccount) {
            filtered = filtered.filter(
              (r: { accountName?: string }) => r.accountName === selectedAccount.name
            );
          }
          if (selectedRegion) {
            filtered = filtered.filter(
              (r: { region?: string }) => r.region === selectedRegion.code
            );
          }
          return filtered;
        };

        const filteredEc2 = filterByAccountAndRegion(ec2List);
        const filteredRds = filterByAccountAndRegion(rdsList);
        const filteredS3 = filterByAccountAndRegion(s3List);

        const activeEc2 = filteredEc2.filter(
          (r: { state?: string }) => !isEc2Terminated(r.state),
        );
        const activeRds = filteredRds.filter(
          (r: { status?: string }) => !isRdsTerminated(r.status),
        );

        setStats({
          ec2Count: activeEc2.length,
          rdsCount: activeRds.length,
          s3Count: filteredS3.length,
          accountCount: accounts.length,
        });

        if (showRefreshToast) toast.success("Dashboard refreshed");
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        if (showRefreshToast) toast.error("Failed to refresh dashboard");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [accounts, selectedAccount, selectedRegion],
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData(true);
  };

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const hasConnectedAccounts = accounts.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">대시보드</h1>
          <p className="text-muted-foreground mt-1">
            AWS 리소스 현황을 한눈에 확인하세요
          </p>
        </div>
        <div className="flex items-center gap-3">
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
      </div>

      {!hasConnectedAccounts ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            연결된 AWS 계정이 없습니다
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {isAdmin
              ? "AWS 계정을 연결하여 리소스를 관리하세요. 설정 페이지에서 AWS 계정을 추가할 수 있습니다."
              : "관리자에게 AWS 계정 연결을 요청하세요."}
          </p>
          {isAdmin && (
            <Link to="/settings">
              <Button>
                <Settings className="h-4 w-4 mr-2" />
                설정으로 이동
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="연결된 계정"
              value={stats.accountCount}
              icon={<Cloud className="h-5 w-5" />}
            />
            <StatsCard
              title="EC2 인스턴스"
              value={stats.ec2Count}
              icon={<Server className="h-5 w-5" />}
            />
            <StatsCard
              title="RDS 데이터베이스"
              value={stats.rdsCount}
              icon={<Database className="h-5 w-5" />}
            />
            <StatsCard
              title="S3 버킷"
              value={stats.s3Count}
              icon={<Layers className="h-5 w-5" />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
                <div>
                <h2 className="text-xl font-semibold text-foreground">
                  최근 리소스
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  활성화된 AWS 리소스 목록
                  {selectedAccount && selectedRegion
                    ? ` (${selectedAccount.name} - ${formatRegionLabel(selectedRegion.code)})`
                    : selectedAccount
                      ? ` (${selectedAccount.name})`
                      : selectedRegion
                        ? ` (${formatRegionLabel(selectedRegion.code)})`
                        : " (전체 계정)"}
                </p>
              </div>
              <ResourceTable />
            </div>
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  빠른 생성
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  리소스를 빠르게 생성하세요
                </p>
              </div>
              <QuickActions />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
