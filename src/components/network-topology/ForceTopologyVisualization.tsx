/**
 * Force-directed 네트워크 토폴로지 시각화 컴포넌트
 * - 노드 겹침 방지를 위한 Force simulation 사용
 * - VPC 클릭 시 서브넷 펼침/접힘 (줌/팬 상태 유지)
 * - 호버 시 연결된 노드와 관계선 하이라이트 (형광 파란색)
 * - VPC Peering/CloudWAN 기반 관계선 표시
 */

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import * as d3 from "d3";
import type {
  NetworkTopologyData,
  NodeData,
  RouteInfo,
} from "@/types/network-topology";
import { NodeType, ConnectionType } from "@/types/network-topology";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ForceTopologyVisualizationProps {
  data: NetworkTopologyData;
  onNodeClick?: (node: NodeData) => void;
  onNodeHover?: (node: NodeData | null) => void;
  className?: string;
  onError?: (error: Error) => void;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  type: NodeType;
  label: string;
  displayName: string;
  metadata: Record<string, unknown>;
  parentId?: string;
  level: number;
  isVisible: boolean;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  type: "tree" | "peering";
  connectionType?: ConnectionType;
  isHidden?: boolean; // 피어링 연결은 기본적으로 숨김, 호버 시에만 표시
}

// 노드 색상
const NODE_COLORS: Record<NodeType, { fill: string; stroke: string }> = {
  [NodeType.ACCOUNT]: { fill: "#e0f7fa", stroke: "#00acc1" },
  [NodeType.REGION]: { fill: "#e8eaf6", stroke: "#5c6bc0" },
  [NodeType.VPC]: { fill: "#e8f5e9", stroke: "#66bb6a" },
  [NodeType.SUBNET]: { fill: "#fff8e1", stroke: "#ffb300" },
  [NodeType.IGW]: { fill: "#e3f2fd", stroke: "#42a5f5" },
  [NodeType.NAT]: { fill: "#fce4ec", stroke: "#ec407a" },
};

// 노드 크기 (50% 축소)
const NODE_SIZES: Record<NodeType, number> = {
  [NodeType.ACCOUNT]: 15,
  [NodeType.REGION]: 13,
  [NodeType.VPC]: 12,
  [NodeType.SUBNET]: 10,
  [NodeType.IGW]: 9,
  [NodeType.NAT]: 9,
};

// 연결선 색상
const CONNECTION_COLORS: Record<ConnectionType, string> = {
  [ConnectionType.VPC_PEERING]: "#26a69a",
  [ConnectionType.CLOUDWAN]: "#ab47bc",
  [ConnectionType.GATEWAY]: "#66bb6a",
  [ConnectionType.ROUTE]: "#ffa726",
  [ConnectionType.TRANSIT_GATEWAY]: "#ef5350",
};

// 하이라이트 색상 (형광 파란색)
const HIGHLIGHT_COLOR = "#00d4ff";
const HIGHLIGHT_GLOW = "0 0 12px rgba(0, 212, 255, 0.8)";

// 레벨별 반경 (방사형 레이아웃 기준)
const LEVEL_RADIUS = {
  [NodeType.ACCOUNT]: 0,
  [NodeType.REGION]: 180,
  [NodeType.VPC]: 320,
  [NodeType.SUBNET]: 440,
  [NodeType.IGW]: 440,
  [NodeType.NAT]: 440,
};

// 리전 이름 매핑
const REGION_NAMES: Record<string, string> = {
  "ap-northeast-2": "서울(apne2)",
  "ap-northeast-1": "도쿄(apne1)",
  "ap-southeast-1": "싱가포르(apse1)",
  "us-west-2": "오레곤(uswe2)",
  "us-east-1": "버지니아(use1)",
  "eu-west-1": "아일랜드(euw1)",
  "eu-central-1": "프랑크푸르트(euc1)",
};

// ========================================
// CIDR 유틸리티 함수
// ========================================

/**
 * IP 주소를 32비트 숫자로 변환
 * @param ip - IPv4 주소 (예: "10.40.3.0")
 * @returns 32비트 정수
 */
function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
}

/**
 * targetCidr가 subnetCidr을 포함하는지 확인
 * @param targetCidr - 목적지 CIDR (예: "10.40.3.0/24")
 * @param subnetCidr - Subnet CIDR (예: "10.40.3.0/26" 또는 "10.40.3.0/24")
 * @returns true if targetCidr contains or equals subnetCidr
 */
function cidrContainsSubnet(targetCidr: string, subnetCidr: string): boolean {
  if (!targetCidr || !subnetCidr) return false;

  const [targetBase, targetBits] = targetCidr.split('/');
  const [subnetBase, subnetBits] = subnetCidr.split('/');

  if (!targetBits || !subnetBits) return false;

  const targetBitsNum = parseInt(targetBits, 10);
  const subnetBitsNum = parseInt(subnetBits, 10);

  // targetCidr이 더 큰 대역이어야 함 (비트 수가 작아야 함)
  if (targetBitsNum > subnetBitsNum) return false;

  const mask = -1 << (32 - targetBitsNum);
  const targetNum = ipToNumber(targetBase) & mask;
  const subnetNum = ipToNumber(subnetBase) & mask;

  return targetNum === subnetNum;
}

// 태그에서 Name 추출 또는 CIDR 기반 표시명 생성
function getTagName(
  metadata: Record<string, unknown>,
  fallbackId: string,
): string {
  // 0. 백엔드에서 파싱된 displayName 최우선 (서브넷 그룹핑 처리 결과)
  if (typeof metadata?.displayName === "string" && metadata.displayName)
    return metadata.displayName;

  // 1. tags 객체에서 Name 찾기
  const tags = metadata?.tags as Record<string, string> | undefined;
  if (tags) {
    if (tags.Name) return tags.Name;
    if (tags.name) return tags.name;
  }

  // 2. metadata 직속 name/Name 속성
  if (typeof metadata?.name === "string" && metadata.name) return metadata.name;
  if (typeof metadata?.Name === "string" && metadata.Name) return metadata.Name;

  // 3. CIDR 블록으로 표시 (VPC/Subnet인 경우)
  if (typeof metadata?.cidrBlock === "string" && metadata.cidrBlock) {
    const cidr = metadata.cidrBlock;

    // VPC인 경우: "VPC (10.21.0.0/16)"
    if (fallbackId.startsWith("vpc-")) {
      return `VPC (${cidr})`;
    }

    // Subnet인 경우: "Subnet (10.21.66.0/24)"
    if (fallbackId.startsWith("subnet-")) {
      // AZ 정보가 있으면 포함
      const az = metadata?.availabilityZone as string | undefined;
      if (az) {
        // ap-northeast-2a -> 2a 추출
        const azShort = az.slice(-2);
        return `Subnet-${azShort} (${cidr})`;
      }
      return `Subnet (${cidr})`;
    }
  }

  // 4. vpcId나 subnetId가 metadata에 있으면 사용
  if (typeof metadata?.vpcId === "string" && metadata.vpcId !== fallbackId) {
    return metadata.vpcId;
  }
  if (typeof metadata?.subnetId === "string" && metadata.subnetId !== fallbackId) {
    return metadata.subnetId;
  }

  // 5. 폴백: ID를 그대로 반환
  return fallbackId;
}

