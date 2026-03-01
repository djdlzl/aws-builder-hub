import { useMemo, useState } from "react";
import { Copy, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface ClusterMarkdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  markdown: string;
}

export function ClusterMarkdownDialog({ open, onOpenChange, title, markdown }: ClusterMarkdownDialogProps) {
  const { toast } = useToast();
  const [isCopying, setIsCopying] = useState(false);

  const lineCount = useMemo(() => markdown.split(/\r?\n/).length, [markdown]);

  const handleCopy = async () => {
    try {
      setIsCopying(true);
      await navigator.clipboard.writeText(markdown);
      toast({ title: "Markdown 복사 완료" });
    } catch (error) {
      toast({
        title: "복사 실패",
        description: error instanceof Error ? error.message : "클립보드 복사 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[960px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Confluence 편집기에 그대로 붙여넣을 Markdown 미리보기입니다. ({lineCount} lines)</p>
          <Textarea
            value={markdown}
            readOnly
            className="min-h-[520px] resize-none font-mono text-xs leading-5"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
          <Button onClick={handleCopy} disabled={isCopying || markdown.trim().length === 0} className="gap-1.5">
            {isCopying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            복사
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
