import { useState, useEffect } from "react";
import {
  Server,
  Database,
  Layers,
  Cloud,
  AlertCircle,
  Settings,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ResourceTable } from "@/components/dashboard/ResourceTable";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { API_CONFIG, buildApiUrl } from "@/config/api";

interface AwsAccount {
  id: number;
  accountId: string;
  accountName: string;
  status: string;
}

interface DashboardStats {
  ec2Count: number;
  rdsCount: number;
  s3Count: number;
  accountCount: number;
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState<AwsAccount[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    ec2Count: 0,
    rdsCount: 0,
    s3Count: 0,
    accountCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const isAdmin = localStorage.getItem("user_role") === "ADMIN";

  const getAuthHeaders = () => {
    const token = localStorage.getItem("access_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check if admin_demo user is logged in
        const isDemoAdmin =
          localStorage.getItem("cloudforge_auth_token") ===
          "mock-token-admin-demo";

        if (isDemoAdmin) {
          // Load dummy data for admin_demo
          const dummyAccounts: AwsAccount[] = [
            {
              id: 1,
              accountId: "123456789012",
              accountName: "Demo Production Account",
              status: "ACTIVE",
            },
            {
              id: 2,
              accountId: "210987654321",
              accountName: "Demo Development Account",
              status: "ACTIVE",
            },
            {
              id: 3,
              accountId: "345678901234",
              accountName: "Demo Staging Account",
              status: "ACTIVE",
            },
          ];

          const dummyStats: DashboardStats = {
            ec2Count: 15,
            rdsCount: 8,
            s3Count: 12,
            accountCount: 3,
          };

          setAccounts(dummyAccounts);
          setStats(dummyStats);
          setIsLoading(false);
          return;
        }

        // Fetch AWS accounts (admin only)
        if (isAdmin) {
          const accountsRes = await fetch(
            buildApiUrl(API_CONFIG.ENDPOINTS.AWS_ACCOUNTS.VERIFIED),
            { headers: getAuthHeaders() }
          );
          if (accountsRes.ok) {
            const data = await accountsRes.json();
            const accountList = data.results || [];
            setAccounts(accountList);
            setStats((prev) => ({ ...prev, accountCount: accountList.length }));
          }
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAdmin]);

  const hasConnectedAccounts = accounts.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">대시보드</h1>
        <p className="text-muted-foreground mt-1">
          AWS 리소스 현황을 한눈에 확인하세요
        </p>
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
                </p>
              </div>
              <ResourceTable accounts={accounts} />
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
