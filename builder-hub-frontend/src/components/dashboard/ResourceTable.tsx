import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { API_CONFIG, buildApiUrl } from "@/config/api";

interface Resource {
  id: string;
  name: string;
  type: string;
  status: "running" | "stopped" | "pending" | "error";
  region: string;
  createdAt: string;
  accountName?: string;
}

interface AwsAccount {
  id: number;
  accountId: string;
  accountName: string;
  status: string;
}

interface ResourceTableProps {
  accounts?: AwsAccount[];
}

const statusStyles = {
  running: "bg-success/10 text-success border-success/20",
  stopped: "bg-muted text-muted-foreground border-muted",
  pending: "bg-warning/10 text-warning border-warning/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusLabels = {
  running: "실행중",
  stopped: "중지됨",
  pending: "대기중",
  error: "오류",
};

export function ResourceTable({ accounts = [] }: ResourceTableProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("access_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  useEffect(() => {
    const fetchResources = async () => {
      if (accounts.length === 0) {
        setIsLoading(false);
        return;
      }

      // Check if admin_demo user is logged in
      const isDemoAdmin =
        localStorage.getItem("cloudforge_auth_token") ===
        "mock-token-admin-demo";

      if (isDemoAdmin) {
        // Load dummy resources for admin_demo
        const dummyResources: Resource[] = [
          {
            id: "i-1234567890abcdef0",
            name: "demo-web-server-01",
            type: "EC2",
            status: "running",
            region: "ap-northeast-2",
            createdAt: "2024-01-15",
            accountName: "Demo Production Account",
          },
          {
            id: "i-0987654321fedcba0",
            name: "demo-app-server-01",
            type: "EC2",
            status: "running",
            region: "ap-northeast-2",
            createdAt: "2024-01-10",
            accountName: "Demo Production Account",
          },
          {
            id: "db-demo-prod-01",
            name: "demo-prod-mysql",
            type: "RDS",
            status: "running",
            region: "ap-northeast-2",
            createdAt: "2024-01-05",
            accountName: "Demo Production Account",
          },
          {
            id: "i-abcdef1234567890",
            name: "demo-dev-server-01",
            type: "EC2",
            status: "stopped",
            region: "ap-northeast-2",
            createdAt: "2024-01-20",
            accountName: "Demo Development Account",
          },
          {
            id: "db-demo-dev-01",
            name: "demo-dev-postgres",
            type: "RDS",
            status: "running",
            region: "ap-northeast-2",
            createdAt: "2024-01-18",
            accountName: "Demo Development Account",
          },
          {
            id: "demo-bucket-prod",
            name: "demo-production-assets",
            type: "S3",
            status: "running",
            region: "ap-northeast-2",
            createdAt: "2024-01-01",
            accountName: "Demo Production Account",
          },
          {
            id: "i-1234567890abcde0",
            name: "demo-staging-server",
            type: "EC2",
            status: "pending",
            region: "ap-northeast-2",
            createdAt: "2024-01-22",
            accountName: "Demo Staging Account",
          },
          {
            id: "db-demo-staging-01",
            name: "demo-staging-mysql",
            type: "RDS",
            status: "running",
            region: "ap-northeast-2",
            createdAt: "2024-01-21",
            accountName: "Demo Staging Account",
          },
        ];

        setResources(dummyResources);
        setIsLoading(false);
        return;
      }

      // TODO: Fetch actual resources from connected AWS accounts
      // For now, show empty state since no resources are fetched yet
      setIsLoading(false);
      setResources([]);
    };

    fetchResources();
  }, [accounts]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">
          {accounts.length === 0
            ? "연결된 AWS 계정이 없습니다."
            : "표시할 리소스가 없습니다."}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          AWS 계정을 연결하고 검증하면 리소스가 표시됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                리소스 ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                이름
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                유형
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                상태
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                리전
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                생성일
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                액션
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {resources.map((resource) => (
              <tr
                key={resource.id}
                className="hover:bg-accent/50 transition-colors"
              >
                <td className="px-4 py-4">
                  <code className="text-sm font-mono text-primary">
                    {resource.id}
                  </code>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm font-medium text-foreground">
                    {resource.name}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <Badge variant="outline" className="font-mono text-xs">
                    {resource.type}
                  </Badge>
                </td>
                <td className="px-4 py-4">
                  <Badge className={statusStyles[resource.status]}>
                    {statusLabels[resource.status]}
                  </Badge>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-muted-foreground">
                    {resource.region}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-muted-foreground">
                    {resource.createdAt}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ExternalLink className="h-4 w-4" />
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
