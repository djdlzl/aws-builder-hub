import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TagModule } from "@/types/module";
import { Edit, Trash2 } from "lucide-react";

interface ModuleCardProps {
  module: TagModule;
  isAdmin?: boolean;
  onEdit?: (module: TagModule) => void;
  onDelete?: (module: TagModule) => void;
}

const typeLabels: Record<TagModule["moduleType"], string> = {
  TAG: "태그",
  OPTION: "옵션",
  SECURITY_GROUP: "보안",
};

const typeColors: Record<TagModule["moduleType"], string> = {
  TAG: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  OPTION: "bg-green-500/10 text-green-400 border-green-500/20",
  SECURITY_GROUP: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

export function ModuleCard({
  module,
  isAdmin,
  onEdit,
  onDelete,
}: ModuleCardProps) {
  const updatedAt = module.updatedAt
    ? new Date(module.updatedAt).toLocaleDateString("ko-KR")
    : "-";
  const description = module.description ?? "설명이 없습니다.";

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-glow">
      <div className="absolute inset-0 gradient-glow opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <Badge className={typeColors[module.moduleType]}>
              {typeLabels[module.moduleType]}
            </Badge>
            <h4 className="mt-3 text-lg font-semibold text-foreground">
              {module.name}
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span>{module.items.length}개 항목</span>
          <span>•</span>
          <span>수정: {updatedAt}</span>
        </div>

        {isAdmin && (
          <div className="mt-4 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onEdit?.(module)}
            >
              <Edit className="h-4 w-4 mr-2" />
              편집
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-destructive hover:text-destructive"
              onClick={() => onDelete?.(module)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
