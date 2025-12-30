import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ExternalLink } from "lucide-react";

interface Resource {
  id: string;
  name: string;
  type: string;
  status: "running" | "stopped" | "pending" | "error";
  region: string;
  createdAt: string;
}

const resources: Resource[] = [
  { id: "i-0abc123", name: "web-server-prod-01", type: "EC2", status: "running", region: "ap-northeast-2", createdAt: "2024-01-15" },
  { id: "i-0def456", name: "api-server-prod-01", type: "EC2", status: "running", region: "ap-northeast-2", createdAt: "2024-01-15" },
  { id: "db-xyz789", name: "main-database", type: "RDS", status: "running", region: "ap-northeast-2", createdAt: "2024-01-10" },
  { id: "s3-bucket1", name: "assets-bucket", type: "S3", status: "running", region: "ap-northeast-2", createdAt: "2024-01-08" },
  { id: "i-0ghi012", name: "worker-staging-01", type: "EC2", status: "stopped", region: "ap-northeast-2", createdAt: "2024-01-20" },
];

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

export function ResourceTable() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">최근 리소스</h3>
        <p className="text-sm text-muted-foreground mt-1">활성화된 AWS 리소스 목록</p>
      </div>

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
                  <code className="text-sm font-mono text-primary">{resource.id}</code>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm font-medium text-foreground">{resource.name}</span>
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
                  <span className="text-sm text-muted-foreground">{resource.region}</span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-muted-foreground">{resource.createdAt}</span>
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
