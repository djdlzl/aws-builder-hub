import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Network,
  Search,
  MoreHorizontal,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { API_CONFIG, buildApiUrl } from "@/config/api";
import { useAWSContext } from "@/hooks/use-aws-context";

interface VPCData {
  vpcId: string;
  name: string;
  cidrBlock: string;
  state: string;
  isDefault: boolean;
  accountName: string;
  region: string;
}

const statusStyles: Record<string, string> = {
  available: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
};

export default function VPC() {
  const [vpcs, setVpcs] = useState<VPCData[]>([]);
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
    const fetchVPCs = async () => {
      if (accounts.length === 0) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch(
          buildApiUrl(API_CONFIG.ENDPOINTS.AWS_RESOURCES.VPC),
          { headers: getAuthHeaders() }
        );
        if (response.ok) {
          const data = await response.json();
          const list = (data.results || []).map(
            (vpc: {
              vpcId: string;
              name?: string;
              cidrBlock: string;
              state: string;
              isDefault: boolean;
              accountName: string;
              region: string;
            }) => ({
              vpcId: vpc.vpcId,
              name: vpc.name || vpc.vpcId,
              cidrBlock: vpc.cidrBlock,
              state: vpc.state,
              isDefault: vpc.isDefault,
              accountName: vpc.accountName,
              region: vpc.region,
            })
          );
          setVpcs(list);
        }
      } catch (error) {
        console.error("Failed to fetch VPCs:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVPCs();
  }, [accounts]);

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
          <h1 className="text-3xl font-bold text-foreground">VPC 네트워킹</h1>
          <p className="text-muted-foreground mt-1">
            가상 프라이빗 클라우드를 관리합니다
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
          <h1 className="text-3xl font-bold text-foreground">VPC 네트워킹</h1>
          <p className="text-muted-foreground mt-1">
            가상 프라이빗 클라우드를 관리합니다
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="VPC 검색..."
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
          </SelectContent>
        </Select>
      </div>

      {vpcs.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">표시할 VPC가 없습니다.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  VPC
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  CIDR
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  상태
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  계정
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  리전
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vpcs.map((vpc) => (
                <tr
                  key={vpc.vpcId}
                  className="hover:bg-accent/50 transition-colors"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Network className="h-4 w-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {vpc.name}
                        </p>
                        <code className="text-xs font-mono text-muted-foreground">
                          {vpc.vpcId}
                        </code>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <code className="text-sm font-mono text-foreground">
                      {vpc.cidrBlock}
                    </code>
                  </td>
                  <td className="px-4 py-4">
                    <Badge
                      className={
                        statusStyles[vpc.state] || statusStyles.available
                      }
                    >
                      {vpc.state}
                    </Badge>
                    {vpc.isDefault && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        기본
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-foreground">
                      {vpc.accountName}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-muted-foreground">
                      {vpc.region}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-1">
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
      )}
    </div>
  );
}
