import {
  Server,
  Database,
  Globe,
  Layers,
  DollarSign,
  Activity,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ResourceTable } from "@/components/dashboard/ResourceTable";
import { QuickActions } from "@/components/dashboard/QuickActions";

export default function Dashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">대시보드</h1>
        <p className="text-muted-foreground mt-1">
          AWS 리소스 현황을 한눈에 확인하세요
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="EC2 인스턴스"
          value={12}
          change={8}
          icon={<Server className="h-5 w-5" />}
        />
        <StatsCard
          title="RDS 데이터베이스"
          value={4}
          change={0}
          icon={<Database className="h-5 w-5" />}
        />
        <StatsCard
          title="S3 버킷"
          value={8}
          change={25}
          icon={<Layers className="h-5 w-5" />}
        />
        <StatsCard
          title="월 비용"
          value="$2,450"
          change={-5}
          icon={<DollarSign className="h-5 w-5" />}
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
          <ResourceTable />
        </div>
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">빠른 생성</h2>
            <p className="text-sm text-muted-foreground mt-1">
              리소스를 빠르게 생성하세요
            </p>
          </div>
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
