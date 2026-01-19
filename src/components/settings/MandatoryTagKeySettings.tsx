import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  createMandatoryTagKey,
  deleteMandatoryTagKey,
  fetchMandatoryTagKeys,
  updateMandatoryTagKey,
} from "@/lib/api/tag-modules";
import type { MandatoryTagKey } from "@/types/module";
import { Loader2, Pencil, Plus, Save, Tag, Trash2, X } from "lucide-react";

const statusStyles = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  inactive: "bg-muted text-muted-foreground border-muted",
};

export default function MandatoryTagKeySettings() {
  const { toast } = useToast();
  const [tagKeys, setTagKeys] = useState<MandatoryTagKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ tagKey: "", description: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchMandatoryTagKeys();
      setTagKeys(data);
    } catch (error) {
      toast({
        title: "불러오기 실패",
        description:
          error instanceof Error
            ? error.message
            : "필수 태그 키 목록을 불러오지 못했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedKey = form.tagKey.trim();

    if (!normalizedKey) {
      toast({
        title: "입력 오류",
        description: "태그 키를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      await createMandatoryTagKey({
        tagKey: normalizedKey,
        description: form.description.trim() || null,
      });
      toast({
        title: "등록 완료",
        description: "필수 태그 키가 추가되었습니다.",
      });
      setForm({ tagKey: "", description: "" });
      setShowForm(false);
      await loadKeys();
    } catch (error) {
      toast({
        title: "등록 실패",
        description:
          error instanceof Error
            ? error.message
            : "필수 태그 키 추가에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const startEdit = (key: MandatoryTagKey) => {
    setEditingId(key.id);
    setEditDescription(key.description ?? "");
    setEditActive(key.isActive);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDescription("");
    setEditActive(true);
  };

  const handleSave = async (id: number) => {
    setSavingId(id);
    try {
      await updateMandatoryTagKey(id, {
        description: editDescription.trim() || null,
        isActive: editActive,
      });
      toast({
        title: "저장 완료",
        description: "필수 태그 키가 업데이트되었습니다.",
      });
      await loadKeys();
      cancelEdit();
    } catch (error) {
      toast({
        title: "저장 실패",
        description:
          error instanceof Error
            ? error.message
            : "필수 태그 키 수정에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (key: MandatoryTagKey) => {
    if (!confirm(`필수 태그 키 '${key.tagKey}'을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteMandatoryTagKey(key.id);
      toast({
        title: "삭제 완료",
        description: "필수 태그 키가 삭제되었습니다.",
      });
      await loadKeys();
    } catch (error) {
      toast({
        title: "삭제 실패",
        description:
          error instanceof Error
            ? error.message
            : "필수 태그 키 삭제에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Tag className="h-5 w-5" />
            필수 태그 키 관리
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            모든 태그 모듈에 자동 포함되는 필수 태그 키를 관리합니다.
          </p>
        </div>
        <Button onClick={() => setShowForm((prev) => !prev)} size="sm">
          <Plus className="h-4 w-4 mr-2" />새 키 추가
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-border bg-muted/30 p-4 space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tagKey">태그 키 *</Label>
              <Input
                id="tagKey"
                value={form.tagKey}
                onChange={(event) =>
                  setForm({ ...form, tagKey: event.target.value })
                }
                placeholder="예: CostCenter"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagDescription">설명 (선택)</Label>
              <Input
                id="tagDescription"
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="태그 키에 대한 설명"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setForm({ tagKey: "", description: "" });
              }}
            >
              취소
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                "추가"
              )}
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tagKeys.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
          등록된 필수 태그 키가 없습니다.
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>태그 키</TableHead>
                <TableHead>설명</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tagKeys.map((key) => {
                const isEditing = editingId === key.id;
                return (
                  <TableRow key={key.id}>
                    <TableCell>
                      <Badge variant="outline">{key.tagKey}</Badge>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editDescription}
                          onChange={(event) =>
                            setEditDescription(event.target.value)
                          }
                          placeholder="설명을 입력하세요"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {key.description || "-"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={editActive}
                            onCheckedChange={setEditActive}
                          />
                          <span className="text-xs text-muted-foreground">
                            {editActive ? "활성" : "비활성"}
                          </span>
                        </div>
                      ) : (
                        <Badge
                          className={
                            key.isActive
                              ? statusStyles.active
                              : statusStyles.inactive
                          }
                        >
                          {key.isActive ? "활성" : "비활성"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleSave(key.id)}
                              disabled={savingId === key.id}
                            >
                              {savingId === key.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEdit}
                              disabled={savingId === key.id}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(key)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(key)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
