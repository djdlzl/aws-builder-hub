export type CampaignStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type ClusterInstanceStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
export type BlockStateStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
export type BlockType = "CHECK" | "RUN" | "ADDON" | "VERSION" | "NOTE" | "GIT_CLONE" | "LOCUST" | "ROLLOUT";
export type BlockStage = "PRE" | "UPGRADE" | "POST";

export const BLOCK_STAGE_META: Record<BlockStage, { label: string; order: number }> = {
  PRE:     { label: "사전 작업",       order: 0 },
  UPGRADE: { label: "업그레이드 전개", order: 1 },
  POST:    { label: "사후 작업",       order: 2 },
};

export interface CampaignSummary {
  id: number;
  name: string;
  description: string | null;
  sourceVersion: string;
  targetVersion: string;
  status: CampaignStatus;
  clusterCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Block {
  id: number;
  sortOrder: number;
  blockType: BlockType;
  blockStage: BlockStage;
  title: string;
  description: string | null;
  command: string | null;
  filePath: string | null;
  params: string | null;
  isOptional: boolean;
  isEnabled: boolean;
}

export interface CampaignRef {
  id: number;
  name: string;
}

export interface BlockTemplateSummary {
  id: number;
  name: string;
  description: string | null;
  blockCount: number;
  usedByCampaigns: CampaignRef[];
  createdAt: string;
}

export interface BlockTemplateDetail extends BlockTemplateSummary {
  blocks: Block[];
}

export interface CampaignDetail extends CampaignSummary {
  blockTemplateId: number | null;
  blockTemplateName: string | null;
  blocks: Block[];
  clusterInstances: ClusterInstanceSummary[];
}

export interface ClusterInstanceSummary {
  id: number;
  clusterName: string;
  environment: string;
  accountId: string | null;
  region: string | null;
  kubectlContext: string | null;
  locustUrl: string | null;
  workspacePath: string | null;
  status: ClusterInstanceStatus;
  completedBlockCount: number;
  totalBlockCount: number;
}

export interface BlockState {
  id: number;
  blockId: number;
  status: BlockStateStatus;
  executedBy: string | null;
  executedAt: string | null;
  completedAt: string | null;
  output: string | null;
}

export interface BlockOverride {
  id: number;
  blockId: number;
  isEnabled: boolean;
  commandOverride: string | null;
  paramsOverride: string | null;
}

export interface ClusterInstanceDetail extends ClusterInstanceSummary {
  blockStates: BlockState[];
  blockOverrides: BlockOverride[];
}

// Request types
export interface CreateCampaignRequest {
  name: string;
  description?: string;
  sourceVersion: string;
  targetVersion: string;
  blockTemplateId?: number;
}

export interface CreateBlockTemplateRequest {
  name: string;
  description?: string;
}

export interface UpdateBlockTemplateRequest {
  name: string;
  description?: string;
}

export interface UpdateCampaignRequest {
  name: string;
  description?: string;
  sourceVersion?: string;
  targetVersion?: string;
  status?: CampaignStatus;
}

export interface CreateBlockRequest {
  blockType: BlockType;
  blockStage?: BlockStage;
  title: string;
  description?: string;
  command?: string;
  filePath?: string;
  params?: string;
  isOptional?: boolean;
  sortOrder?: number;
}

export interface UpdateBlockRequest {
  title: string;
  blockStage?: BlockStage;
  description?: string;
  command?: string;
  filePath?: string;
  params?: string;
  isOptional?: boolean;
  sortOrder?: number;
}

export interface CreateClusterInstanceRequest {
  clusterName: string;
  environment: string;
  accountId?: string;
  region?: string;
  kubectlContext?: string;
  locustUrl?: string;
  workspacePath?: string;
}

export interface UpdateClusterInstanceRequest {
  clusterName?: string;
  environment?: string;
  accountId?: string;
  region?: string;
  kubectlContext?: string;
  locustUrl?: string;
  workspacePath?: string;
}

export interface UpdateBlockStateRequest {
  status: BlockStateStatus;
  output?: string;
}

export interface UpsertBlockOverrideRequest {
  isEnabled: boolean;
  commandOverride?: string;
  paramsOverride?: string;
}

// ─── Kubectl Context ─────────────────────────────────────────

// AWS 계정 ID(12자리) 또는 레거시 문자열("dev"/"stg"/"mgt")을 저장
export type AccountEnv = string;

export interface KubectlContext {
  id: number;
  name: string;
  contextName: string;
  clusterName: string | null;
  region: string | null;
  accountEnv: AccountEnv | null;
  description: string | null;
}

export interface CreateKubectlContextRequest {
  name: string;
  clusterName: string;
  region: string;
  accountEnv: AccountEnv;
  contextAlias?: string;
  description?: string;
}

export interface UpdateKubectlContextRequest {
  name: string;
  clusterName: string;
  region: string;
  accountEnv: AccountEnv;
  contextAlias?: string;
  description?: string;
}

// ─── CHECK 블록 전용 타입 ─────────────────────────────────────
export interface CheckItem {
  id: string;
  label: string;
}

export interface CheckParams {
  items: CheckItem[];
}

export interface CheckOverrideParams {
  checkedItems: string[]; // CheckItem.id 목록 (클러스터별 체크 상태)
}

export interface GitCloneResult {
  success: boolean;
  repoUrl: string;
  targetDir: string;
  workspacePath: string;
  output: string;
  errorMessage: string | null;
}

// ─── ROLLOUT block ────────────────────────────────────────────

export interface DeploymentInfo {
  namespace: string;
  name: string;
}

export interface DeploymentListResponse {
  deployments: DeploymentInfo[];
  kubectlContext: string | null;
}

export interface SelectedDeployment {
  namespace: string;
  name: string;
}

export interface RolloutRequest {
  selectedDeployments: SelectedDeployment[];
}

export interface DeploymentRolloutResult {
  namespace: string;
  name: string;
  success: boolean;
  restartOutput: string;
  statusOutput: string;
  errorMessage: string | null;
}

export interface RolloutResultResponse {
  success: boolean;
  results: DeploymentRolloutResult[];
}

// ─── RUN block ────────────────────────────────────────────────

export interface RunResultResponse {
  success: boolean;
  output: string;
  errorMessage: string | null;
}
