import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import SsoSettings from "@/components/settings/SsoSettings";
import AwsAccountSettings from "@/components/settings/AwsAccountSettings";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const isAdmin = localStorage.getItem("user_role") === "ADMIN";

  const themeOptions = [
    { value: "light" as const, label: "라이트", icon: Sun },
    { value: "dark" as const, label: "다크", icon: Moon },
    { value: "system" as const, label: "시스템", icon: Monitor },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">설정</h1>
        <p className="text-muted-foreground mt-1">앱 설정을 관리합니다</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">
            테마 설정
          </h3>
          <div className="space-y-3">
            <Label>테마 모드</Label>
            <div className="flex gap-3">
              {themeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant="outline"
                  className={cn(
                    "flex-1 h-20 flex-col gap-2",
                    theme === option.value &&
                      "border-primary bg-primary/10 text-primary"
                  )}
                  onClick={() => setTheme(option.value)}
                >
                  <option.icon className="h-6 w-6" />
                  <span>{option.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <>
          <div className="rounded-xl border border-border bg-card p-6">
            <AwsAccountSettings />
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <SsoSettings />
          </div>
        </>
      )}
    </div>
  );
}
