import { useState, useEffect, useCallback } from "react";
import { Bell, Search, User, Building2, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { API_CONFIG, buildApiUrl } from "@/config/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAWSContext } from "@/hooks/use-aws-context";

interface SearchResult {
  id: string;
  name: string;
  type: "EC2" | "RDS" | "S3" | "VPC";
  status?: string;
  accountName?: string;
  region?: string;
}

export function Header() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("access_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const results: SearchResult[] = [];

    try {
      // Demo mode check
      const isDemoAdmin =
        localStorage.getItem("cloudforge_auth_token") ===
        "mock-token-admin-demo";
      const isMockAdmin =
        localStorage.getItem("cloudforge_auth_token") === "mock-token-admin";

      if (isDemoAdmin || isMockAdmin) {
        // Demo search results
        const demoResults: SearchResult[] = [
          {
            id: "i-1234567890abcdef0",
            name: "demo-web-server-01",
            type: "EC2",
            status: "running",
            accountName: "Demo Production",
            region: "ap-northeast-2",
          },
          {
            id: "demo-prod-mysql",
            name: "demo-prod-mysql",
            type: "RDS",
            status: "available",
            accountName: "Demo Production",
            region: "ap-northeast-2",
          },
          {
            id: "demo-bucket",
            name: "demo-static-assets",
            type: "S3",
            accountName: "Demo Production",
            region: "ap-northeast-2",
          },
        ];
        const filtered = demoResults.filter(
          (r) =>
            r.name.toLowerCase().includes(query.toLowerCase()) ||
            r.id.toLowerCase().includes(query.toLowerCase()),
        );
        setSearchResults(filtered);
        setIsSearching(false);
        return;
      }

      // Fetch from all resource types
      const [ec2Res, rdsRes, s3Res] = await Promise.all([
        fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AWS_RESOURCES.EC2), {
          headers: getAuthHeaders(),
        }),
        fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AWS_RESOURCES.RDS), {
          headers: getAuthHeaders(),
        }),
        fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AWS_RESOURCES.S3), {
          headers: getAuthHeaders(),
        }),
      ]);

      if (ec2Res.ok) {
        const data = await ec2Res.json();
        (data.results || []).forEach(
          (inst: {
            instanceId: string;
            name?: string;
            state: string;
            accountName?: string;
            region?: string;
          }) => {
            if (
              inst.name?.toLowerCase().includes(query.toLowerCase()) ||
              inst.instanceId?.toLowerCase().includes(query.toLowerCase())
            ) {
              results.push({
                id: inst.instanceId,
                name: inst.name || inst.instanceId,
                type: "EC2",
                status: inst.state,
                accountName: inst.accountName,
                region: inst.region,
              });
            }
          },
        );
      }

      if (rdsRes.ok) {
        const data = await rdsRes.json();
        (data.results || []).forEach(
          (inst: {
            dbInstanceIdentifier: string;
            status: string;
            accountName?: string;
            region?: string;
          }) => {
            if (
              inst.dbInstanceIdentifier
                ?.toLowerCase()
                .includes(query.toLowerCase())
            ) {
              results.push({
                id: inst.dbInstanceIdentifier,
                name: inst.dbInstanceIdentifier,
                type: "RDS",
                status: inst.status,
                accountName: inst.accountName,
                region: inst.region,
              });
            }
          },
        );
      }

      if (s3Res.ok) {
        const data = await s3Res.json();
        (data.results || []).forEach(
          (bucket: { name: string; accountName?: string; region?: string }) => {
            if (bucket.name?.toLowerCase().includes(query.toLowerCase())) {
              results.push({
                id: bucket.name,
                name: bucket.name,
                type: "S3",
                accountName: bucket.accountName,
                region: bucket.region,
              });
            }
          },
        );
      }

      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, performSearch]);

  const handleResultClick = (result: SearchResult) => {
    setShowResults(false);
    setSearchQuery("");
    switch (result.type) {
      case "EC2":
        navigate("/ec2");
        break;
      case "RDS":
        navigate("/rds");
        break;
      case "S3":
        navigate("/s3");
        break;
      default:
        navigate("/dashboard");
    }
  };
  const {
    accounts,
    regions,
    selectedAccount,
    selectedRegion,
    setSelectedAccount,
    setSelectedRegion,
  } = useAWSContext();

  const hasAccounts = accounts.length > 0;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-lg px-6">
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-3">
          {hasAccounts && (
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
                        <span className="text-xs text-muted-foreground font-mono">
                          {account.accountId}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {hasAccounts && (
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
                        <span className="text-xs text-muted-foreground font-mono">
                          {region.code}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="relative max-w-md flex-1 ml-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="전체 리소스 검색 (EC2, RDS, S3)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            className="pl-10 bg-secondary border-border focus:ring-primary"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
          )}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-auto">
              {searchResults.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full px-4 py-3 text-left hover:bg-accent flex items-center justify-between border-b border-border last:border-0"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                        {result.type}
                      </span>
                      <span className="font-medium text-foreground">
                        {result.name}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {result.accountName && <span>{result.accountName}</span>}
                      {result.region && (
                        <span className="ml-2">{result.region}</span>
                      )}
                    </div>
                  </div>
                  {result.status && (
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        result.status === "running" ||
                        result.status === "available"
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {result.status}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          {showResults &&
            searchQuery &&
            searchResults.length === 0 &&
            !isSearching && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 p-4 text-center text-muted-foreground">
                검색 결과가 없습니다
              </div>
            )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>
    </header>
  );
}
