import { useCallback, useEffect, useMemo, useState } from "react";
import { CreateModuleDialog } from "@/components/modules/CreateModuleDialog";
import { ModuleCard } from "@/components/modules/ModuleCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  createTagModule,
  deleteTagModule,
  fetchActiveMandatoryTagKeys,
  fetchTagModules,
  updateTagModule,
} from "@/lib/api/tag-modules";
import type {
  MandatoryTagKey,
  TagModule,
  TagModulePayload,
} from "@/types/module";
import { Plus } from "lucide-react";

const tabFilters = {
  tags: "TAG",
  options: "OPTION",
  security: "SECURITY_GROUP",
} as const;

export default function Modules() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [modules, setModules] = useState<TagModule[]>([]);
  const [mandatoryKeys, setMandatoryKeys] = useState<MandatoryTagKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<TagModule | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredModules = useMemo(() => {
    return {
      all: modules,
      tags: modules.filter((module) => module.moduleType === tabFilters.tags),
      options: modules.filter(
        (module) => module.moduleType === tabFilters.options
      ),
      security: modules.filter(
        (module) => module.moduleType === tabFilters.security
      ),
    };
  }, [modules]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [moduleList, mandatoryList] = await Promise.all([
        fetchTagModules(),
        fetchActiveMandatoryTagKeys(),
      ]);
      setModules(moduleList);
      setMandatoryKeys(mandatoryList);
    } catch (error) {
      toast({
        title: "불러오기 실패",
        description:
          error instanceof Error
            ? error.message
            : "모듈 정보를 불러오지 못했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingModule(null);
    }
  };

  const handleCreate = async (payload: TagModulePayload) => {
    setIsSubmitting(true);
    try {
      await createTagModule(payload);
      toast({
        title: "모듈 생성 완료",
        description: "새 태그 모듈이 생성되었습니다.",
      });
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: number, payload: TagModulePayload) => {
    setIsSubmitting(true);
    try {
      await updateTagModule(id, payload);
      toast({
        title: "모듈 수정 완료",
        description: "태그 모듈이 저장되었습니다.",
      });
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (module: TagModule) => {
    if (!confirm(`모듈 '${module.name}'을 삭제하시겠습니까?`)) {
      return;
    }
    try {
      await deleteTagModule(module.id);
      toast({
        title: "모듈 삭제 완료",
        description: "태그 모듈이 삭제되었습니다.",
      });
      await loadData();
    } catch (error) {
      toast({
        title: "삭제 실패",
        description:
          error instanceof Error ? error.message : "모듈 삭제에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">모듈 관리</h1>
          <p className="text-muted-foreground mt-1">
            재사용 가능한 태그 모듈을 관리합니다
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />새 모듈 생성
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="tags">태그</TabsTrigger>
          <TabsTrigger value="options">옵션</TabsTrigger>
          <TabsTrigger value="security">보안</TabsTrigger>
        </TabsList>

        {(["all", "tags", "options", "security"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {isLoading ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                모듈을 불러오는 중입니다...
              </div>
            ) : filteredModules[tab].length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                아직 등록된 모듈이 없습니다.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredModules[tab].map((module) => (
                  <ModuleCard
                    key={module.id}
                    module={module}
                    isAdmin={isAdmin}
                    onEdit={(target) => {
                      setEditingModule(target);
                      setDialogOpen(true);
                    }}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {isAdmin && (
        <CreateModuleDialog
          open={dialogOpen}
          onOpenChange={handleOpenChange}
          mandatoryKeys={mandatoryKeys}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          module={editingModule}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
