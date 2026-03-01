import { API_CONFIG, buildApiUrl } from "@/config/api";
import type { LocustSession, ScanServicesResponse } from "@/types/locust";

const { LOCUST } = API_CONFIG.ENDPOINTS;

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: getAuthHeaders(),
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function scanServices(
  instanceId: number,
  gatewayUrl: string
): Promise<ScanServicesResponse> {
  const url = buildApiUrl(LOCUST.SCAN, { instanceId: String(instanceId) });
  return request<ScanServicesResponse>(url, {
    method: "POST",
    body: JSON.stringify({ gatewayUrl }),
  });
}

export async function startLocust(
  instanceId: number,
  gatewayUrl: string,
  workerCount: number
): Promise<LocustSession> {
  const url = buildApiUrl(LOCUST.START, { instanceId: String(instanceId) });
  return request<LocustSession>(url, {
    method: "POST",
    body: JSON.stringify({ gatewayUrl, workerCount }),
  });
}

export async function stopLocust(instanceId: number): Promise<LocustSession> {
  const url = buildApiUrl(LOCUST.STOP, { instanceId: String(instanceId) });
  return request<LocustSession>(url, { method: "POST" });
}

export async function getLatestSession(
  instanceId: number
): Promise<LocustSession | null> {
  const url = buildApiUrl(LOCUST.SESSION, { instanceId: String(instanceId) });
  const res = await fetch(url, {
    credentials: "include",
    headers: getAuthHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json();
}
