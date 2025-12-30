import { createContext, useContext, useState, ReactNode } from "react";

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
}

const defaultAccounts: AWSAccount[] = [
  { id: "1", name: "Production", accountId: "123456789012" },
  { id: "2", name: "Staging", accountId: "234567890123" },
  { id: "3", name: "Development", accountId: "345678901234" },
];

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
  const [selectedAccount, setSelectedAccount] = useState<AWSAccount>(defaultAccounts[0]);
  const [selectedRegion, setSelectedRegion] = useState<AWSRegion>(defaultRegions[0]);

  return (
    <AWSContext.Provider
      value={{
        accounts: defaultAccounts,
        regions: defaultRegions,
        selectedAccount,
        selectedRegion,
        setSelectedAccount,
        setSelectedRegion,
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