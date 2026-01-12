import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SSMTerminal } from "./SSMTerminal";
import { Terminal } from "lucide-react";

interface TerminalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceId: string;
  instanceName: string;
}

export function TerminalDialog({
  open,
  onOpenChange,
  instanceId,
  instanceName,
}: TerminalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] h-[600px] p-0 bg-card border-border overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Terminal className="h-5 w-5" />
            SSM 터미널 - {instanceName}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 h-[calc(600px-60px)]">
          <SSMTerminal
            instanceId={instanceId}
            instanceName={instanceName}
            onClose={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
