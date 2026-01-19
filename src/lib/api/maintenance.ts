import { API_CONFIG, buildApiUrl } from "@/config/api";

export interface ShutdownSchedule {
  scheduledAt: string;
  reason?: string;
  updatedAt: string;
}

export interface UpdateShutdownScheduleRequest {
  scheduledAt: string;
  reason?: string;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export async function getShutdownSchedule(): Promise<ShutdownSchedule | null> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.MAINTENANCE.SHUTDOWN),
    {
      headers: getAuthHeaders(),
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch shutdown schedule");
  }

  const data = await response.json();
  return data.data;
}

export async function updateShutdownSchedule(
  request: UpdateShutdownScheduleRequest
): Promise<ShutdownSchedule> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.MAINTENANCE.SHUTDOWN),
    {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to update shutdown schedule");
  }

  const data = await response.json();
  return data.data;
}

export async function clearShutdownSchedule(): Promise<void> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.MAINTENANCE.SHUTDOWN),
    {
      method: "DELETE",
      headers: getAuthHeaders(),
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to clear shutdown schedule");
  }
}
