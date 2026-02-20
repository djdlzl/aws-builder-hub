/**
 * 네트워크 토폴로지 관련 타입 정의
 */

export interface NetworkTopologyData {
  nodes: NodeData[];
  edges: EdgeData[];
  hierarchy: HierarchyData;
  lastUpdated?: string;
  cacheStatus: CacheStatus;
}

export interface NodeData {
  id: string;
  type: NodeType;
  label: string;
  metadata: Record<string, any>;
  position?: Position;
  parent?: string;
}

export enum NodeType {
  ACCOUNT = "ACCOUNT",
  REGION = "REGION",
  VPC = "VPC",
  SUBNET = "SUBNET",
  IGW = "IGW",
  NAT = "NAT",
}

export interface EdgeData {
  id: string;
  source: string;
  target: string;
  type: ConnectionType;
  metadata: ConnectionMetadata;
}

export enum ConnectionType {
  VPC_PEERING = "VPC_PEERING",
  CLOUDWAN = "CLOUDWAN",
  GATEWAY = "GATEWAY",
  ROUTE = "ROUTE",
  TRANSIT_GATEWAY = "TRANSIT_GATEWAY",
}

export interface ConnectionMetadata {
  connectionId?: string;
  state?: string;
  bandwidth?: number;
  latency?: number;
  cost?: number;
  [key: string]: any;
}

export interface Position {
  x: number;
  y: number;
}

export interface HierarchyData {
  accounts: Record<string, AccountHierarchy>;
}

export interface AccountHierarchy {
  accountId: string;
  accountName: string;
  regions: Record<string, RegionHierarchy>;
}

export interface RegionHierarchy {
  regionName: string;
  vpcs: Record<string, VpcHierarchy>;
}

export interface VpcHierarchy {
  vpcId: string;
  cidrBlock: string;
  subnets: Record<string, SubnetHierarchy>;
  gateways: Record<string, GatewayHierarchy>;
  tags?: Record<string, string>;
  name?: string;
}

export interface SubnetHierarchy {
  subnetId: string;
  cidrBlock: string;
  availabilityZone: string;
  isPublic: boolean;
  tags?: Record<string, string>;
  name?: string;
  displayName?: string;
  routeTableId?: string;
  routes?: RouteInfo[];
  // 그룹핑 메타데이터 (RTB 동일 AZ 서브넷 통합 시)
  isGrouped?: boolean;
  subnetIds?: string[];
  availabilityZones?: string[];
  subnetCount?: number;
  representativeCidr?: string;
}

export interface RouteInfo {
  destinationCidr?: string | null;
  target: string;
  targetType: string;
  state: string;
}

export interface GatewayHierarchy {
  gatewayId: string;
  gatewayType: GatewayType;
  state: string;
}

export enum GatewayType {
  IGW = "IGW",
  NAT = "NAT",
  VPN = "VPN",
  TRANSIT = "TRANSIT",
}

export type CacheStatus = "HIT" | "MISS" | "UPDATING" | "ERROR";

export interface CacheStatusInfo {
  isDataAvailable: boolean;
  lastUpdated?: string;
  nextScheduledUpdate?: string;
  isUpdateInProgress: boolean;
  cacheHitRate?: number;
}

export interface SyncProgress {
  isInProgress: boolean;
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  estimatedTimeRemaining?: number | null;
  message: string;
  progress: number;
}

export interface RefreshResponse {
  success: boolean;
  message: string;
  estimatedCompletionTime?: string | null;
}

export interface LastUpdatedResponse {
  lastUpdated?: string;
  dataAge?: number | null;
  isStale?: boolean;
}

export interface HealthResponse {
  status: "healthy" | "unhealthy";
  services: Record<string, ServiceHealth>;
  timestamp: string;
}

export interface ServiceHealth {
  status: "up" | "down";
  responseTime?: number;
  error?: string;
}

// API Response 래퍼
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// 네트워크 토폴로지 컨텍스트 상태
export interface NetworkTopologyState {
  topologyData: NetworkTopologyData | null;
  cacheStatus: CacheStatusInfo | null;
  syncProgress: SyncProgress | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
}

// 네트워크 토폴로지 액션
export interface NetworkTopologyActions {
  fetchTopologyData: () => Promise<void>;
  fetchCacheStatus: () => Promise<void>;
  fetchSyncProgress: () => Promise<void>;
  refreshData: () => Promise<void>;
  clearError: () => void;
}

// 필터링 옵션
export interface FilterOptions {
  nodeTypes: NodeType[];
  connectionTypes: ConnectionType[];
  accounts: string[];
  regions: string[];
  searchQuery: string;
}

// 시각화 설정
export interface VisualizationSettings {
  showLabels: boolean;
  showMetadata: boolean;
  highlightConnections: boolean;
  layoutType: "hierarchical" | "force" | "circular" | "simple";
  zoomLevel: number;
  centerPosition: Position;
  enableAnimations?: boolean;
}
