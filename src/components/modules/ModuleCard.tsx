import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Copy } from "lucide-react";

interface ModuleCardProps {
  id: string;
  name: string;
  description: string;
  type: "tags" | "options" | "security";
  itemCount: number;
  lastUpdated: string;
}

const typeLabels = {
  tags: "태그",
  options: "옵션",
  security: "보안",
};

const typeColors = {
  tags: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  options: "bg-green-500/10 text-green-400 border-green-500/20",
  security: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

export function ModuleCard({ id, name, description, type, itemCount, lastUpdated }: ModuleCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-glow">
      <div className="absolute inset-0 gradient-glow opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <Badge className={typeColors[type]}>{typeLabels[type]}</Badge>
            <h4 className="mt-3 text-lg font-semibold text-foreground">{name}</h4>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span>{itemCount}개 항목</span>
          <span>•</span>
          <span>수정: {lastUpdated}</span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Edit className="h-4 w-4 mr-2" />
            편집
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
