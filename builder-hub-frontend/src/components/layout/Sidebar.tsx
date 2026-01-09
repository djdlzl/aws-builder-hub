import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
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
  Building2,
  LogOut,
} from "lucide-react";

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "대시보드", path: "/" },
  { icon: Server, label: "EC2 인스턴스", path: "/ec2" },
  { icon: Database, label: "RDS 데이터베이스", path: "/rds" },
  { icon: Layers, label: "S3 버킷", path: "/s3" },
  { icon: Globe, label: "VPC 네트워크", path: "/vpc" },
  { icon: Shield, label: "IAM 정책", path: "/iam" },
  { icon: Tags, label: "모듈 관리", path: "/modules" },
  { icon: Box, label: "템플릿", path: "/templates" },
  { icon: Building2, label: "AWS 계정 관리", path: "/aws-accounts", adminOnly: true },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, isAdmin, logout } = useAuth();

  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

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
        {filteredNavItems.map((item) => {
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
              {!collapsed && (
                <span className="flex items-center gap-2">
                  {item.label}
                  {item.adminOnly && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">Admin</span>
                  )}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 border-t border-border p-3 space-y-1">
        {/* User Info */}
        {!collapsed && user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            <span className={cn(
              "inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded",
              user.role === 'admin' ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            )}>
              {user.role === 'admin' ? 'Admin' : 'Developer'}
            </span>
          </div>
        )}
        
        <Link
          to="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Settings className="h-5 w-5 shrink-0" />
          {!collapsed && <span>설정</span>}
        </Link>
        
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>로그아웃</span>}
        </button>
      </div>
    </aside>
  );
}
