import { API_CONFIG, buildApiUrl } from "@/config/api";
import type {
  CreateMandatoryTagKeyPayload,
  MandatoryTagKey,
  TagModule,
  TagModulePayload,
  UpdateMandatoryTagKeyPayload,
} from "@/types/module";

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

export async function fetchTagModules(): Promise<TagModule[]> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.TAG_MODULES.LIST),
    {
      headers: getAuthHeaders(),
    }
  );
  return parseResponse<TagModule[]>(
    response,
    "모듈 목록을 불러오지 못했습니다."
  );
}

export async function createTagModule(
  payload: TagModulePayload
): Promise<TagModule> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.TAG_MODULES.CREATE),
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );
  return parseResponse<TagModule>(response, "모듈 생성에 실패했습니다.");
}

export async function updateTagModule(
  id: number,
  payload: TagModulePayload
): Promise<TagModule> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.TAG_MODULES.UPDATE, { id: String(id) }),
    {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );
  return parseResponse<TagModule>(response, "모듈 수정에 실패했습니다.");
}

export async function deleteTagModule(id: number): Promise<void> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.TAG_MODULES.DELETE, { id: String(id) }),
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message = data?.message || data?.error || "모듈 삭제에 실패했습니다.";
    throw new Error(message);
  }
}

export async function fetchMandatoryTagKeys(): Promise<MandatoryTagKey[]> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.MANDATORY_TAG_KEYS.LIST),
    {
      headers: getAuthHeaders(),
    }
  );
  return parseResponse<MandatoryTagKey[]>(
    response,
    "필수 태그 키를 불러오지 못했습니다."
  );
}

export async function fetchActiveMandatoryTagKeys(): Promise<
  MandatoryTagKey[]
> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.MANDATORY_TAG_KEYS.ACTIVE),
    {
      headers: getAuthHeaders(),
    }
  );
  return parseResponse<MandatoryTagKey[]>(
    response,
    "활성 필수 태그 키를 불러오지 못했습니다."
  );
}

export async function createMandatoryTagKey(
  payload: CreateMandatoryTagKeyPayload
): Promise<MandatoryTagKey> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.MANDATORY_TAG_KEYS.CREATE),
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );
  return parseResponse<MandatoryTagKey>(
    response,
    "필수 태그 키 생성에 실패했습니다."
  );
}

export async function updateMandatoryTagKey(
  id: number,
  payload: UpdateMandatoryTagKeyPayload
): Promise<MandatoryTagKey> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.MANDATORY_TAG_KEYS.UPDATE, {
      id: String(id),
    }),
    {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );
  return parseResponse<MandatoryTagKey>(
    response,
    "필수 태그 키 수정에 실패했습니다."
  );
}

export async function deleteMandatoryTagKey(id: number): Promise<void> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.MANDATORY_TAG_KEYS.DELETE, {
      id: String(id),
    }),
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message =
      data?.message || data?.error || "필수 태그 키 삭제에 실패했습니다.";
    throw new Error(message);
  }
}
