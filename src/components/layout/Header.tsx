import { Bell, Search, User, Building2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAWSContext } from "@/hooks/use-aws-context";

export function Header() {
  const { accounts, regions, selectedAccount, selectedRegion, setSelectedAccount, setSelectedRegion } = useAWSContext();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-lg px-6">
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select
              value={selectedAccount?.id}
              onValueChange={(value) => {
                const account = accounts.find((a) => a.id === value);
                if (account) setSelectedAccount(account);
              }}
            >
              <SelectTrigger className="w-[160px] h-9 bg-secondary border-border text-sm">
                <SelectValue placeholder="계정 선택" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex flex-col items-start">
                      <span>{account.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{account.accountId}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <Select
              value={selectedRegion?.id}
              onValueChange={(value) => {
                const region = regions.find((r) => r.id === value);
                if (region) setSelectedRegion(region);
              }}
            >
              <SelectTrigger className="w-[180px] h-9 bg-secondary border-border text-sm">
                <SelectValue placeholder="리전 선택" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {regions.map((region) => (
                  <SelectItem key={region.id} value={region.id}>
                    <div className="flex flex-col items-start">
                      <span>{region.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{region.code}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="relative max-w-md flex-1 ml-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="리소스 검색..."
            className="pl-10 bg-secondary border-border focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold flex items-center justify-center text-destructive-foreground">
            3
          </span>
        </Button>
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>
    </header>
  );
}