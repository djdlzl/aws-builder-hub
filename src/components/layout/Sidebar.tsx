import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Server,
  Database,
  Globe,
  Shield,
  Tags,
  Settings,
  ChevronLeft,
  ChevronRight,
  Box,
  Layers,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "대시보드", path: "/" },
  { icon: Server, label: "EC2 인스턴스", path: "/ec2" },
  { icon: Database, label: "RDS 데이터베이스", path: "/rds" },
  { icon: Layers, label: "S3 버킷", path: "/s3" },
  { icon: Globe, label: "VPC 네트워크", path: "/vpc" },
  { icon: Shield, label: "IAM 정책", path: "/iam" },
  { icon: Tags, label: "모듈 관리", path: "/modules" },
  { icon: Box, label: "템플릿", path: "/templates" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
              <Box className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">CloudForge</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      <nav className="flex flex-col gap-1 p-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary shadow-glow"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 border-t border-border p-3">
        <Link
          to="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Settings className="h-5 w-5 shrink-0" />
          {!collapsed && <span>설정</span>}
        </Link>
      </div>
    </aside>
  );
}
