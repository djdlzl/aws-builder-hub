export type LocustSessionStatus =
  | "SCANNING"
  | "RUNNING"
  | "STOPPING"
  | "STOPPED"
  | "ERROR";

export interface LocustSession {
  id: number;
  clusterInstanceId: number;
  gatewayUrl: string;
  workerCount: number;
  status: LocustSessionStatus;
  port: number | null;
  locustUrl: string | null;
  services: string[];
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScanServicesResponse {
  services: string[];
  count: number;
}
