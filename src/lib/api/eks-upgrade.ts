import { API_CONFIG, buildApiUrl } from "@/config/api";

export interface AwsAccountSummary {
  id: number;
  accountId: string;
  accountName: string;
}

import type {
  CampaignDetail,
  CampaignSummary,
  ClusterInstanceDetail,
  ClusterInstanceSummary,
  Block,
  BlockState,
  BlockOverride,
  BlockTemplateSummary,
  BlockTemplateDetail,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CreateBlockRequest,
  UpdateBlockRequest,
  CreateBlockTemplateRequest,
  UpdateBlockTemplateRequest,
  CreateClusterInstanceRequest,
  UpdateClusterInstanceRequest,
  UpdateBlockStateRequest,
  UpsertBlockOverrideRequest,
  GitCloneResult,
  KubectlContext,
  CreateKubectlContextRequest,
  UpdateKubectlContextRequest,
  DeploymentListResponse,
  RolloutRequest,
  RolloutResultResponse,
  RunResultResponse,
} from "@/types/eks-upgrade";

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const parseResponse = async <T>(response: Response, fallbackMessage: string): Promise<T> => {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || data?.error || fallbackMessage);
  }
  return (data?.result ?? data?.results ?? data) as T;
};

// ─── Campaign ────────────────────────────────────────────────

export async function fetchCampaigns(): Promise<CampaignSummary[]> {
  const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.CAMPAIGNS), {
    headers: getAuthHeaders(),
  });
  return parseResponse<CampaignSummary[]>(response, "캠페인 목록을 불러오지 못했습니다.");
}

export async function fetchCampaign(id: number): Promise<CampaignDetail> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.CAMPAIGN, { id: String(id) }),
    { headers: getAuthHeaders() }
  );
  return parseResponse<CampaignDetail>(response, "캠페인 상세 정보를 불러오지 못했습니다.");
}

export async function createCampaign(request: CreateCampaignRequest): Promise<CampaignSummary> {
  const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.CAMPAIGNS), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });
  return parseResponse<CampaignSummary>(response, "캠페인 생성에 실패했습니다.");
}

export async function updateCampaign(id: number, request: UpdateCampaignRequest): Promise<CampaignSummary> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.CAMPAIGN, { id: String(id) }),
    { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify(request) }
  );
  return parseResponse<CampaignSummary>(response, "캠페인 수정에 실패했습니다.");
}

export async function deleteCampaign(id: number): Promise<void> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.CAMPAIGN, { id: String(id) }),
    { method: "DELETE", headers: getAuthHeaders() }
  );
  if (!response.ok) throw new Error("캠페인 삭제에 실패했습니다.");
}

// ─── Block ───────────────────────────────────────────────────

export async function createBlock(campaignId: number, request: CreateBlockRequest): Promise<Block> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.CAMPAIGN_BLOCKS, { campaignId: String(campaignId) }),
    { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(request) }
  );
  return parseResponse<Block>(response, "블록 생성에 실패했습니다.");
}

export async function updateBlock(blockId: number, request: UpdateBlockRequest): Promise<Block> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.BLOCK, { blockId: String(blockId) }),
    { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify(request) }
  );
  return parseResponse<Block>(response, "블록 수정에 실패했습니다.");
}

export async function deleteBlock(blockId: number): Promise<void> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.BLOCK, { blockId: String(blockId) }),
    { method: "DELETE", headers: getAuthHeaders() }
  );
  if (!response.ok) throw new Error("블록 삭제에 실패했습니다.");
}

export async function toggleBlock(blockId: number): Promise<Block> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.TOGGLE_BLOCK, { blockId: String(blockId) }),
    { method: "PATCH", headers: getAuthHeaders() }
  );
  return parseResponse<Block>(response, "블록 활성화 상태 변경에 실패했습니다.");
}

export async function reorderBlocks(campaignId: number, blockIds: number[]): Promise<void> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.REORDER_BLOCKS, { campaignId: String(campaignId) }),
    { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify({ blockIds }) }
  );
  if (!response.ok) throw new Error("블록 순서 변경에 실패했습니다.");
}

export async function reorderClusterInstances(campaignId: number, instanceIds: number[]): Promise<void> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.REORDER_CLUSTERS, { campaignId: String(campaignId) }),
    { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify({ instanceIds }) }
  );
  if (!response.ok) throw new Error("클러스터 순서 변경에 실패했습니다.");
}

// ─── Cluster Instance ────────────────────────────────────────

