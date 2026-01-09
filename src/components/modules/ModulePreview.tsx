import { Tags, Settings2, Shield } from "lucide-react";

interface ModulePreviewProps {
  moduleName: string;
}

const moduleData: Record<string, { type: string; items: { key: string; value: string }[] }> = {
  "production-tags": {
    type: "tags",
    items: [
      { key: "Environment", value: "Production" },
      { key: "ManagedBy", value: "CloudForge" },
      { key: "Team", value: "Platform" },
      { key: "CostCenter", value: "CC-001" },
    ],
  },
  "staging-tags": {
    type: "tags",
    items: [
      { key: "Environment", value: "Staging" },
      { key: "ManagedBy", value: "CloudForge" },
      { key: "Team", value: "Platform" },
      { key: "AutoShutdown", value: "true" },
    ],
  },
  "ec2-standard-options": {
    type: "options",
    items: [
      { key: "Monitoring", value: "활성화" },
      { key: "EBS 최적화", value: "활성화" },
      { key: "세부 모니터링", value: "활성화" },
      { key: "종료 방지", value: "활성화" },
    ],
  },
  "rds-standard-options": {
    type: "options",
    items: [
      { key: "Multi-AZ", value: "활성화" },
      { key: "자동 백업", value: "7일" },
      { key: "암호화", value: "활성화" },
      { key: "성능 개선 도우미", value: "활성화" },
    ],
  },
  "rds-security-group": {
    type: "security",
    items: [
      { key: "인바운드 규칙", value: "3306 (MySQL) - VPC 내부" },
      { key: "인바운드 규칙", value: "5432 (PostgreSQL) - VPC 내부" },
      { key: "아웃바운드 규칙", value: "전체 허용" },
    ],
  },
  "s3-encryption-options": {
    type: "options",
    items: [
      { key: "서버 측 암호화", value: "SSE-S3" },
      { key: "버전 관리", value: "활성화" },
      { key: "퍼블릭 액세스 차단", value: "활성화" },
    ],
  },
  "s3-lifecycle-policy": {
    type: "options",
    items: [
      { key: "30일 후", value: "Standard-IA로 전환" },
      { key: "90일 후", value: "Glacier로 전환" },
      { key: "365일 후", value: "삭제" },
    ],
  },
};

const typeConfig = {
  tags: { icon: Tags, label: "태그", color: "text-blue-400 bg-blue-500/10" },
  options: { icon: Settings2, label: "옵션", color: "text-green-400 bg-green-500/10" },
  security: { icon: Shield, label: "보안", color: "text-yellow-400 bg-yellow-500/10" },
};

export function ModulePreview({ moduleName }: ModulePreviewProps) {
  const module = moduleData[moduleName];
  
  if (!module) {
    return null;
  }

  const config = typeConfig[module.type as keyof typeof typeConfig];
  const Icon = config.icon;

  return (
    <div className="rounded-lg border border-border bg-secondary/50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${config.color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">모듈 미리보기</p>
          <p className="text-xs text-muted-foreground">{moduleName}</p>
        </div>
      </div>

      <div className="space-y-2">
        {module.items.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-md bg-background/50">
            <span className="text-muted-foreground">{item.key}</span>
            <span className="font-mono text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}