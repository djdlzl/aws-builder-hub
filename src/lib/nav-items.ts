import {
  LayoutDashboard,
  Server,
  Database,
  Globe,
  Shield,
  Tags,
  Box,
  Layers,
  Building2,
  Network,
  Zap,
} from "lucide-react";

export interface NavItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  adminOnly?: boolean;
}

export const ALL_NAV_ITEMS: NavItem[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "대시보드", path: "/" },
  { id: "ec2", icon: Server, label: "EC2 인스턴스", path: "/ec2" },
  { id: "rds", icon: Database, label: "RDS 데이터베이스", path: "/rds" },
  { id: "s3", icon: Layers, label: "S3 버킷", path: "/s3" },
  { id: "vpc", icon: Globe, label: "VPC 네트워크", path: "/vpc" },
  { id: "network-topology", icon: Network, label: "네트워크 토폴로지", path: "/network-topology", adminOnly: true },
  { id: "iam", icon: Shield, label: "IAM 정책", path: "/iam" },
  { id: "modules", icon: Tags, label: "모듈 관리", path: "/modules" },
  { id: "templates", icon: Box, label: "템플릿", path: "/templates" },
  { id: "eks-upgrade", icon: Zap, label: "EKS 업그레이드", path: "/eks-upgrade", adminOnly: true },
  { id: "admin-settings", icon: Building2, label: "Admin 설정", path: "/admin-settings", adminOnly: true },
];
