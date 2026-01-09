import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  Shield,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AWSAccountConnection } from "@/types/auth";
import { API_CONFIG, buildApiUrl } from "@/config/api";
import { useAuth } from "@/hooks/use-auth";
import { useAWSContext } from "@/hooks/use-aws-context";

export default function AWSAccounts() {
  const [accounts, setAccounts] = useState<AWSAccountConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState<string | null>(null);
  const [newAccount, setNewAccount] = useState({
    accountId: "",
    accountName: "",
    roleArn: "",
    externalId: "",
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const { refreshAccounts } = useAWSContext();

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
        const accountList = (data.results || []).map(
          (acc: {
            id: number;
            accountId: string;
            accountName: string;
            roleArn: string;
            externalId?: string;
            status: string;
            lastVerifiedAt?: string;
            createdAt: string;
          }) => ({
            id: String(acc.id),
            accountId: acc.accountId,
            accountName: acc.accountName,
            roleArn: acc.roleArn,
            externalId: acc.externalId,
            status:
              acc.status === "VERIFIED"
                ? "connected"
                : acc.status === "FAILED"
                  ? "failed"
                  : "pending",
            lastVerified: acc.lastVerifiedAt,
            createdAt: acc.createdAt,
            createdBy: user?.email || "unknown",
          })
        );
        setAccounts(accountList);
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateAccount = async () => {
    if (
      !newAccount.accountId ||
      !newAccount.accountName ||
      !newAccount.roleArn
    ) {
      toast({
        title: "입력 오류",
        description: "필수 필드를 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      // In production, this would call the backend API
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.AWS_ACCOUNTS.CREATE),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem(
              "cloudforge_auth_token"
            )}`,
          },
          body: JSON.stringify(newAccount),
        }
      );

      if (response.ok) {
        toast({
          title: "계정 추가됨",
          description: `${newAccount.accountName} 계정이 추가되었습니다. Assume Role 확인을 진행해주세요.`,
        });
        fetchAccounts();
        refreshAccounts();
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
        title: "연결 오류",
        description: "서버에 연결할 수 없습니다.",
        variant: "destructive",
      });
    }

    setNewAccount({
      accountId: "",
      accountName: "",
      roleArn: "",
      externalId: "",
    });
    setIsDialogOpen(false);
  };

  const handleVerifyAccount = async (account: AWSAccountConnection) => {
    setIsVerifying(account.id);

    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.AWS_ACCOUNTS.VERIFY, {
          id: account.id,
        }),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(
              "cloudforge_auth_token"
            )}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const success = data.result?.success;
        toast({
          title: success ? "연결 확인 완료" : "연결 실패",
          description: success
            ? `${account.accountName} 계정의 Assume Role이 확인되었습니다.`
            : data.result?.message || "IAM 설정을 확인해주세요.",
          variant: success ? "default" : "destructive",
        });
        fetchAccounts();
        refreshAccounts();
      } else {
        toast({
          title: "검증 실패",
          description: "계정 검증에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "연결 오류",
        description: "서버에 연결할 수 없습니다.",
        variant: "destructive",
      });
    }

    setIsVerifying(null);
  };

  const handleDeleteAccount = async (accountId: string) => {
    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.AWS_ACCOUNTS.DELETE, {
          id: accountId,
        }),
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );
      if (response.ok) {
        toast({
          title: "계정 삭제됨",
          description: "AWS 계정 연결이 삭제되었습니다.",
        });
        fetchAccounts();
        refreshAccounts();
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "삭제에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: AWSAccountConnection["status"]) => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" /> 연결됨
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" /> 실패
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" /> 대기중
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AWS 계정 관리</h1>
          <p className="text-muted-foreground mt-1">
            멀티 어카운트 환경을 위한 AWS 계정 연결 관리
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              계정 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>AWS 계정 추가</DialogTitle>
              <DialogDescription>
                Assume Role을 통해 다른 AWS 계정의 리소스에 접근할 수 있습니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="accountId">Account ID *</Label>
                <Input
                  id="accountId"
                  placeholder="123456789012"
                  value={newAccount.accountId}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, accountId: e.target.value })
                  }
                  maxLength={12}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountName">계정 이름 *</Label>
                <Input
                  id="accountName"
                  placeholder="Production"
                  value={newAccount.accountName}
                  onChange={(e) =>
                    setNewAccount({
                      ...newAccount,
                      accountName: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roleArn">Role ARN *</Label>
                <Input
                  id="roleArn"
                  placeholder="arn:aws:iam::123456789012:role/CloudForgeRole"
                  value={newAccount.roleArn}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, roleArn: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="externalId">External ID (선택)</Label>
                <Input
                  id="externalId"
                  placeholder="외부 ID (선택사항)"
                  value={newAccount.externalId}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, externalId: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  추가 보안이 필요한 경우에만 사용하세요. 비워두면 External ID 없이 연결됩니다.
                </p>
              </div>

              {/* IAM Policy Guide */}
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  IAM Role 설정 가이드
                </h4>
                <p className="text-xs text-muted-foreground mb-2">
                  대상 계정에 다음 신뢰 정책을 가진 IAM Role을 생성해주세요:
                </p>
                <pre className="text-xs bg-background p-2 rounded border border-border overflow-x-auto">
                  {`{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::YOUR_ACCOUNT:root"
    },
    "Action": "sts:AssumeRole"
  }]
}`}
                </pre>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  취소
                </Button>
                <Button onClick={handleCreateAccount}>계정 추가</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Accounts Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-muted/50">
              <TableHead>계정</TableHead>
              <TableHead>Account ID</TableHead>
              <TableHead>Role ARN</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>마지막 확인</TableHead>
              <TableHead className="text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow
                key={account.id}
                className="border-border hover:bg-muted/50"
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">
                      {account.accountName}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {account.accountId}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground max-w-[200px] truncate">
                  {account.roleArn}
                </TableCell>
                <TableCell>{getStatusBadge(account.status)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {account.lastVerified
                    ? new Date(account.lastVerified).toLocaleString("ko-KR")
                    : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleVerifyAccount(account)}
                      disabled={isVerifying === account.id}
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${isVerifying === account.id ? "animate-spin" : ""
                          }`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteAccount(account.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Info Card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Assume Role 연동 방법
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
              1
            </div>
            <h4 className="font-medium text-foreground">IAM Role 생성</h4>
            <p className="text-sm text-muted-foreground">
              대상 AWS 계정에 CloudForge가 사용할 IAM Role을 생성합니다.
            </p>
          </div>
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
              2
            </div>
            <h4 className="font-medium text-foreground">신뢰 정책 설정</h4>
            <p className="text-sm text-muted-foreground">
              CloudForge 계정이 Role을 Assume할 수 있도록 신뢰 정책을
              설정합니다.
            </p>
          </div>
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
              3
            </div>
            <h4 className="font-medium text-foreground">연결 확인</h4>
            <p className="text-sm text-muted-foreground">
              계정을 추가하고 Assume Role 연결 확인을 진행합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
