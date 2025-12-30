import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

interface TagItem {
  key: string;
  value: string;
}

export function CreateModuleDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("");
  const [tags, setTags] = useState<TagItem[]>([{ key: "", value: "" }]);

  const addTag = () => {
    setTags([...tags, { key: "", value: "" }]);
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const updateTag = (index: number, field: "key" | "value", value: string) => {
    const newTags = [...tags];
    newTags[index][field] = value;
    setTags(newTags);
  };

  const handleSubmit = () => {
    if (!name || !type) {
      toast.error("필수 항목을 입력해주세요.");
      return;
    }
    toast.success("모듈이 생성되었습니다.");
    setOpen(false);
    setName("");
    setDescription("");
    setType("");
    setTags([{ key: "", value: "" }]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          새 모듈 생성
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">새 모듈 생성</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            재사용 가능한 태그, 옵션 또는 보안 설정 모듈을 생성합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">모듈 이름</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: production-tags"
              className="bg-secondary border-border"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="type">모듈 유형</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="유형 선택" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="tags">태그 모듈</SelectItem>
                <SelectItem value="options">옵션 모듈</SelectItem>
                <SelectItem value="security">보안 모듈</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 모듈에 대한 설명을 입력하세요"
              className="bg-secondary border-border resize-none"
            />
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label>태그 / 옵션 항목</Label>
              <Button variant="outline" size="sm" onClick={addTag}>
                <Plus className="h-4 w-4 mr-1" />
                항목 추가
              </Button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {tags.map((tag, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="키"
                    value={tag.key}
                    onChange={(e) => updateTag(index, "key", e.target.value)}
                    className="bg-secondary border-border flex-1"
                  />
                  <Input
                    placeholder="값"
                    value={tag.value}
                    onChange={(e) => updateTag(index, "value", e.target.value)}
                    className="bg-secondary border-border flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTag(index)}
                    className="h-10 w-10 shrink-0 text-destructive hover:text-destructive"
                    disabled={tags.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit}>생성</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