// 리전 이름 변환
function getRegionDisplayName(regionCode: string): string {
  return REGION_NAMES[regionCode] || regionCode;
}

export function ForceTopologyVisualization({
  data,
  onNodeClick,
  onNodeHover,
  className = "",
  onError,
}: ForceTopologyVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, undefined> | null>(
    null,
  );
  const zoomTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<
    SVGSVGElement,
    unknown
  > | null>(null);

  // 노드 위치 저장을 위한 Ref
  const nodePositionsRef = useRef<
    Map<string, { x: number; y: number; vx?: number; vy?: number }>
  >(new Map());

  // 줌/팬 상태가 아닐 때만 시뮬레이션이 중앙을 유지하도록 함
  const isDraggingRef = useRef(false);

  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [expandedVpcs, setExpandedVpcs] = useState<Set<string>>(new Set());
  const [selectedSubnet, setSelectedSubnet] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [pinnedNodeId, setPinnedNodeId] = useState<string | null>(null);

  // 그래프 데이터 생성
  const { nodes, links, vpcToSubnets, nodeConnections } = useMemo(() => {
    console.log("🔍 [데이터 구조 확인] data prop:", data);
    console.log("🔍 [데이터 구조 확인] data.hierarchy:", data?.hierarchy);
    console.log("🔍 [데이터 구조 확인] accounts 개수:", Object.keys(data?.hierarchy?.accounts || {}).length);

    if (!data?.hierarchy?.accounts) {
      return {
        nodes: [],
        links: [],
        vpcToSubnets: new Map(),
        nodeConnections: new Map(),
      };
    }

    const graphNodes: GraphNode[] = [];
    const graphLinks: GraphLink[] = [];
    const vpcSubnets = new Map<string, GraphNode[]>();
    const connections = new Map<string, Set<string>>();

    // 초기 위치 계산을 위한 중심점
    const centerX = 600; // 임시 값, 실제 렌더링 시 dimensions 사용
    const centerY = 400;

    // 계층 구조 순회하며 노드 생성 및 초기 각도/위치 할당
    const accounts = Object.entries(data.hierarchy.accounts);
    const accountStep = (2 * Math.PI) / Math.max(accounts.length, 1);

    accounts.forEach(([accountId, account], accIdx) => {
      const accAngle = accIdx * accountStep - Math.PI / 2;

      // 이전 위치 확인
      const prevPos = nodePositionsRef.current.get(accountId);

      // 계정 노드 (중앙)
      graphNodes.push({
        id: accountId,
        type: NodeType.ACCOUNT,
        label: account.accountName || accountId,
        displayName: account.accountName || accountId,
        metadata: { accountId },
        level: 0,
        isVisible: true,
        x: prevPos?.x ?? centerX,
        y: prevPos?.y ?? centerY,
        vx: prevPos?.vx,
        vy: prevPos?.vy,
      });

      const regions = Object.entries(account.regions || {});
      const regionSpan = accounts.length > 1 ? accountStep * 0.8 : 2 * Math.PI;
      const regionStart =
        accAngle - regionSpan / 2 + regionSpan / (regions.length * 2 || 1);
      const regionStep = regionSpan / Math.max(regions.length, 1);

      regions.forEach(([regionName, region], regIdx) => {
        const regionId = `${accountId}-${regionName}`;
        const prevRegionPos = nodePositionsRef.current.get(regionId);
        const regAngle = regionStart + regIdx * regionStep;

        // 리전 노드 위치
        const regX =
          centerX + Math.cos(regAngle) * LEVEL_RADIUS[NodeType.REGION];
        const regY =
          centerY + Math.sin(regAngle) * LEVEL_RADIUS[NodeType.REGION];

        graphNodes.push({
          id: regionId,
          type: NodeType.REGION,
          label: regionName,
          displayName: getRegionDisplayName(regionName),
          metadata: { accountId, region: regionName },
          parentId: accountId,
          level: 1,
          isVisible: true,
          x: prevRegionPos?.x ?? regX,
          y: prevRegionPos?.y ?? regY,
          vx: prevRegionPos?.vx,
          vy: prevRegionPos?.vy,
        });

        // 계정 → 리전 링크
        graphLinks.push({
          id: `${accountId}-${regionId}`,
          source: accountId,
          target: regionId,
          type: "tree",
        });

        const vpcs = Object.entries(region.vpcs || {});
        const vpcSpan = regionStep * 0.9;
        const vpcStart =
          regAngle - vpcSpan / 2 + vpcSpan / (vpcs.length * 2 || 1);
        const vpcStep = vpcSpan / Math.max(vpcs.length, 1);

        vpcs.forEach(([vpcId, vpc], vpcIdx) => {
          const vpcRecord = vpc as unknown as Record<string, unknown>;
          const prevVpcPos = nodePositionsRef.current.get(vpcId);

          // VPC 태그 추출 (다양한 가능성 고려)
          let vpcTags = vpcRecord.tags || vpc.tags;

          const vpcMetadata = {
            accountId,
            region: regionName,
            vpcId,
            cidrBlock: vpc.cidrBlock,
            tags: vpcTags,
            name: vpcRecord.name || vpc.name,
          };

          const vpcAngle = vpcStart + vpcIdx * vpcStep;
          const vpcX =
            centerX + Math.cos(vpcAngle) * LEVEL_RADIUS[NodeType.VPC];
          const vpcY =
            centerY + Math.sin(vpcAngle) * LEVEL_RADIUS[NodeType.VPC];

          // VPC 노드
          graphNodes.push({
            id: vpcId,
            type: NodeType.VPC,
            label: vpcId,
            displayName: getTagName(vpcMetadata, vpcId),
            metadata: vpcMetadata,
            parentId: regionId,
            level: 2,
            isVisible: true,
            x: prevVpcPos?.x ?? vpcX,
            y: prevVpcPos?.y ?? vpcY,
            vx: prevVpcPos?.vx,
            vy: prevVpcPos?.vy,
          });

          // 리전 → VPC 링크
          graphLinks.push({
            id: `${regionId}-${vpcId}`,
            source: regionId,
            target: vpcId,
            type: "tree",
          });

          // 서브넷 노드들
          const subnets: GraphNode[] = [];
          const subnetEntries = Object.entries(vpc.subnets || {});

          // 서브넷 배치를 위한 각도
          const subnetSpan = Math.PI / 6;
          const subnetStart = vpcAngle - subnetSpan / 2;
          const subnetStep = subnetSpan / Math.max(subnetEntries.length, 1);

          subnetEntries.forEach(([subnetId, subnet], subIdx) => {
            const subnetRecord = subnet as unknown as Record<string, unknown>;
            const prevSubnetPos = nodePositionsRef.current.get(subnetId);

            // 서브넷 태그 추출 (다양한 가능성 고려)
            let subnetTags = subnetRecord.tags || subnet.tags;

            // routes 필드 확인 로그
            if (subIdx === 0) {
              console.log(`🔍 [Subnet 데이터] 첫 번째 subnet 샘플 (${subnetId}):`, {
                subnetRecord,
                hasRoutes: !!subnetRecord.routes,
                routesLength: Array.isArray(subnetRecord.routes) ? subnetRecord.routes.length : 0,
                routes: subnetRecord.routes,
              });
            }

            const subnetMetadata = {
              accountId,
              region: regionName,
              vpcId,
              subnetId,
              cidrBlock: subnet.cidrBlock,
              availabilityZone: subnet.availabilityZone,
              isPublic: subnet.isPublic,
              tags: subnetTags,
              name: subnetRecord.name || subnet.name,
              routeTableId: subnetRecord.routeTableId,
              routes: subnetRecord.routes,
            };

            const subAngle = subnetStart + subIdx * subnetStep;
            // 초기 위치: 이전 위치가 있으면 사용, 없으면 부모 VPC 위치 주변에서 시작
            // 이렇게 하면 서브넷이 VPC에서 '퍼져나가는' 애니메이션 효과를 줄 수 있음
            const subX = prevVpcPos?.x ?? vpcX + Math.cos(subAngle) * 20;
            const subY = prevVpcPos?.y ?? vpcY + Math.sin(subAngle) * 20;

            const subnetNode: GraphNode = {
              id: subnetId,
              type: NodeType.SUBNET,
              label: subnetId,
              displayName: getTagName(subnetMetadata, subnetId),
              metadata: subnetMetadata,
              parentId: vpcId,
              level: 3,
              isVisible: false, // 초기에는 숨김
              x: prevSubnetPos?.x ?? subX,
              y: prevSubnetPos?.y ?? subY,
              vx: prevSubnetPos?.vx,
              vy: prevSubnetPos?.vy,
            };

            graphNodes.push(subnetNode);
            subnets.push(subnetNode);

            // VPC → 서브넷 링크
            graphLinks.push({
              id: `${vpcId}-${subnetId}`,
              source: vpcId,
              target: subnetId,
              type: "tree",
            });
          });

          vpcSubnets.set(vpcId, subnets);
        });
      });
    });

    // VPC 피어링/CloudWAN 연결 정보
    // edge의 source/target은 "vpc:vpc-xxx" 또는 "subnet:subnet-xxx" 형식이므로 접두사 제거
    const extractNodeId = (edgeId: string): string => {
      if (edgeId.startsWith("vpc:")) return edgeId.substring(4);
      if (edgeId.startsWith("subnet:")) return edgeId.substring(7);
      if (edgeId.startsWith("gateway:")) return edgeId.substring(8);
      return edgeId;
    };

    data.edges?.forEach((edge) => {
      if (
        edge.type === ConnectionType.VPC_PEERING ||
        edge.type === ConnectionType.CLOUDWAN
      ) {
        const sourceId = extractNodeId(edge.source);
        const targetId = extractNodeId(edge.target);

        const sourceNode = graphNodes.find((n) => n.id === sourceId);
        const targetNode = graphNodes.find((n) => n.id === targetId);

        if (sourceNode && targetNode) {
          // 피어링 링크는 저장하지만 기본적으로 숨김 (호버 시에만 하이라이트로 표시)
          graphLinks.push({
            id: `peering-${sourceId}-${targetId}`,
            source: sourceId,
            target: targetId,
            type: "peering",
            connectionType: edge.type,
            isHidden: true,
          });

          // 서브넷인 경우 부모 VPC ID 찾기
          const getParentVpcId = (node: GraphNode): string | null => {
            if (node.type === NodeType.VPC) return node.id;
            if (node.type === NodeType.SUBNET) return node.parentId || null;
            return null;
          };

          const sourceVpcId = getParentVpcId(sourceNode);
          const targetVpcId = getParentVpcId(targetNode);

          // VPC 레벨 연결 정보 저장 (서로 다른 VPC인 경우에만)
          if (sourceVpcId && targetVpcId && sourceVpcId !== targetVpcId) {
            if (!connections.has(sourceVpcId))
              connections.set(sourceVpcId, new Set());
            if (!connections.has(targetVpcId))
              connections.set(targetVpcId, new Set());
            connections.get(sourceVpcId)!.add(targetVpcId);
            connections.get(targetVpcId)!.add(sourceVpcId);
          }

          // 서브넷 레벨 연결 정보도 저장 (서브넷 호버 시 사용)
          if (!connections.has(sourceId)) connections.set(sourceId, new Set());
          if (!connections.has(targetId)) connections.set(targetId, new Set());
          connections.get(sourceId)!.add(targetId);
          connections.get(targetId)!.add(sourceId);

          // 계정 간 네트워크 연결 링크 추가 (회색 실선)
          const getAccountId = (node: GraphNode): string | null => {
            if (node.type === NodeType.ACCOUNT) return node.id;
            if (node.type === NodeType.REGION) return node.parentId || null;
            if (node.type === NodeType.VPC) {
              const region = graphNodes.find((n) => n.id === node.parentId);
              return region?.parentId || null;
            }
            if (node.type === NodeType.SUBNET) {
              const vpc = graphNodes.find((n) => n.id === node.parentId);
              if (vpc) {
                const region = graphNodes.find((n) => n.id === vpc.parentId);
                return region?.parentId || null;
              }
            }
            return null;
          };

          const sourceAccountId = getAccountId(sourceNode);
          const targetAccountId = getAccountId(targetNode);

          // 서로 다른 계정 간 연결인 경우 계정 간 링크 추가
          if (
            sourceAccountId &&
            targetAccountId &&
            sourceAccountId !== targetAccountId
          ) {
            const accountLinkId = `account-link-${sourceAccountId}-${targetAccountId}`;
            const reverseAccountLinkId = `account-link-${targetAccountId}-${sourceAccountId}`;

            if (
              !graphLinks.some(
                (l) => l.id === accountLinkId || l.id === reverseAccountLinkId,
              )
            ) {
              graphLinks.push({
                id: accountLinkId,
                source: sourceAccountId,
                target: targetAccountId,
                type: "tree",
              });
            }
          }
        }
      }
    });

    // ROUTE/GATEWAY/TRANSIT_GATEWAY 엣지 소비
    data.edges?.forEach((edge) => {
      if (
        edge.type === ConnectionType.ROUTE ||
        edge.type === ConnectionType.GATEWAY ||
        edge.type === ConnectionType.TRANSIT_GATEWAY
      ) {
        const sourceId = extractNodeId(edge.source);
        const targetId = extractNodeId(edge.target);

        // nodeConnections에 연결 정보 추가
        if (!connections.has(sourceId)) connections.set(sourceId, new Set());
        if (!connections.has(targetId)) connections.set(targetId, new Set());
        connections.get(sourceId)!.add(targetId);
        connections.get(targetId)!.add(sourceId);

        // ROUTE/GATEWAY의 경우 VPC 레벨 연결 정보도 추가
        const sourceNode = graphNodes.find((n) => n.id === sourceId);
        const targetNode = graphNodes.find((n) => n.id === targetId);
        if (sourceNode && targetNode) {
          const srcVpc =
            sourceNode.type === NodeType.VPC
              ? sourceNode.id
              : sourceNode.parentId;
          const tgtVpc =
            targetNode.type === NodeType.VPC
              ? targetNode.id
              : targetNode.parentId;
          if (srcVpc && tgtVpc && srcVpc !== tgtVpc) {
            if (!connections.has(srcVpc)) connections.set(srcVpc, new Set());
            if (!connections.has(tgtVpc)) connections.set(tgtVpc, new Set());
            connections.get(srcVpc)!.add(tgtVpc);
            connections.get(tgtVpc)!.add(srcVpc);
          }

          // 피어링 링크 추가 (호버 시 시각적 표시용)
          graphLinks.push({
            id: `route-${sourceId}-${targetId}`,
            source: sourceId,
            target: targetId,
            type: "peering",
            connectionType: edge.type,
            isHidden: true,
          });
        }
      }
    });

    // ========================================
    // Subnet RouteTable 기반 Peering 연결 정보 추가
    // ========================================
    console.log("🔍 [RTB Peering] 시작: RouteTable 기반 Peering 연결 처리");

    // Subnet 노드 통계
    const allSubnets = graphNodes.filter(n => n.type === NodeType.SUBNET);
    const subnetsWithRoutes = allSubnets.filter(n => {
      const routes = n.metadata.routes as RouteInfo[] | undefined;
      return routes && routes.length > 0;
    });
    console.log(`🔍 [RTB Peering] 전체 Subnet 노드: ${allSubnets.length}개`);
    console.log(`🔍 [RTB Peering] routes 필드 있는 Subnet: ${subnetsWithRoutes.length}개`);

    if (subnetsWithRoutes.length > 0) {
      const firstSubnetWithRoutes = subnetsWithRoutes[0];
      console.log(`🔍 [RTB Peering] routes 있는 첫 Subnet 샘플:`, {
        id: firstSubnetWithRoutes.id,
        routeCount: (firstSubnetWithRoutes.metadata.routes as RouteInfo[]).length,
        routes: firstSubnetWithRoutes.metadata.routes,
      });
    }

    let rtbPeeringCount = 0;
    let rtbRouteCount = 0;

    graphNodes.forEach((sourceNode) => {
      if (sourceNode.type !== NodeType.SUBNET) return;

      const routes = sourceNode.metadata.routes as RouteInfo[] | undefined;
      if (!routes || routes.length === 0) return;

      routes.forEach((route) => {
        // pcx-로 시작하는 Peering Connection만 처리
        if (!route.target?.startsWith("pcx-")) return;
        if (route.targetType !== "VPC_PEERING") return;
        // ACTIVE 상태인 라우트만 처리 (BLACKHOLE은 비활성 연결)
        if (route.state !== "ACTIVE") return;
        if (!route.destinationCidr) return;

        // 0.0.0.0/0는 IGW/NAT 라우팅이므로 제외
        if (route.destinationCidr === "0.0.0.0/0") return;

        rtbRouteCount++;
        console.log(`🔍 [RTB Peering] Subnet ${sourceNode.id} routes 발견:`, {
          destinationCidr: route.destinationCidr,
          target: route.target,
          targetType: route.targetType,
          state: route.state,
        });

        // destinationCidr에 매칭되는 모든 Subnet/VPC 찾기
        const targetNodes = graphNodes.filter((node) => {
          if (node.type !== NodeType.SUBNET && node.type !== NodeType.VPC)
            return false;

          const cidrBlock = node.metadata.cidrBlock as string | undefined;
          if (!cidrBlock) return false;

          const matches = cidrContainsSubnet(route.destinationCidr!, cidrBlock);
          if (matches) {
            console.log(
              `✅ [RTB Peering] CIDR 매칭 성공: ${route.destinationCidr} ⊇ ${cidrBlock} (${node.type} ${node.id})`,
            );
          }
          return matches;
        });

        console.log(
          `🔍 [RTB Peering] 매칭된 타겟 노드 ${targetNodes.length}개:`,
          targetNodes.map((n) => ({ id: n.id, type: n.type })),
        );

        // VPC 레벨 연결 추가
        const srcVpc = sourceNode.parentId;

        targetNodes.forEach((targetNode) => {
          const tgtVpc =
            targetNode.type === NodeType.VPC
              ? targetNode.id
              : targetNode.parentId;

          // 같은 VPC 내부 통신은 제외
          if (!srcVpc || !tgtVpc || srcVpc === tgtVpc) {
            console.log(
              `⚠️ [RTB Peering] 같은 VPC 내부 통신 스킵: ${srcVpc} === ${tgtVpc}`,
            );
            return;
          }

          rtbPeeringCount++;
          console.log(
            `✅ [RTB Peering] VPC 연결 추가: ${srcVpc} ↔ ${tgtVpc}`,
          );

          // nodeConnections에 양방향 추가
          if (!connections.has(srcVpc)) connections.set(srcVpc, new Set());
          if (!connections.has(tgtVpc)) connections.set(tgtVpc, new Set());
          connections.get(srcVpc)!.add(tgtVpc);
          connections.get(tgtVpc)!.add(srcVpc);

          // Subnet 레벨 연결도 추가 (서브넷 호버 시 사용)
          if (!connections.has(sourceNode.id))
            connections.set(sourceNode.id, new Set());
          if (!connections.has(targetNode.id))
            connections.set(targetNode.id, new Set());
          connections.get(sourceNode.id)!.add(targetNode.id);
          connections.get(targetNode.id)!.add(sourceNode.id);

          // 피어링 링크 추가 (호버 시 시각적 표시용)
          const peeringLinkId = `rtb-peering-${sourceNode.id}-${targetNode.id}`;
          if (!graphLinks.some((l) => l.id === peeringLinkId)) {
            graphLinks.push({
              id: peeringLinkId,
              source: sourceNode.id,
              target: targetNode.id,
              type: "peering",
              connectionType: ConnectionType.VPC_PEERING,
              isHidden: true,
            });
          }
        });
      });
    });

    console.log(
      `🔍 [RTB Peering] 완료: ${rtbRouteCount}개 pcx 라우트 처리, ${rtbPeeringCount}개 VPC 연결 추가`,
    );
    console.log(
      `🔍 [RTB Peering] 최종 nodeConnections:`,
      Array.from(connections.entries()).map(([k, v]) => [k, Array.from(v)]),
    );

    return {
      nodes: graphNodes,
      links: graphLinks,
      vpcToSubnets: vpcSubnets,
      nodeConnections: connections,
    };
  }, [data]);

  // 컨테이너 크기 감지
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: width || 1200, height: height || 800 });
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // VPC 클릭 핸들러
  const handleVpcClick = useCallback((vpcId: string) => {
    setExpandedVpcs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(vpcId)) {
        newSet.delete(vpcId);
      } else {
        newSet.add(vpcId);
      }
      return newSet;
    });
  }, []);

  // 메인 렌더링
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    try {
      const svg = d3.select(svgRef.current);
      const { width, height } = dimensions;

      // 기존 시뮬레이션 정리
      if (simulationRef.current) {
        simulationRef.current.stop();
      }

      svg.selectAll("*").remove();
      svg.attr("width", width).attr("height", height);

      // 보이는 노드만 필터링 및 위치 복원
      const visibleNodes = nodes
        .filter((n) => {
          if (n.type === NodeType.SUBNET) {
            return expandedVpcs.has(n.parentId || "");
          }
          return true;
        })
        .map((n) => {
          // 저장된 위치 확인
          const prevPos = nodePositionsRef.current.get(n.id);
          let x = prevPos?.x ?? n.x;
          let y = prevPos?.y ?? n.y;

          // 위치 정보가 없고 서브넷인 경우 부모(VPC) 위치에서 시작
          if (!prevPos && n.type === NodeType.SUBNET && n.parentId) {
            const parentPos = nodePositionsRef.current.get(n.parentId);
            if (parentPos) {
              // 부모 위치 기준 바깥쪽으로 퍼져나가는 효과
              const dx = parentPos.x - width / 2;
              const dy = parentPos.y - height / 2;
              const parentAngle = Math.atan2(dy, dx);

              // 부모 각도 기준으로 약 60도 범위 내에서 랜덤 분산
              const spread = Math.PI / 3;
              const angle = parentAngle + (Math.random() - 0.5) * spread;

              x = parentPos.x + Math.cos(angle) * 30;
              y = parentPos.y + Math.sin(angle) * 30;
            }
          }

          return {
            ...n,
            isVisible: true,
            x,
            y,
            vx: prevPos?.vx ?? 0,
            vy: prevPos?.vy ?? 0,
          };
        });

      // 보이는 링크만 필터링
      const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
      const visibleLinks = links
        .filter(
          (l) =>
            visibleNodeIds.has(l.source as string) &&
            visibleNodeIds.has(l.target as string),
        )
        .map((l) => ({ ...l }));

      // 메인 그룹 먼저 생성
      const g = svg.append("g").attr("class", "main-group");

      // 줌 설정 (g가 정의된 후에 설정)
      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
          zoomTransformRef.current = event.transform;
        });

      zoomBehaviorRef.current = zoom;
      svg.call(zoom);

      // 이전 줌 상태 복원
      svg.call(zoom.transform, zoomTransformRef.current);

      // 빈 공간 클릭 시 고정 해제
      svg.on("click", (event) => {
        if (event.target === svgRef.current) {
          setPinnedNodeId(null);
        }
      });

      // 마커 정의
      const defs = svg.append("defs");

      // 드롭 쉐도우 필터
      const filter = defs
        .append("filter")
        .attr("id", "highlight-glow")
        .attr("x", "-50%")
        .attr("y", "-50%")
        .attr("width", "200%")
        .attr("height", "200%");

      filter
        .append("feGaussianBlur")
        .attr("stdDeviation", "4")
        .attr("result", "coloredBlur");

      const feMerge = filter.append("feMerge");
      feMerge.append("feMergeNode").attr("in", "coloredBlur");
      feMerge.append("feMergeNode").attr("in", "SourceGraphic");

      Object.entries(CONNECTION_COLORS).forEach(([type, color]) => {
        defs
          .append("marker")
          .attr("id", `arrow-${type}`)
          .attr("viewBox", "0 -5 10 10")
          .attr("refX", 20)
          .attr("refY", 0)
          .attr("markerWidth", 6)
          .attr("markerHeight", 6)
          .attr("orient", "auto")
          .append("path")
          .attr("d", "M0,-5L10,0L0,5")
          .attr("fill", color);
      });

      defs
        .append("marker")
        .attr("id", "arrow-highlight")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 20)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", HIGHLIGHT_COLOR);

      // 노드 초기 위치 저장 (움직임 제한용)
      const nodeHomePositions = new Map<string, { x: number; y: number }>();
      visibleNodes.forEach((node) => {
        nodeHomePositions.set(node.id, { x: node.x!, y: node.y! });
      });

      // 움직임 제한 범위 (px) - 충돌 해소를 위해 충분히 크게
      const MAX_MOVEMENT = 80;

      // Force simulation 설정
      const simulation = d3
        .forceSimulation<GraphNode>(visibleNodes)
        .alphaDecay(0.15) // 더 빨리 안정화
        .velocityDecay(0.6) // 속도 감쇠 증가로 흔들림 감소
        .force(
          "link",
          d3
            .forceLink<GraphNode, GraphLink>(visibleLinks)
            .id((d) => d.id)
            .distance((d) => {
              if (d.type === "peering") return 80;

              // 계층별 거리 설정 (노드 크기 축소에 맞춰 조정)
              const source = d.source as GraphNode;
              const target = d.target as GraphNode;

              const sourceType =
                typeof source === "object" ? source.type : NodeType.ACCOUNT;
              const targetType =
                typeof target === "object" ? target.type : NodeType.VPC;

              if (
                (sourceType === NodeType.ACCOUNT &&
                  targetType === NodeType.REGION) ||
                (targetType === NodeType.ACCOUNT &&
                  sourceType === NodeType.REGION)
              )
                return 160;
              if (
                (sourceType === NodeType.REGION &&
                  targetType === NodeType.VPC) ||
                (targetType === NodeType.REGION && sourceType === NodeType.VPC)
              )
                return 120;
              if (
                (sourceType === NodeType.VPC &&
                  targetType === NodeType.SUBNET) ||
                (targetType === NodeType.VPC && sourceType === NodeType.SUBNET)
              )
                return 100;

              return 80;
            })
            .strength((d) => {
              if (d.type === "peering") return 0.1;
              return 0.3;
            }),
        )
        .force(
          "radial",
          d3
            .forceRadial<GraphNode>(
              (d) => LEVEL_RADIUS[d.type] || 0,
              width / 2,
              height / 2,
            )
            .strength(0.9), // 방사형 구조 더 강하게
        )
        .force("charge", d3.forceManyBody().strength(-250)) // 반발력 더 증가
        .force(
          "collision",
          d3
            .forceCollide<GraphNode>()
            .radius((d) => NODE_SIZES[d.type] + 30) // 충돌 반경: 노드 크기 + 30px (최소 5px 간격 보장)
            .strength(1.0)
            .iterations(3), // 충돌 해소 반복 횟수 증가
        )
        .force("boundPosition", () => {
          // 커스텀 Force: 노드가 홈 위치에서 MAX_MOVEMENT px 이상 벗어나지 못하게 제한
          visibleNodes.forEach((node) => {
            const home = nodeHomePositions.get(node.id);
            if (home && node.x !== undefined && node.y !== undefined) {
              const dx = node.x - home.x;
              const dy = node.y - home.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dist > MAX_MOVEMENT) {
                const scale = MAX_MOVEMENT / dist;
                node.x = home.x + dx * scale;
                node.y = home.y + dy * scale;
                node.vx = 0;
                node.vy = 0;
              }
            }
          });
        });

      simulationRef.current = simulation;

      // 링크 그리기
      const linkGroup = g.append("g").attr("class", "links");

      // 트리 연결만 기본 표시 (피어링 연결은 호버 시에만 표시)
      const treeLinks = visibleLinks.filter((l) => l.type === "tree");
      const peeringLinks = visibleLinks.filter((l) => l.type === "peering");

      const linkElements = linkGroup
        .selectAll("line.tree-link")
        .data(treeLinks)
        .enter()
        .append("line")
        .attr("class", (d) => `link tree-link link-${d.id}`)
        .attr("data-link-id", (d) => d.id)
        .attr("data-source", (d) => d.source)
        .attr("data-target", (d) => d.target)
        .attr("stroke", "#999")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "none")
        .attr("opacity", 0.5);

      // 피어링 연결은 별도 그룹에 숨김 상태로 추가 (호버 시 표시)
      const peeringLinkElements = linkGroup
        .selectAll("line.peering-link")
        .data(peeringLinks)
        .enter()
        .append("line")
        .attr("class", (d) => `link peering-link link-${d.id}`)
        .attr("data-link-id", (d) => d.id)
        .attr("data-source", (d) => d.source)
        .attr("data-target", (d) => d.target)
        .attr("stroke", (d) =>
          d.connectionType ? CONNECTION_COLORS[d.connectionType] : "#999",
        )
        .attr("stroke-width", 2.5)
        .attr("stroke-dasharray", "6,3")
        .attr("opacity", 0); // 기본적으로 숨김

      // 노드 그리기
      const nodeGroup = g.append("g").attr("class", "nodes");

      const nodeElements = nodeGroup
        .selectAll("g")
        .data(visibleNodes)
        .enter()
        .append("g")
        .attr("class", (d) => `node node-${d.id}`)
        .attr("data-node-id", (d) => d.id)
        .attr("data-node-type", (d) => d.type)
        .style("cursor", (d) =>
          d.type === NodeType.VPC || d.type === NodeType.SUBNET
            ? "pointer"
            : "default",
        );

      // 노드 원
      nodeElements
        .append("circle")
        .attr("class", "node-circle")
        .attr("r", (d) => NODE_SIZES[d.type])
        .attr("fill", (d) => NODE_COLORS[d.type].fill)
        .attr("stroke", (d) => NODE_COLORS[d.type].stroke)
        .attr("stroke-width", 2.5);

      // VPC 펼침/접힘 아이콘
      nodeElements
        .filter(
          (d) =>
            d.type === NodeType.VPC &&
            (vpcToSubnets.get(d.id)?.length || 0) > 0,
        )
        .append("text")
        .attr("class", "expand-icon")
        .attr("x", NODE_SIZES[NodeType.VPC] - 2)
        .attr("y", -NODE_SIZES[NodeType.VPC] + 4)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("font-weight", "bold")
        .style("fill", NODE_COLORS[NodeType.VPC].stroke)
        .style("pointer-events", "none")
        .text((d) => (expandedVpcs.has(d.id) ? "−" : "+"));

      // 서브넷 개수 표시
      nodeElements
        .filter(
          (d) =>
            d.type === NodeType.VPC &&
            !expandedVpcs.has(d.id) &&
            (vpcToSubnets.get(d.id)?.length || 0) > 0,
        )
        .append("text")
        .attr("class", "subnet-count")
        .attr("x", (d) => d.displayName.length * 4.5 / 2 + 4)
        .attr("y", NODE_SIZES[NodeType.VPC] + 10)
        .attr("text-anchor", "start")
        .style("font-size", "8px")
        .style("fill", "#888")
        .style("pointer-events", "none")
        .text((d) => `(${vpcToSubnets.get(d.id)?.length || 0})`);

      // 노드 라벨
      nodeElements
        .append("text")
        .attr("class", "node-label")
        .attr("y", (d) => NODE_SIZES[d.type] + 10)
        .attr("text-anchor", "middle")
        .style("font-size", "8px")
        .style("fill", "#333")
        .style("pointer-events", "none")
        .text((d) => d.displayName);

      // 통합 서브넷 배지 (AZ 개수 표시)
      nodeElements
        .filter(
          (d) => d.type === NodeType.SUBNET && d.metadata.isGrouped === true,
        )
        .append("text")
        .attr("class", "az-badge")
        .attr("x", NODE_SIZES[NodeType.SUBNET] + 1)
        .attr("y", -NODE_SIZES[NodeType.SUBNET] + 5)
        .attr("text-anchor", "start")
        .style("font-size", "7px")
        .style("fill", "#6366f1")
        .style("font-weight", "bold")
        .style("pointer-events", "none")
        .text((d) => `${d.metadata.subnetCount}AZ`);

      // 이벤트 핸들러
      nodeElements
        .on("click", (event, d) => {
          event.stopPropagation();
          if (d.type === NodeType.VPC) {
            handleVpcClick(d.id);
          } else if (d.type === NodeType.SUBNET) {
            setSelectedSubnet((prev) => (prev === d.id ? null : d.id));
          }

          // VPC/Subnet 클릭 시 하이라이트 고정 토글
          if (d.type === NodeType.VPC || d.type === NodeType.SUBNET) {
            setPinnedNodeId((prev) => (prev === d.id ? null : d.id));
          }

          onNodeClick?.({
            id: d.id,
            type: d.type,
            label: d.displayName,
            metadata: d.metadata,
          });
        })
        .on("mouseenter", (event, d) => {
          setHoveredNodeId(d.id);
          onNodeHover?.({
            id: d.id,
            type: d.type,
            label: d.displayName,
            metadata: d.metadata,
          });
        })
        .on("mouseleave", () => {
          setHoveredNodeId(null);
          onNodeHover?.(null);
        });

      // 드래그 설정
      const drag = d3
        .drag<SVGGElement, GraphNode>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        });

      nodeElements.call(
        drag as d3.DragBehavior<SVGGElement, GraphNode, unknown>,
      );

      // Simulation tick
      simulation.on("tick", () => {
        // 트리 링크 위치 업데이트
        linkElements
          .attr("x1", (d) => (d.source as GraphNode).x || 0)
          .attr("y1", (d) => (d.source as GraphNode).y || 0)
          .attr("x2", (d) => (d.target as GraphNode).x || 0)
          .attr("y2", (d) => (d.target as GraphNode).y || 0);

        // 피어링 링크 위치 업데이트
        peeringLinkElements
          .attr("x1", (d) => (d.source as GraphNode).x || 0)
          .attr("y1", (d) => (d.source as GraphNode).y || 0)
          .attr("x2", (d) => (d.target as GraphNode).x || 0)
          .attr("y2", (d) => (d.target as GraphNode).y || 0);

        nodeElements.attr(
          "transform",
          (d) => `translate(${d.x || 0}, ${d.y || 0})`,
        );

        // 매 프레임마다 위치 저장 (인터랙션 중 끊김 방지)
        visibleNodes.forEach((node) => {
          nodePositionsRef.current.set(node.id, {
            x: node.x!,
            y: node.y!,
            vx: node.vx,
            vy: node.vy,
          });
        });
      });
    } catch (error) {
      console.error("Force 토폴로지 렌더링 오류:", error);
      onError?.(error instanceof Error ? error : new Error("렌더링 실패"));
    }
  }, [
    nodes,
    links,
    dimensions,
    expandedVpcs,
    vpcToSubnets,
    handleVpcClick,
    onNodeClick,
    onNodeHover,
    onError,
  ]);

  // 호버/고정 하이라이트 업데이트 (별도 useEffect)
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const nodeGroup = svg.select(".nodes");
    const linkGroup = svg.select(".links");

    // 고정 노드 우선, 없으면 호버 노드 사용
    const activeHighlightId = pinnedNodeId || hoveredNodeId;

    // 연결된 노드 ID 찾기 (VPC Peering/CloudWAN/ROUTE/GATEWAY/TGW 네트워크 전체 탐색)
    const connectedNodeIds = new Set<string>();
    if (activeHighlightId) {
      connectedNodeIds.add(activeHighlightId);

      // 활성 노드 정보 찾기
      const hoveredNode = nodes.find((n) => n.id === activeHighlightId);

      console.log(
        `🎯 [Highlight] 호버 노드: ${activeHighlightId} (${hoveredNode?.type})`,
      );

      // VPC Peering/CloudWAN으로 연결된 전체 네트워크 탐색 (BFS)
      const findConnectedNetwork = (startVpcId: string): Set<string> => {
        console.log(`🔍 [BFS] 시작 VPC: ${startVpcId}`);
        const visited = new Set<string>();
        const queue = [startVpcId];

        while (queue.length > 0) {
          const currentId = queue.shift()!;
          if (visited.has(currentId)) continue;
          visited.add(currentId);

          // VPC Peering/CloudWAN 연결 탐색
          const peeringConnections = nodeConnections.get(currentId);
          console.log(
            `🔍 [BFS] ${currentId} 연결:`,
            peeringConnections
              ? Array.from(peeringConnections)
              : "연결 없음",
          );
          if (peeringConnections) {
            peeringConnections.forEach((connectedId) => {
              if (!visited.has(connectedId)) {
                console.log(`  ➡️ [BFS] 큐에 추가: ${connectedId}`);
                queue.push(connectedId);
              }
            });
          }
        }
        console.log(
          `✅ [BFS] 완료. 방문한 노드 ${visited.size}개:`,
          Array.from(visited),
        );
        return visited;
      };

      // 호버된 노드 타입에 따라 네트워크 탐색
      if (hoveredNode) {
        let targetVpcId: string | null = null;

        if (hoveredNode.type === NodeType.VPC) {
          targetVpcId = hoveredNode.id;
        } else if (hoveredNode.type === NodeType.SUBNET) {
          // 서브넷의 부모 VPC 찾기
          targetVpcId = hoveredNode.parentId || null;
        } else if (hoveredNode.type === NodeType.REGION) {
          // 리전 호버 시: 해당 리전의 모든 VPC와 연결된 네트워크 탐색
          const regionVpcs = nodes.filter(
            (n) => n.type === NodeType.VPC && n.parentId === hoveredNode.id,
          );
          regionVpcs.forEach((vpc) => {
            const connectedVpcs = findConnectedNetwork(vpc.id);
            connectedVpcs.forEach((vpcId) => {
              connectedNodeIds.add(vpcId);
              // 해당 VPC의 서브넷들도 추가
              vpcToSubnets.get(vpcId)?.forEach((subnet) => {
                connectedNodeIds.add(subnet.id);
              });
            });
          });
          // 리전 자체와 직접 연결된 노드들도 추가
          connectedNodeIds.add(hoveredNode.id);
        } else if (hoveredNode.type === NodeType.ACCOUNT) {
          // 계정 호버 시: 해당 계정의 모든 리전, VPC, 서브넷과 연결된 네트워크 탐색
          const accountRegions = nodes.filter(
            (n) => n.type === NodeType.REGION && n.parentId === hoveredNode.id,
          );
          accountRegions.forEach((region) => {
            connectedNodeIds.add(region.id);
            const regionVpcs = nodes.filter(
              (n) => n.type === NodeType.VPC && n.parentId === region.id,
            );
            regionVpcs.forEach((vpc) => {
              const connectedVpcs = findConnectedNetwork(vpc.id);
              connectedVpcs.forEach((vpcId) => {
                connectedNodeIds.add(vpcId);
                vpcToSubnets.get(vpcId)?.forEach((subnet) => {
                  connectedNodeIds.add(subnet.id);
                });
              });
            });
          });
          connectedNodeIds.add(hoveredNode.id);
        }

        // VPC 또는 서브넷 호버 시: 연결된 전체 VPC 네트워크 탐색
        if (targetVpcId) {
          console.log(`🎯 [Highlight] VPC/Subnet 호버, targetVpcId: ${targetVpcId}`);
          const connectedVpcs = findConnectedNetwork(targetVpcId);
          console.log(
            `✅ [Highlight] 연결된 VPC ${connectedVpcs.size}개:`,
            Array.from(connectedVpcs),
          );

          connectedVpcs.forEach((vpcId) => {
            connectedNodeIds.add(vpcId);

            // 해당 VPC의 서브넷들도 추가 (펼쳐져 있는 경우)
            vpcToSubnets.get(vpcId)?.forEach((subnet) => {
              connectedNodeIds.add(subnet.id);
            });

            // VPC의 부모 리전도 추가
            const vpcNode = nodes.find((n) => n.id === vpcId);
            if (vpcNode?.parentId) {
              connectedNodeIds.add(vpcNode.parentId);
              // 리전의 부모 계정도 추가
              const regionNode = nodes.find((n) => n.id === vpcNode.parentId);
              if (regionNode?.parentId) {
                connectedNodeIds.add(regionNode.parentId);
              }
            }
          });
        }
      }
    }

    console.log(
      `🎨 [Highlight] 최종 하이라이트될 노드 ${connectedNodeIds.size}개:`,
      Array.from(connectedNodeIds),
    );

    // 노드 하이라이트 업데이트
    nodeGroup.selectAll(".node").each(function () {
      const nodeEl = d3.select(this);
      const nodeId = nodeEl.attr("data-node-id");
      const nodeType = nodeEl.attr("data-node-type") as NodeType;

      const isActive = activeHighlightId === nodeId;
      const isConnected = activeHighlightId && connectedNodeIds.has(nodeId);
      const isSelected = selectedSubnet === nodeId;
      const isPinned = pinnedNodeId === nodeId;
      const shouldHighlight = isActive || isConnected || isSelected;

      const colors = NODE_COLORS[nodeType];

      // 고정된 노드는 주황색 테두리로 구분
      const strokeColor = isPinned
        ? "#ff6b35"
        : shouldHighlight
          ? HIGHLIGHT_COLOR
          : colors.stroke;
      const strokeWidth = isPinned ? 5 : shouldHighlight ? 4 : 2.5;

      nodeEl
        .select(".node-circle")
        .transition()
        .duration(150)
        .attr("fill", colors.fill)
        .attr("stroke", strokeColor)
        .attr("stroke-width", strokeWidth)
        .attr("filter", shouldHighlight ? "url(#highlight-glow)" : "none");

      nodeEl
        .select(".node-label")
        .transition()
        .duration(150)
        .style("fill", shouldHighlight ? HIGHLIGHT_COLOR : "#333")
        .style("font-weight", shouldHighlight ? "bold" : "normal");
    });

    // 링크 하이라이트 업데이트
    linkGroup.selectAll("line").each(function () {
      const linkEl = d3.select(this);
      const sourceId = linkEl.attr("data-source");
      const targetId = linkEl.attr("data-target");

      const isConnectedLink =
        activeHighlightId &&
        connectedNodeIds.has(sourceId) &&
        connectedNodeIds.has(targetId);

      if (isConnectedLink) {
        linkEl
          .transition()
          .duration(150)
          .attr("stroke", HIGHLIGHT_COLOR)
          .attr("stroke-width", 4)
          .attr("opacity", 1)
          .attr("stroke-dasharray", "none");
      } else {
        const linkId = linkEl.attr("data-link-id");
        const isPeering = linkId?.startsWith("peering-");

        linkEl
          .transition()
          .duration(150)
          .attr(
            "stroke",
            isPeering ? CONNECTION_COLORS[ConnectionType.VPC_PEERING] : "#999",
          )
          .attr("stroke-width", isPeering ? 2.5 : 1.5)
          .attr("opacity", isPeering ? 0 : 0.5) // 피어링 연결은 기본적으로 숨김
          .attr("stroke-dasharray", isPeering ? "6,3" : "none");
      }
    });
  }, [
    hoveredNodeId,
    pinnedNodeId,
    selectedSubnet,
    links,
    nodeConnections,
    nodes,
    vpcToSubnets,
  ]);

  // 줌 컨트롤
  const handleZoomIn = useCallback(() => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomBehaviorRef.current.scaleBy, 1.3);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomBehaviorRef.current.scaleBy, 0.7);
    }
  }, []);

  const handleFitView = useCallback(() => {
    if (svgRef.current && zoomBehaviorRef.current) {
      const svg = d3.select(svgRef.current);
      const g = svg.select(".main-group");
      const bounds = (g.node() as SVGGElement)?.getBBox();

      if (bounds && bounds.width > 0 && bounds.height > 0) {
        const { width, height } = dimensions;
        const scale = Math.min(
          (width - 100) / bounds.width,
          (height - 100) / bounds.height,
          1.5,
        );
        const tx = (width - bounds.width * scale) / 2 - bounds.x * scale;
        const ty = (height - bounds.height * scale) / 2 - bounds.y * scale;

        const newTransform = d3.zoomIdentity.translate(tx, ty).scale(scale);
        svg
          .transition()
          .duration(500)
          .call(zoomBehaviorRef.current.transform, newTransform);
        zoomTransformRef.current = newTransform;
      }
    }
  }, [dimensions]);

  const handleReset = useCallback(() => {
    if (svgRef.current && zoomBehaviorRef.current) {
      const newTransform = d3.zoomIdentity;
      d3.select(svgRef.current)
        .transition()
        .duration(500)
        .call(zoomBehaviorRef.current.transform, newTransform);
      zoomTransformRef.current = newTransform;
    }
    setExpandedVpcs(new Set());
    setSelectedSubnet(null);
    setHoveredNodeId(null);
    setPinnedNodeId(null);
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      {/* 컨트롤 버튼 */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomIn}
          title="확대"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomOut}
          title="축소"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleFitView}
          title="화면에 맞춤"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleReset}
          title="초기화"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* 범례 */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/95 rounded-lg p-3 shadow-md border text-xs">
        <div className="font-semibold mb-2">범례</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {[
            { type: NodeType.ACCOUNT, label: "계정" },
            { type: NodeType.REGION, label: "리전" },
            { type: NodeType.VPC, label: "VPC" },
            { type: NodeType.SUBNET, label: "서브넷" },
          ].map(({ type, label }) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border-2"
                style={{
                  backgroundColor: NODE_COLORS[type].fill,
                  borderColor: NODE_COLORS[type].stroke,
                }}
              />
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{
                backgroundColor: HIGHLIGHT_COLOR,
                boxShadow: HIGHLIGHT_GLOW,
              }}
            />
            <span>연결/호버</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t text-muted-foreground">
          <p>• VPC 클릭: 서브넷 펼침 + 하이라이트 고정</p>
          <p>• 서브넷 클릭: 하이라이트 고정</p>
          <p>• 빈 공간 클릭: 고정 해제</p>
          <p>• 노드 드래그: 위치 이동</p>
          <p>• 노드 호버: 연결 하이라이트</p>
        </div>
      </div>

      {/* 선택된 서브넷 정보 */}
      {selectedSubnet && (
        <div className="absolute top-4 left-4 z-10 bg-white/95 rounded-lg p-3 shadow-md border max-w-xs">
          <div className="text-sm font-semibold mb-1">선택된 서브넷</div>
          <div className="text-xs text-muted-foreground break-all">
            {selectedSubnet}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-6 text-xs"
            onClick={() => setSelectedSubnet(null)}
          >
            선택 해제
          </Button>
        </div>
      )}

      <svg ref={svgRef} className="w-full h-full bg-slate-50" />
    </div>
  );
}

export default ForceTopologyVisualization;
