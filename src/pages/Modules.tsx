import { ModuleCard } from "@/components/modules/ModuleCard";
import { CreateModuleDialog } from "@/components/modules/CreateModuleDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const modules = [
  {
    id: "1",
    name: "production-tags",
    description: "프로덕션 환경의 기본 태그 세트",
    type: "tags" as const,
    itemCount: 8,
    lastUpdated: "2024-01-20",
  },
  {
    id: "2",
    name: "staging-tags",
    description: "스테이징 환경의 기본 태그 세트",
    type: "tags" as const,
    itemCount: 6,
    lastUpdated: "2024-01-18",
  },
  {
    id: "3",
    name: "ec2-standard-options",
    description: "EC2 인스턴스 표준 옵션 설정",
    type: "options" as const,
    itemCount: 12,
    lastUpdated: "2024-01-15",
  },
  {
    id: "4",
    name: "rds-ha-options",
    description: "RDS 고가용성 구성 옵션",
    type: "options" as const,
    itemCount: 9,
    lastUpdated: "2024-01-12",
  },
  {
    id: "5",
    name: "security-baseline",
    description: "기본 보안 그룹 설정",
    type: "security" as const,
    itemCount: 15,
    lastUpdated: "2024-01-10",
  },
  {
    id: "6",
    name: "web-tier-security",
    description: "웹 티어 보안 그룹 규칙",
    type: "security" as const,
    itemCount: 8,
    lastUpdated: "2024-01-08",
  },
];

export default function Modules() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">모듈 관리</h1>
          <p className="text-muted-foreground mt-1">
            재사용 가능한 태그, 옵션 및 보안 설정을 관리합니다
          </p>
        </div>
        <CreateModuleDialog />
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="tags">태그</TabsTrigger>
          <TabsTrigger value="options">옵션</TabsTrigger>
          <TabsTrigger value="security">보안</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => (
              <ModuleCard key={module.id} {...module} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tags" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {modules
              .filter((m) => m.type === "tags")
              .map((module) => (
                <ModuleCard key={module.id} {...module} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="options" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {modules
              .filter((m) => m.type === "options")
              .map((module) => (
                <ModuleCard key={module.id} {...module} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {modules
              .filter((m) => m.type === "security")
              .map((module) => (
                <ModuleCard key={module.id} {...module} />
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
