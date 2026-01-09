import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { API_CONFIG, buildApiUrl } from "@/config/api";

interface AWSAccount {
  id: string;
  name: string;
  accountId: string;
}

interface AWSRegion {
  id: string;
  name: string;
  code: string;
}

interface AWSContextType {
  accounts: AWSAccount[];
  regions: AWSRegion[];
  selectedAccount: AWSAccount | null;
  selectedRegion: AWSRegion | null;
  setSelectedAccount: (account: AWSAccount) => void;
  setSelectedRegion: (region: AWSRegion) => void;
  refreshAccounts: () => Promise<void>;
  isLoading: boolean;
}

const defaultRegions: AWSRegion[] = [
  { id: "1", name: "Seoul", code: "ap-northeast-2" },
  { id: "2", name: "Tokyo", code: "ap-northeast-1" },
  { id: "3", name: "Singapore", code: "ap-southeast-1" },
  { id: "4", name: "US East (N. Virginia)", code: "us-east-1" },
  { id: "5", name: "US West (Oregon)", code: "us-west-2" },
  { id: "6", name: "EU (Frankfurt)", code: "eu-central-1" },
];

const AWSContext = createContext<AWSContextType | undefined>(undefined);

export function AWSProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<AWSAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AWSAccount | null>(
    null
  );
  const [selectedRegion, setSelectedRegion] = useState<AWSRegion>(
    defaultRegions[0]
  );
  const [isLoading, setIsLoading] = useState(true);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("access_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchVerifiedAccounts = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setAccounts([]);
      setSelectedAccount(null);
      setIsLoading(false);
      return;
    }

    // Check if admin_demo user is logged in
    const isDemoAdmin =
      localStorage.getItem("cloudforge_auth_token") === "mock-token-admin-demo";
    const isMockAdmin =
      localStorage.getItem("cloudforge_auth_token") === "mock-token-admin";

    if (isDemoAdmin) {
      // Load dummy AWS accounts for admin_demo
      const dummyAccounts: AWSAccount[] = [
        {
          id: "1",
          name: "Demo Production Account",
          accountId: "123456789012",
        },
        {
          id: "2",
          name: "Demo Development Account",
          accountId: "210987654321",
        },
        {
          id: "3",
          name: "Demo Staging Account",
          accountId: "345678901234",
        },
      ];

      setAccounts(dummyAccounts);
      setSelectedAccount(dummyAccounts[0]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.AWS_ACCOUNTS.VERIFIED),
        { headers: getAuthHeaders() }
      );

      if (response.ok) {
        const data = await response.json();
        const verifiedAccounts = (data.results || []).map(
          (acc: { id: number; accountName: string; accountId: string }) => ({
            id: String(acc.id),
            name: acc.accountName,
            accountId: acc.accountId,
          })
        );

        setAccounts(verifiedAccounts);

        if (verifiedAccounts.length > 0 && !selectedAccount) {
          setSelectedAccount(verifiedAccounts[0]);
        } else if (verifiedAccounts.length === 0) {
          setSelectedAccount(null);
        }
      } else {
        setAccounts([]);
        setSelectedAccount(null);
      }
    } catch (error) {
      console.error("Failed to fetch verified accounts:", error);
      setAccounts([]);
      setSelectedAccount(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifiedAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshAccounts = async () => {
    setIsLoading(true);
    await fetchVerifiedAccounts();
  };

  return (
    <AWSContext.Provider
      value={{
        accounts,
        regions: defaultRegions,
        selectedAccount,
        selectedRegion,
        setSelectedAccount,
        setSelectedRegion,
        refreshAccounts,
        isLoading,
      }}
    >
      {children}
    </AWSContext.Provider>
  );
}

export function useAWSContext() {
  const context = useContext(AWSContext);
  if (context === undefined) {
    throw new Error("useAWSContext must be used within an AWSProvider");
  }
  return context;
}