export async function fetchClusterInstances(campaignId: number): Promise<ClusterInstanceSummary[]> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.CAMPAIGN_CLUSTERS, { campaignId: String(campaignId) }),
    { headers: getAuthHeaders() }
  );
  return parseResponse<ClusterInstanceSummary[]>(response, "클러스터 목록을 불러오지 못했습니다.");
}

export async function fetchClusterInstance(instanceId: number): Promise<ClusterInstanceDetail> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.CLUSTER, { instanceId: String(instanceId) }),
    { headers: getAuthHeaders() }
  );
  return parseResponse<ClusterInstanceDetail>(response, "클러스터 상세 정보를 불러오지 못했습니다.");
}

export async function createClusterInstance(
  campaignId: number,
  request: CreateClusterInstanceRequest
): Promise<ClusterInstanceSummary> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.CAMPAIGN_CLUSTERS, { campaignId: String(campaignId) }),
    { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(request) }
  );
  return parseResponse<ClusterInstanceSummary>(response, "클러스터 추가에 실패했습니다.");
}

export async function updateClusterInstance(
  instanceId: number,
  request: UpdateClusterInstanceRequest
): Promise<ClusterInstanceSummary> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.CLUSTER, { instanceId: String(instanceId) }),
    { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify(request) }
  );
  return parseResponse<ClusterInstanceSummary>(response, "클러스터 수정에 실패했습니다.");
}

export async function deleteClusterInstance(instanceId: number): Promise<void> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.CLUSTER, { instanceId: String(instanceId) }),
    { method: "DELETE", headers: getAuthHeaders() }
  );
  if (!response.ok) throw new Error("클러스터 삭제에 실패했습니다.");
}

// ─── Block State ─────────────────────────────────────────────

export async function updateBlockState(
  instanceId: number,
  blockId: number,
  request: UpdateBlockStateRequest
): Promise<BlockState> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.BLOCK_STATE, {
      instanceId: String(instanceId),
      blockId: String(blockId),
    }),
    { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify(request) }
  );
  return parseResponse<BlockState>(response, "블록 상태 업데이트에 실패했습니다.");
}

// ─── Block Override ──────────────────────────────────────────

export async function upsertBlockOverride(
  instanceId: number,
  blockId: number,
  request: UpsertBlockOverrideRequest
): Promise<BlockOverride> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.BLOCK_OVERRIDE, {
      instanceId: String(instanceId),
      blockId: String(blockId),
    }),
    { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify(request) }
  );
  return parseResponse<BlockOverride>(response, "블록 오버라이드 저장에 실패했습니다.");
}

export async function deleteBlockOverride(instanceId: number, blockId: number): Promise<void> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.BLOCK_OVERRIDE, {
      instanceId: String(instanceId),
      blockId: String(blockId),
    }),
    { method: "DELETE", headers: getAuthHeaders() }
  );
  if (!response.ok) throw new Error("블록 오버라이드 삭제에 실패했습니다.");
}

export async function executeGitClone(
  instanceId: number,
  blockId: number
): Promise<GitCloneResult> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.GIT_CLONE, {
      instanceId: String(instanceId),
      blockId: String(blockId),
    }),
    { method: "POST", headers: getAuthHeaders() }
  );
  return parseResponse<GitCloneResult>(response, "Git clone 실행에 실패했습니다.");
}

export async function fetchDeployments(instanceId: number): Promise<DeploymentListResponse> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.CLUSTER_DEPLOYMENTS, {
      instanceId: String(instanceId),
    }),
    { headers: getAuthHeaders() }
  );
  return parseResponse<DeploymentListResponse>(response, "Deployment 목록을 불러오지 못했습니다.");
}

export async function executeRollout(
  instanceId: number,
  blockId: number,
  request: RolloutRequest
): Promise<RolloutResultResponse> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.BLOCK_ROLLOUT, {
      instanceId: String(instanceId),
      blockId: String(blockId),
    }),
    { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(request) }
  );
  return parseResponse<RolloutResultResponse>(response, "Rollout 실행에 실패했습니다.");
}

export async function executeRun(instanceId: number, blockId: number): Promise<RunResultResponse> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.BLOCK_RUN, {
      instanceId: String(instanceId),
      blockId: String(blockId),
    }),
    { method: "POST", headers: getAuthHeaders() }
  );
  return parseResponse<RunResultResponse>(response, "명령 실행에 실패했습니다.");
}

// ─── Block Template ──────────────────────────────────────────

export async function fetchBlockTemplates(): Promise<BlockTemplateSummary[]> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.BLOCK_TEMPLATES),
    { headers: getAuthHeaders() }
  );
  return parseResponse<BlockTemplateSummary[]>(response, "블록 템플릿 목록을 불러오지 못했습니다.");
}

