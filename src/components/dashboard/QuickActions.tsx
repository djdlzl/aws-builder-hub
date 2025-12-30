import { Link } from "react-router-dom";
import { Server, Database, Globe, Layers, Shield, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const actions = [
  { icon: Server, label: "EC2 인스턴스", path: "/ec2/create", color: "text-orange-400" },
  { icon: Database, label: "RDS 데이터베이스", path: "/rds/create", color: "text-blue-400" },
  { icon: Layers, label: "S3 버킷", path: "/s3/create", color: "text-green-400" },
  { icon: Globe, label: "VPC 네트워크", path: "/vpc/create", color: "text-purple-400" },
  { icon: Shield, label: "IAM 정책", path: "/iam/create", color: "text-yellow-400" },
];

export function QuickActions() {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">빠른 생성</h3>
        <Plus className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Link
            key={action.path}
            to={action.path}
            className="group flex items-center gap-3 rounded-lg border border-border bg-secondary/50 p-4 transition-all duration-200 hover:border-primary/50 hover:bg-accent"
          >
            <div className={cn("h-10 w-10 rounded-lg bg-background flex items-center justify-center", action.color)}>
              <action.icon className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
