import { API_CONFIG, buildApiUrl } from "@/config/api";
import type {
  CreateInstanceTemplatePayload,
  InstanceTemplateResponse,
  ModuleDetailResponse,
  TemplateDefaultResponse,
} from "@/types/provisioning";

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const parseResponse = async <T>(
  response: Response,
  fallbackMessage: string
): Promise<T> => {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message || data?.error || fallbackMessage;
    throw new Error(message);
  }

  return (data?.result ?? data?.results ?? data) as T;
};

export async function fetchProvisioningModules(): Promise<
  ModuleDetailResponse[]
> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.PROVISIONING_DEFAULTS.MODULES),
    { headers: getAuthHeaders() }
  );
  return parseResponse<ModuleDetailResponse[]>(
    response,
    "프로비저닝 모듈을 불러오지 못했습니다."
  );
}

export async function fetchProvisioningModule(
  id: number
): Promise<ModuleDetailResponse> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.PROVISIONING_DEFAULTS.MODULE, {
      id: String(id),
    }),
    { headers: getAuthHeaders() }
  );
  return parseResponse<ModuleDetailResponse>(
    response,
    "프로비저닝 모듈을 불러오지 못했습니다."
  );
}

export async function fetchInstanceTemplates(): Promise<
  InstanceTemplateResponse[]
> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.INSTANCE_TEMPLATES.LIST),
    { headers: getAuthHeaders() }
  );
  return parseResponse<InstanceTemplateResponse[]>(
    response,
    "템플릿 목록을 불러오지 못했습니다."
  );
}

export async function fetchTemplateDefaults(
  id: number
): Promise<TemplateDefaultResponse> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.PROVISIONING_DEFAULTS.TEMPLATE, {
      id: String(id),
    }),
    { headers: getAuthHeaders() }
  );
  return parseResponse<TemplateDefaultResponse>(
    response,
    "템플릿 기본값을 불러오지 못했습니다."
  );
}

export async function createInstanceTemplate(
  payload: CreateInstanceTemplatePayload
): Promise<InstanceTemplateResponse> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.INSTANCE_TEMPLATES.CREATE),
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );
  return parseResponse<InstanceTemplateResponse>(
    response,
    "템플릿을 생성하지 못했습니다."
  );
}

export async function updateInstanceTemplate(
  id: number,
  payload: CreateInstanceTemplatePayload
): Promise<InstanceTemplateResponse> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.INSTANCE_TEMPLATES.UPDATE, {
      id: String(id),
    }),
    {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );
  return parseResponse<InstanceTemplateResponse>(
    response,
    "템플릿을 수정하지 못했습니다."
  );
}