export async function fetchBlockTemplate(id: number): Promise<BlockTemplateDetail> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.BLOCK_TEMPLATE, { id: String(id) }),
    { headers: getAuthHeaders() }
  );
  return parseResponse<BlockTemplateDetail>(response, "블록 템플릿 상세 정보를 불러오지 못했습니다.");
}

export async function createBlockTemplate(request: CreateBlockTemplateRequest): Promise<BlockTemplateSummary> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.BLOCK_TEMPLATES),
    { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(request) }
  );
  return parseResponse<BlockTemplateSummary>(response, "블록 템플릿 생성에 실패했습니다.");
}

export async function updateBlockTemplate(id: number, request: UpdateBlockTemplateRequest): Promise<BlockTemplateSummary> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.BLOCK_TEMPLATE, { id: String(id) }),
    { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify(request) }
  );
  return parseResponse<BlockTemplateSummary>(response, "블록 템플릿 수정에 실패했습니다.");
}

export async function deleteBlockTemplate(id: number): Promise<void> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.BLOCK_TEMPLATE, { id: String(id) }),
    { method: "DELETE", headers: getAuthHeaders() }
  );
  if (!response.ok) throw new Error("블록 템플릿 삭제에 실패했습니다.");
}

export async function duplicateBlockTemplate(id: number): Promise<BlockTemplateSummary> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.DUPLICATE_TEMPLATE, { id: String(id) }),
    { method: "POST", headers: getAuthHeaders() }
  );
  return parseResponse<BlockTemplateSummary>(response, "블록 템플릿 복제에 실패했습니다.");
}

export async function createTemplateBlock(templateId: number, request: CreateBlockRequest): Promise<Block> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.TEMPLATE_BLOCKS, { templateId: String(templateId) }),
    { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(request) }
  );
  return parseResponse<Block>(response, "템플릿 블록 생성에 실패했습니다.");
}

export async function reorderTemplateBlocks(templateId: number, blockIds: number[]): Promise<void> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.REORDER_TEMPLATE_BLOCKS, { templateId: String(templateId) }),
    { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify({ blockIds }) }
  );
  if (!response.ok) throw new Error("템플릿 블록 순서 변경에 실패했습니다.");
}

export async function linkTemplate(campaignId: number, templateId: number | null): Promise<CampaignDetail> {
  const url = buildApiUrl(API_CONFIG.ENDPOINTS.EKS_UPGRADE.LINK_TEMPLATE, { campaignId: String(campaignId) });
  const fullUrl = templateId !== null ? `${url}?templateId=${templateId}` : url;
  const response = await fetch(fullUrl, { method: "PUT", headers: getAuthHeaders() });
  return parseResponse<CampaignDetail>(response, "템플릿 연결에 실패했습니다.");
}

// ─── AWS Accounts ─────────────────────────────────────────────

export async function fetchVerifiedAwsAccounts(): Promise<AwsAccountSummary[]> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.AWS_ACCOUNTS.VERIFIED),
    { headers: getAuthHeaders() }
  );
  return parseResponse<AwsAccountSummary[]>(response, "AWS 계정 목록을 불러오지 못했습니다.");
}

// ─── Kubectl Context ─────────────────────────────────────────

export async function fetchKubectlContexts(): Promise<KubectlContext[]> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.KUBECTL_CONTEXTS.LIST),
    { headers: getAuthHeaders() }
  );
  return parseResponse<KubectlContext[]>(response, "kubectl context 목록을 불러오지 못했습니다.");
}

export async function createKubectlContext(request: CreateKubectlContextRequest): Promise<KubectlContext> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.KUBECTL_CONTEXTS.LIST),
    { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(request) }
  );
  return parseResponse<KubectlContext>(response, "kubectl context 생성에 실패했습니다.");
}

export async function updateKubectlContext(id: number, request: UpdateKubectlContextRequest): Promise<KubectlContext> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.KUBECTL_CONTEXTS.ITEM, { id: String(id) }),
    { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify(request) }
  );
  return parseResponse<KubectlContext>(response, "kubectl context 수정에 실패했습니다.");
}

export async function deleteKubectlContext(id: number): Promise<void> {
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.KUBECTL_CONTEXTS.ITEM, { id: String(id) }),
    { method: "DELETE", headers: getAuthHeaders() }
  );
  if (!response.ok) throw new Error("kubectl context 삭제에 실패했습니다.");
}

