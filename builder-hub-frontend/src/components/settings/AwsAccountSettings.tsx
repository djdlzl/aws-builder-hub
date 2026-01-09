import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Cloud,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_CONFIG, buildApiUrl } from "@/config/api";

interface AwsAccount {
  id: number;
  accountId: string;
  accountName: string;
  roleArn: string;
  externalId?: string;
  description?: string;
  status: "PENDING" | "VERIFIED" | "FAILED" | "DISABLED";
  lastVerifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateAccountForm {
  accountId: string;
  accountName: string;
  roleArn: string;
  externalId: string;
  description: string;
}

const initialForm: CreateAccountForm = {
  accountId: "",
  accountName: "",
  roleArn: "",
  externalId: "",
  description: "",
};

const statusStyles: Record<string, string> = {
  VERIFIED: "bg-success/10 text-success border-success/20",
  PENDING: "bg-warning/10 text-warning border-warning/20",
  FAILED: "bg-destructive/10 text-destructive border-destructive/20",
  DISABLED: "bg-muted text-muted-foreground border-muted",
};

const statusLabels: Record<string, string> = {
  VERIFIED: "연결됨",
  PENDING: "대기중",
  FAILED: "실패",
  DISABLED: "비활성화",
};

export default function AwsAccountSettings() {
  const [accounts, setAccounts] = useState<AwsAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateAccountForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const { toast } = useToast();

  const getAuthHeaders = () => {
    const token = localStorage.getItem("access_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.AWS_ACCOUNTS.LIST),
        { headers: getAuthHeaders() }
      );
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.results || []);
      }
    } catch (error) {
      console.error("Failed to fetch AWS accounts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.AWS_ACCOUNTS.CREATE),
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            accountId: form.accountId,
            accountName: form.accountName,
            roleArn: form.roleArn,
            externalId: form.externalId || null,
            description: form.description || null,
          }),
        }
      );

      if (response.ok) {
        toast({
          title: "AWS 계정 추가됨",
          description: "새 AWS 계정이 성공적으로 추가되었습니다.",
        });
        setForm(initialForm);
        setShowForm(false);
        fetchAccounts();
      } else {
        const error = await response.json();
        toast({
          title: "오류",
          description: error.message || "계정 추가에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "서버 연결에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (id: number) => {
    setVerifyingId(id);
    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.AWS_ACCOUNTS.VERIFY, {
          id: String(id),
        }),
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();
      if (data.result?.success) {
        toast({
          title: "검증 성공",
          description: "AWS 계정이 성공적으로 검증되었습니다.",
        });
      } else {
        toast({
          title: "검증 실패",
          description: data.result?.message || "계정 검증에 실패했습니다.",
          variant: "destructive",
        });
      }
      fetchAccounts();
    } catch (error) {
      toast({
        title: "오류",
        description: "검증 요청에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말로 이 AWS 계정을 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.AWS_ACCOUNTS.DELETE, {
          id: String(id),
        }),
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        toast({
          title: "삭제됨",
          description: "AWS 계정이 삭제되었습니다.",
        });
        fetchAccounts();
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "삭제에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            AWS 계정 관리
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Assume Role을 통해 AWS 계정을 연결하고 관리합니다.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          계정 추가
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="p-4 rounded-lg border border-border bg-muted/30 space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="accountId">AWS Account ID *</Label>
              <Input
                id="accountId"
                placeholder="123456789012"
                value={form.accountId}
                onChange={(e) =>
                  setForm({ ...form, accountId: e.target.value })
                }
                pattern="^[0-9]{12}$"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountName">계정 이름 *</Label>
              <Input
                id="accountName"
                placeholder="Production Account"
                value={form.accountName}
                onChange={(e) =>
                  setForm({ ...form, accountName: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="roleArn">Role ARN *</Label>
            <Input
              id="roleArn"
              placeholder="arn:aws:iam::123456789012:role/CloudForgeRole"
              value={form.roleArn}
              onChange={(e) => setForm({ ...form, roleArn: e.target.value })}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="externalId">External ID (선택)</Label>
              <Input
                id="externalId"
                placeholder="선택사항"
                value={form.externalId}
                onChange={(e) =>
                  setForm({ ...form, externalId: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">설명 (선택)</Label>
              <Input
                id="description"
                placeholder="계정에 대한 설명"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setForm(initialForm);
              }}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  추가 중...
                </>
              ) : (
                "계정 추가"
              )}
            </Button>
          </div>
        </form>
      )}

      {accounts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>연결된 AWS 계정이 없습니다.</p>
          <p className="text-sm">
            위의 '계정 추가' 버튼을 클릭하여 AWS 계정을 연결하세요.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="p-4 rounded-lg border border-border bg-card flex items-center justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {account.accountName}
                  </span>
                  <Badge className={statusStyles[account.status]}>
                    {statusLabels[account.status]}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground space-x-4">
                  <span>ID: {account.accountId}</span>
                  {account.lastVerifiedAt && (
                    <span>
                      마지막 검증:{" "}
                      {new Date(account.lastVerifiedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVerify(account.id)}
                  disabled={verifyingId === account.id}
                >
                  {verifyingId === account.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(account.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
