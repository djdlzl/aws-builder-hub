import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  MoreHorizontal,
  Upload,
  Download,
  Folder,
  File,
  Layers,
  Lock,
  Globe,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ModulePreview } from "@/components/modules/ModulePreview";

interface S3Bucket {
  name: string;
  region: string;
  createdAt: string;
  access: "private" | "public";
  objectCount: number;
  size: string;
}

interface S3Object {
  key: string;
  type: "folder" | "file";
  size?: string;
  lastModified?: string;
}

const buckets: S3Bucket[] = [
  { name: "prod-assets-bucket", region: "ap-northeast-2", createdAt: "2023-06-15", access: "private", objectCount: 15420, size: "125.3 GB" },
  { name: "prod-logs-bucket", region: "ap-northeast-2", createdAt: "2023-06-15", access: "private", objectCount: 892156, size: "2.1 TB" },
  { name: "static-website-bucket", region: "ap-northeast-2", createdAt: "2023-08-20", access: "public", objectCount: 234, size: "1.2 GB" },
  { name: "backup-data-bucket", region: "ap-northeast-1", createdAt: "2023-04-10", access: "private", objectCount: 1523, size: "450 GB" },
];

const objects: S3Object[] = [
  { key: "images/", type: "folder" },
  { key: "documents/", type: "folder" },
  { key: "backups/", type: "folder" },
  { key: "config.json", type: "file", size: "2.4 KB", lastModified: "2024-01-15 10:30" },
  { key: "data.csv", type: "file", size: "15.2 MB", lastModified: "2024-01-14 15:45" },
  { key: "report.pdf", type: "file", size: "3.8 MB", lastModified: "2024-01-13 09:20" },
];

export default function S3() {
  const [createOpen, setCreateOpen] = useState(false);
  const [bucketName, setBucketName] = useState("");
  const [bucketRegion, setBucketRegion] = useState("");
  const [accessType, setAccessType] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);

  const handleCreate = () => {
    if (!bucketName || !bucketRegion) {
      toast.error("필수 항목을 입력해주세요.");
      return;
    }
    toast.success("S3 버킷 생성이 완료되었습니다.");
    setCreateOpen(false);
    setBucketName("");
    setBucketRegion("");
    setAccessType("");
    setSelectedModule("");
  };

  const handleUpload = () => {
    toast.success("파일 업로드가 시작되었습니다.");
  };

  const handleDownload = (key: string) => {
    toast.success(`${key} 다운로드가 시작되었습니다.`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">S3 버킷</h1>
          <p className="text-muted-foreground mt-1">오브젝트 스토리지 버킷을 관리합니다</p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              버킷 생성
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">새 S3 버킷 생성</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                새로운 S3 버킷을 생성합니다.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="bucket-name">버킷 이름</Label>
                <Input
                  id="bucket-name"
                  value={bucketName}
                  onChange={(e) => setBucketName(e.target.value)}
                  placeholder="예: my-app-assets"
                  className="bg-secondary border-border"
                />
                <p className="text-xs text-muted-foreground">
                  버킷 이름은 전역적으로 고유해야 합니다
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>리전</Label>
                  <Select value={bucketRegion} onValueChange={setBucketRegion}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="리전 선택" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="ap-northeast-2">Asia Pacific (Seoul)</SelectItem>
                      <SelectItem value="ap-northeast-1">Asia Pacific (Tokyo)</SelectItem>
                      <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                      <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>접근 권한</Label>
                  <Select value={accessType} onValueChange={setAccessType}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="권한 선택" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="private">프라이빗</SelectItem>
                      <SelectItem value="public">퍼블릭</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>모듈 적용</Label>
                <Select value={selectedModule} onValueChange={setSelectedModule}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="모듈 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="production-tags">production-tags</SelectItem>
                    <SelectItem value="staging-tags">staging-tags</SelectItem>
                    <SelectItem value="s3-encryption-options">s3-encryption-options</SelectItem>
                    <SelectItem value="s3-lifecycle-policy">s3-lifecycle-policy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedModule && <ModulePreview moduleName={selectedModule} />}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                취소
              </Button>
              <Button onClick={handleCreate}>생성</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="buckets" className="space-y-4">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="buckets">버킷 목록</TabsTrigger>
          <TabsTrigger value="browser">파일 브라우저</TabsTrigger>
        </TabsList>

        <TabsContent value="buckets" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="버킷 검색..."
                className="pl-10 bg-secondary border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {buckets.map((bucket) => (
              <div
                key={bucket.name}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-glow cursor-pointer"
                onClick={() => setSelectedBucket(bucket.name)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Layers className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{bucket.name}</h4>
                      <p className="text-sm text-muted-foreground">{bucket.region}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="flex items-center gap-1">
                    {bucket.access === "private" ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      <Globe className="h-3 w-3" />
                    )}
                    {bucket.access === "private" ? "프라이빗" : "퍼블릭"}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">객체 수</p>
                    <p className="font-medium text-foreground">{bucket.objectCount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">크기</p>
                    <p className="font-medium text-foreground">{bucket.size}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">생성일</p>
                    <p className="font-medium text-foreground">{bucket.createdAt}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="browser" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Select defaultValue={buckets[0].name}>
                <SelectTrigger className="w-[250px] bg-secondary border-border">
                  <SelectValue placeholder="버킷 선택" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {buckets.map((bucket) => (
                    <SelectItem key={bucket.name} value={bucket.name}>
                      {bucket.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="파일 검색..."
                  className="pl-10 bg-secondary border-border"
                />
              </div>
            </div>
            <Button onClick={handleUpload}>
              <Upload className="h-4 w-4 mr-2" />
              업로드
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">이름</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">유형</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">크기</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">수정일</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {objects.map((obj) => (
                  <tr key={obj.key} className="hover:bg-accent/50 transition-colors cursor-pointer">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {obj.type === "folder" ? (
                          <Folder className="h-5 w-5 text-yellow-400" />
                        ) : (
                          <File className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium text-foreground">{obj.key}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant="outline" className="text-xs">
                        {obj.type === "folder" ? "폴더" : "파일"}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-muted-foreground">{obj.size || "-"}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-muted-foreground">{obj.lastModified || "-"}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {obj.type === "file" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(obj.key)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}