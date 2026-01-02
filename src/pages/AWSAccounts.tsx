import { useState } from "react";
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
import { Plus, RefreshCw, Trash2, CheckCircle, XCircle, Clock, Building2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AWSAccountConnection } from "@/types/auth";
import { API_CONFIG, buildApiUrl } from "@/config/api";
import { useAuth } from "@/hooks/use-auth";

// Mock data for demo
const mockAccounts: AWSAccountConnection[] = [
  {
    id: "1",
    accountId: "123456789012",
    accountName: "Production",
    roleArn: "arn:aws:iam::123456789012:role/CloudForgeRole",
    status: "connected",
    lastVerified: "2024-01-15T10:30:00Z",
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "admin@cloudforge.io",
  },
  {
    id: "2",
    accountId: "234567890123",
    accountName: "Staging",
    roleArn: "arn:aws:iam::234567890123:role/CloudForgeRole",
    status: "connected",
    lastVerified: "2024-01-15T09:00:00Z",
    createdAt: "2024-01-02T00:00:00Z",
    createdBy: "admin@cloudforge.io",
  },
  {
    id: "3",
    accountId: "345678901234",
    accountName: "Development",
    roleArn: "arn:aws:iam::345678901234:role/CloudForgeRole",
    status: "pending",
    createdAt: "2024-01-10T00:00:00Z",
    createdBy: "admin@cloudforge.io",
  },
];

export default function AWSAccounts() {
  const [accounts, setAccounts] = useState<AWSAccountConnection[]>(mockAccounts);
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

  const handleCreateAccount = async () => {
    if (!newAccount.accountId || !newAccount.accountName || !newAccount.roleArn) {
      toast({
        title: "입력 오류",
        description: "필수 필드를 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      // In production, this would call the backend API
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AWS_ACCOUNTS.CREATE), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cloudforge_auth_token')}`,
        },
        body: JSON.stringify(newAccount),
      });

      if (response.ok) {
        const createdAccount = await response.json();
        setAccounts([...accounts, createdAccount]);
      } else {
        throw new Error('Failed to create account');
      }
    } catch (error) {
      // Demo mode: add mock account
      const mockNewAccount: AWSAccountConnection = {
        id: Date.now().toString(),
        ...newAccount,
        status: "pending",
        createdAt: new Date().toISOString(),
        createdBy: user?.email || "unknown",
      };
      setAccounts([...accounts, mockNewAccount]);
    }

    toast({
      title: "계정 추가됨",
      description: `${newAccount.accountName} 계정이 추가되었습니다. Assume Role 확인을 진행해주세요.`,
    });

    setNewAccount({ accountId: "", accountName: "", roleArn: "", externalId: "" });
    setIsDialogOpen(false);
  };

  const handleVerifyAccount = async (account: AWSAccountConnection) => {
    setIsVerifying(account.id);

    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.AWS_ACCOUNTS.VERIFY, { id: account.id }),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('cloudforge_auth_token')}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setAccounts(accounts.map(a => 
          a.id === account.id 
            ? { ...a, status: result.success ? 'connected' : 'failed', lastVerified: new Date().toISOString() }
            : a
        ));
      } else {
        throw new Error('Verification failed');
      }
    } catch (error) {
      // Demo mode: simulate verification
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const success = Math.random() > 0.3; // 70% success rate for demo
      setAccounts(accounts.map(a => 
        a.id === account.id 
          ? { ...a, status: success ? 'connected' : 'failed', lastVerified: new Date().toISOString() }
          : a
      ));

      toast({
        title: success ? "연결 확인 완료" : "연결 실패",
        description: success 
          ? `${account.accountName} 계정의 Assume Role이 확인되었습니다.`
          : `${account.accountName} 계정의 Assume Role 확인에 실패했습니다. IAM 설정을 확인해주세요.`,
        variant: success ? "default" : "destructive",
      });
    }

    setIsVerifying(null);
  };

  const handleDeleteAccount = (accountId: string) => {
    setAccounts(accounts.filter(a => a.id !== accountId));
    toast({
      title: "계정 삭제됨",
      description: "AWS 계정 연결이 삭제되었습니다.",
    });
  };

  const getStatusBadge = (status: AWSAccountConnection['status']) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" /> 연결됨</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> 실패</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> 대기중</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AWS 계정 관리</h1>
          <p className="text-muted-foreground mt-1">멀티 어카운트 환경을 위한 AWS 계정 연결 관리</p>
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
                  onChange={(e) => setNewAccount({ ...newAccount, accountId: e.target.value })}
                  maxLength={12}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountName">계정 이름 *</Label>
                <Input
                  id="accountName"
                  placeholder="Production"
                  value={newAccount.accountName}
                  onChange={(e) => setNewAccount({ ...newAccount, accountName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roleArn">Role ARN *</Label>
                <Input
                  id="roleArn"
                  placeholder="arn:aws:iam::123456789012:role/CloudForgeRole"
                  value={newAccount.roleArn}
                  onChange={(e) => setNewAccount({ ...newAccount, roleArn: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="externalId">External ID (선택)</Label>
                <Input
                  id="externalId"
                  placeholder="외부 ID"
                  value={newAccount.externalId}
                  onChange={(e) => setNewAccount({ ...newAccount, externalId: e.target.value })}
                />
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
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleCreateAccount}>
                  계정 추가
                </Button>
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
              <TableRow key={account.id} className="border-border hover:bg-muted/50">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">{account.accountName}</span>
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
                    ? new Date(account.lastVerified).toLocaleString('ko-KR')
                    : '-'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleVerifyAccount(account)}
                      disabled={isVerifying === account.id}
                    >
                      <RefreshCw className={`h-4 w-4 ${isVerifying === account.id ? 'animate-spin' : ''}`} />
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
        <h3 className="text-lg font-semibold text-foreground mb-4">Assume Role 연동 방법</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">1</div>
            <h4 className="font-medium text-foreground">IAM Role 생성</h4>
            <p className="text-sm text-muted-foreground">
              대상 AWS 계정에 CloudForge가 사용할 IAM Role을 생성합니다.
            </p>
          </div>
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">2</div>
            <h4 className="font-medium text-foreground">신뢰 정책 설정</h4>
            <p className="text-sm text-muted-foreground">
              CloudForge 계정이 Role을 Assume할 수 있도록 신뢰 정책을 설정합니다.
            </p>
          </div>
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">3</div>
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
