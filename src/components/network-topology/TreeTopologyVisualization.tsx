/**
 * 방사형 네트워크 토폴로지 시각화 컴포넌트
 * 계정이 중심에, 리전 → VPC → 서브넷이 바깥으로 퍼지는 방사형 레이아웃
 * - VPC 클릭 시 서브넷 펼침/접힘
 * - 서브넷 클릭 시 연결된 서브넷 표시
 * - 노드 호버 시 동일 레벨 노드와 관계선 하이라이트
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
import type { NetworkTopologyData, NodeData } from "@/types/network-topology";
import { NodeType, ConnectionType } from "@/types/network-topology";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TreeTopologyVisualizationProps {
  data: NetworkTopologyData;
  onNodeClick?: (node: NodeData) => void;
  onNodeHover?: (node: NodeData | null) => void;
  className?: string;
  onError?: (error: Error) => void;
}

interface TreeNode {
  id: string;
  type: NodeType;
  label: string;
  displayName: string; // 태그 이름 또는 ID
  metadata: Record<string, unknown>;
  children?: TreeNode[];
  parent?: TreeNode;
  _collapsed?: boolean;
  x?: number;
  y?: number;
  angle?: number;
  radius?: number;
}

interface ConnectionInfo {
  sourceId: string;
  targetId: string;
  sourceLevel: NodeType;
  targetLevel: NodeType;
  type: ConnectionType;
  metadata: Record<string, unknown>;
}

interface VpcPeeringInfo {
  sourceVpcId: string;
  targetVpcId: string;
  sourceAccountId: string;
  targetAccountId: string;
  type: ConnectionType;
}

// 노드 레벨별 색상
const NODE_COLORS: Record<
  NodeType,
  { fill: string; stroke: string; hover: string }
> = {
  [NodeType.ACCOUNT]: { fill: "#e3f2fd", stroke: "#1976d2", hover: "#00ff00" },
  [NodeType.REGION]: { fill: "#f3e5f5", stroke: "#7b1fa2", hover: "#00ff00" },
  [NodeType.VPC]: { fill: "#e8f5e9", stroke: "#388e3c", hover: "#00ff00" },
  [NodeType.SUBNET]: { fill: "#fff3e0", stroke: "#f57c00", hover: "#00ff00" },
  [NodeType.IGW]: { fill: "#e0f7fa", stroke: "#0097a7", hover: "#00ff00" },
  [NodeType.NAT]: { fill: "#fce4ec", stroke: "#c2185b", hover: "#00ff00" },
};

// 노드 크기
const NODE_SIZES: Record<NodeType, { width: number; height: number }> = {
  [NodeType.ACCOUNT]: { width: 120, height: 40 },
  [NodeType.REGION]: { width: 100, height: 35 },
  [NodeType.VPC]: { width: 100, height: 35 },
  [NodeType.SUBNET]: { width: 90, height: 30 },
  [NodeType.IGW]: { width: 70, height: 25 },
  [NodeType.NAT]: { width: 70, height: 25 },
};

// 연결선 색상
const CONNECTION_COLORS: Record<ConnectionType, string> = {
  [ConnectionType.VPC_PEERING]: "#2196f3",
  [ConnectionType.CLOUDWAN]: "#9c27b0",
  [ConnectionType.GATEWAY]: "#4caf50",
  [ConnectionType.ROUTE]: "#ff9800",
  [ConnectionType.TRANSIT_GATEWAY]: "#e91e63",
};

const HIGHLIGHT_COLOR = "#00ff00"; // 형광색

// 태그에서 Name 추출
function getTagName(
  metadata: Record<string, unknown>,
  fallbackId: string,
): string {
  const tags = metadata?.tags as Record<string, string> | undefined;
  if (tags?.Name) return tags.Name;
  if (tags?.name) return tags.name;
  // metadata에 직접 name이 있는 경우
  if (typeof metadata?.name === "string") return metadata.name;
  if (typeof metadata?.Name === "string") return metadata.Name;
  // ID에서 짧은 형태 반환
  if (fallbackId.startsWith("vpc-")) return fallbackId.substring(0, 15);
  if (fallbackId.startsWith("subnet-")) return fallbackId.substring(0, 18);
  return fallbackId.length > 20
    ? fallbackId.substring(0, 17) + "..."
    : fallbackId;
}

export function TreeTopologyVisualization({
  data,
  onNodeClick,
  onNodeHover,
  className = "",
  onError,
}: TreeTopologyVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [expandedVpcs, setExpandedVpcs] = useState<Set<string>>(new Set());
  const [selectedSubnet, setSelectedSubnet] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NodeData | null>(null);
  const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform>(
    d3.zoomIdentity,
  );
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<
    SVGSVGElement,
    unknown
  > | null>(null);

  // 데이터를 트리 구조로 변환
  const { treeData, connections, subnetConnections } = useMemo(() => {
    if (!data?.hierarchy?.accounts) {
      return { treeData: [], connections: [], subnetConnections: new Map() };
    }

    const trees: TreeNode[] = [];
    const conns: ConnectionInfo[] = [];
    const subnetConns = new Map<string, Set<string>>();

    // VPC간 연결 정보 수집 (Account, Region, VPC, Subnet 레벨)
    const nodeToAccount = new Map<string, string>();
    const nodeToRegion = new Map<string, string>();
    const nodeToVpc = new Map<string, string>();

    // 계층 구조 생성
    Object.entries(data.hierarchy.accounts).forEach(([accountId, account]) => {
      const accountNode: TreeNode = {
        id: accountId,
        type: NodeType.ACCOUNT,
        label: account.accountName || accountId,
        displayName: account.accountName || accountId,
        metadata: { accountId },
        children: [],
      };

      Object.entries(account.regions || {}).forEach(([regionName, region]) => {
        const regionNode: TreeNode = {
          id: `${accountId}-${regionName}`,
          type: NodeType.REGION,
          label: regionName,
          displayName: regionName,
          metadata: { accountId, region: regionName },
          children: [],
          parent: accountNode,
        };

        Object.entries(region.vpcs || {}).forEach(([vpcId, vpc]) => {
          const vpcMetadata = {
            accountId,
            region: regionName,
            vpcId,
            cidrBlock: vpc.cidrBlock,
            tags: (vpc as unknown as Record<string, unknown>).tags,
            name: (vpc as unknown as Record<string, unknown>).name,
          };
          const vpcNode: TreeNode = {
            id: vpcId,
            type: NodeType.VPC,
            label: vpcId,
            displayName: getTagName(
              vpcMetadata as Record<string, unknown>,
              vpcId,
            ),
            metadata: vpcMetadata,
            children: [],
            parent: regionNode,
            _collapsed: true,
          };

          nodeToAccount.set(vpcId, accountId);
          nodeToRegion.set(vpcId, regionName);
          nodeToVpc.set(vpcId, vpcId);

          // 서브넷 추가
          Object.entries(vpc.subnets || {}).forEach(([subnetId, subnet]) => {
            const subnetRecord = subnet as unknown as Record<string, unknown>;
            const subnetMetadata = {
              accountId,
              region: regionName,
              vpcId,
              subnetId,
              cidrBlock: subnet.cidrBlock,
              availabilityZone: subnet.availabilityZone,
              isPublic: subnet.isPublic,
              tags: subnetRecord.tags,
              name: subnetRecord.name,
              routeTableId: subnetRecord.routeTableId,
              routes: subnetRecord.routes,
            };
            const subnetNode: TreeNode = {
              id: subnetId,
              type: NodeType.SUBNET,
              label: subnetId,
              displayName: getTagName(
                subnetMetadata as Record<string, unknown>,
                subnetId,
              ),
              metadata: subnetMetadata,
              parent: vpcNode,
            };
            vpcNode.children!.push(subnetNode);

            nodeToAccount.set(subnetId, accountId);
            nodeToRegion.set(subnetId, regionName);
            nodeToVpc.set(subnetId, vpcId);
          });

          regionNode.children!.push(vpcNode);
        });

        accountNode.children!.push(regionNode);
      });

      trees.push(accountNode);
    });

    // Edge 데이터에서 연결 정보 추출
    data.edges?.forEach((edge) => {
      const sourceNode = data.nodes?.find((n) => n.id === edge.source);
      const targetNode = data.nodes?.find((n) => n.id === edge.target);

      if (sourceNode && targetNode) {
        conns.push({
          sourceId: edge.source,
          targetId: edge.target,
          sourceLevel: sourceNode.type,
          targetLevel: targetNode.type,
          type: edge.type,
          metadata: edge.metadata,
        });

        // 서브넷 연결 맵 구성
        if (
          sourceNode.type === NodeType.SUBNET &&
          targetNode.type === NodeType.SUBNET
        ) {
          if (!subnetConns.has(edge.source)) {
            subnetConns.set(edge.source, new Set());
          }
          if (!subnetConns.has(edge.target)) {
            subnetConns.set(edge.target, new Set());
          }
          subnetConns.get(edge.source)!.add(edge.target);
          subnetConns.get(edge.target)!.add(edge.source);
        }

        // VPC간 연결도 서브넷 연결로 추론
        if (
          sourceNode.type === NodeType.VPC &&
          targetNode.type === NodeType.VPC
        ) {
          // VPC 연결을 해당 VPC의 모든 서브넷간 연결로 확장
          const sourceVpcNode = findVpcNode(trees, edge.source);
          const targetVpcNode = findVpcNode(trees, edge.target);

          if (sourceVpcNode && targetVpcNode) {
            sourceVpcNode.children?.forEach((sourceSubnet) => {
              targetVpcNode.children?.forEach((targetSubnet) => {
                if (!subnetConns.has(sourceSubnet.id)) {
                  subnetConns.set(sourceSubnet.id, new Set());
                }
                if (!subnetConns.has(targetSubnet.id)) {
                  subnetConns.set(targetSubnet.id, new Set());
                }
                subnetConns.get(sourceSubnet.id)!.add(targetSubnet.id);
                subnetConns.get(targetSubnet.id)!.add(sourceSubnet.id);
              });
            });
          }
        }
      }
    });

    return {
      treeData: trees,
      connections: conns,
      subnetConnections: subnetConns,
    };
  }, [data]);

  // VPC 노드 찾기 헬퍼
  function findVpcNode(trees: TreeNode[], vpcId: string): TreeNode | null {
    for (const account of trees) {
      for (const region of account.children || []) {
        for (const vpc of region.children || []) {
          if (vpc.id === vpcId) return vpc;
        }
      }
    }
    return null;
  }

  // 노드에서 Account ID 추출
  const getAccountFromNode = useCallback(
    (nodeId: string): string | null => {
      for (const account of treeData) {
        if (account.id === nodeId) return account.id;
        for (const region of account.children || []) {
          if (region.id === nodeId) return account.id;
          for (const vpc of region.children || []) {
            if (vpc.id === nodeId) return account.id;
            for (const subnet of vpc.children || []) {
              if (subnet.id === nodeId) return account.id;
            }
          }
        }
      }
      return null;
    },
    [treeData],
  );

  // 노드에서 Region ID 추출
  const getRegionFromNode = useCallback(
    (nodeId: string): string | null => {
      for (const account of treeData) {
        for (const region of account.children || []) {
          if (region.id === nodeId) return region.id;
          for (const vpc of region.children || []) {
            if (vpc.id === nodeId) return region.id;
            for (const subnet of vpc.children || []) {
              if (subnet.id === nodeId) return region.id;
            }
          }
        }
      }
      return null;
    },
    [treeData],
  );

  // 노드에서 VPC ID 추출
  const getVpcFromNode = useCallback(
    (nodeId: string): string | null => {
      for (const account of treeData) {
        for (const region of account.children || []) {
          for (const vpc of region.children || []) {
            if (vpc.id === nodeId) return vpc.id;
            for (const subnet of vpc.children || []) {
              if (subnet.id === nodeId) return vpc.id;
            }
          }
        }
      }
      return null;
    },
    [treeData],
  );

  // 동일 레벨에서 연결된 노드 찾기
  const getConnectedNodesAtLevel = useCallback(
    (nodeId: string, nodeType: NodeType): Set<string> => {
      const connected = new Set<string>();

      connections.forEach((conn) => {
        // 같은 레벨의 노드간 연결 또는 부모 레벨 노드에서 파생된 연결 확인
        if (conn.sourceLevel === nodeType && conn.targetLevel === nodeType) {
          if (conn.sourceId === nodeId) connected.add(conn.targetId);
          if (conn.targetId === nodeId) connected.add(conn.sourceId);
        }

        // VPC 레벨에서 Account/Region 연결 유추
        if (nodeType === NodeType.ACCOUNT) {
          const sourceAccount = getAccountFromNode(conn.sourceId);
          const targetAccount = getAccountFromNode(conn.targetId);
          if (
            sourceAccount === nodeId &&
            targetAccount &&
            targetAccount !== nodeId
          ) {
            connected.add(targetAccount);
          }
          if (
            targetAccount === nodeId &&
            sourceAccount &&
            sourceAccount !== nodeId
          ) {
            connected.add(sourceAccount);
          }
        }

        if (nodeType === NodeType.REGION) {
          const sourceRegion = getRegionFromNode(conn.sourceId);
          const targetRegion = getRegionFromNode(conn.targetId);
          if (
            sourceRegion === nodeId &&
            targetRegion &&
            targetRegion !== nodeId
          ) {
            connected.add(targetRegion);
          }
          if (
            targetRegion === nodeId &&
            sourceRegion &&
            sourceRegion !== nodeId
          ) {
            connected.add(sourceRegion);
          }
        }

        if (nodeType === NodeType.VPC) {
          const sourceVpc = getVpcFromNode(conn.sourceId);
          const targetVpc = getVpcFromNode(conn.targetId);
          if (sourceVpc === nodeId && targetVpc && targetVpc !== nodeId) {
            connected.add(targetVpc);
          }
          if (targetVpc === nodeId && sourceVpc && sourceVpc !== nodeId) {
            connected.add(sourceVpc);
          }
        }
      });

      return connected;
    },
    [connections, getAccountFromNode, getRegionFromNode, getVpcFromNode],
  );

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

  // VPC 토글 핸들러
  const handleVpcClick = useCallback((vpcId: string) => {
    setExpandedVpcs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(vpcId)) {
        newSet.delete(vpcId);
        setSelectedSubnet(null);
      } else {
        newSet.add(vpcId);
      }
      return newSet;
    });
  }, []);

  // 서브넷 클릭 핸들러
  const handleSubnetClick = useCallback(
    (subnetId: string) => {
      if (selectedSubnet === subnetId) {
        setSelectedSubnet(null);
      } else {
        setSelectedSubnet(subnetId);
        // 연결된 서브넷의 VPC도 펼치기
        const connectedSubnets = subnetConnections.get(subnetId);
        if (connectedSubnets) {
          setExpandedVpcs((prev) => {
            const newSet = new Set(prev);
            connectedSubnets.forEach((connSubnetId) => {
              const vpcId = getVpcFromNode(connSubnetId);
              if (vpcId) newSet.add(vpcId);
            });
            return newSet;
          });
        }
      }
    },
    [selectedSubnet, subnetConnections, getVpcFromNode],
  );

  // 호버 핸들러
  const handleNodeHover = useCallback(
    (node: NodeData | null) => {
      setHoveredNode(node);
      onNodeHover?.(node);
    },
    [onNodeHover],
  );

  // 메인 렌더링
  useEffect(() => {
    if (!svgRef.current || treeData.length === 0) return;

    try {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const { width, height } = dimensions;
      svg.attr("width", width).attr("height", height);

      // 줌 설정
      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
          setZoomTransform(event.transform);
        });

      zoomBehaviorRef.current = zoom;
      svg.call(zoom);

      // 메인 그룹
      const g = svg.append("g").attr("class", "main-group");

      // 화살표 마커 정의
      const defs = svg.append("defs");
      Object.entries(CONNECTION_COLORS).forEach(([type, color]) => {
        defs
          .append("marker")
          .attr("id", `arrow-${type}`)
          .attr("viewBox", "0 -5 10 10")
          .attr("refX", 8)
          .attr("refY", 0)
          .attr("markerWidth", 6)
          .attr("markerHeight", 6)
          .attr("orient", "auto")
          .append("path")
          .attr("d", "M0,-5L10,0L0,5")
          .attr("fill", color);
      });

      // 하이라이트 마커
      defs
        .append("marker")
        .attr("id", "arrow-highlight")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 8)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", HIGHLIGHT_COLOR);

      // 노드 위치 계산
      const nodePositions = new Map<string, { x: number; y: number }>();
      const levelSpacing = 180;
      const nodeSpacing = 60;

      let accountX = 100;
      treeData.forEach((account) => {
        let accountWidth = 0;
        let regionX = accountX;

        (account.children || []).forEach((region) => {
          let regionWidth = 0;
          let vpcX = regionX;

          (region.children || []).forEach((vpc) => {
            const isExpanded = expandedVpcs.has(vpc.id);
            const subnetCount = isExpanded ? vpc.children?.length || 0 : 0;
            const vpcWidth = Math.max(
              NODE_SIZES[NodeType.VPC].width,
              subnetCount * (NODE_SIZES[NodeType.SUBNET].width + 20),
            );

            nodePositions.set(vpc.id, {
              x: vpcX + vpcWidth / 2,
              y: levelSpacing * 2 + 50,
            });

            // 서브넷 위치
            if (isExpanded && vpc.children) {
              let subnetX = vpcX + 10;
              vpc.children.forEach((subnet) => {
                nodePositions.set(subnet.id, {
                  x: subnetX + NODE_SIZES[NodeType.SUBNET].width / 2,
                  y: levelSpacing * 3 + 50,
                });
                subnetX += NODE_SIZES[NodeType.SUBNET].width + 20;
              });
            }

            vpcX += vpcWidth + nodeSpacing;
            regionWidth += vpcWidth + nodeSpacing;
          });

          regionWidth = Math.max(
            regionWidth - nodeSpacing,
            NODE_SIZES[NodeType.REGION].width,
          );
          nodePositions.set(region.id, {
            x: regionX + regionWidth / 2,
            y: levelSpacing + 50,
          });

          regionX += regionWidth + nodeSpacing;
          accountWidth += regionWidth + nodeSpacing;
        });

        accountWidth = Math.max(
          accountWidth - nodeSpacing,
          NODE_SIZES[NodeType.ACCOUNT].width,
        );
        nodePositions.set(account.id, {
          x: accountX + accountWidth / 2,
          y: 50,
        });

        accountX += accountWidth + nodeSpacing * 2;
      });

      // 연결선 그리기 (트리 구조 연결선)
      const treeLinksGroup = g.append("g").attr("class", "tree-links");

      treeData.forEach((account) => {
        const accountPos = nodePositions.get(account.id);
        if (!accountPos) return;

        (account.children || []).forEach((region) => {
          const regionPos = nodePositions.get(region.id);
          if (!regionPos) return;

          // Account → Region 연결선
          treeLinksGroup
            .append("path")
            .attr("class", "tree-link")
            .attr(
              "d",
              `M${accountPos.x},${accountPos.y + NODE_SIZES[NodeType.ACCOUNT].height / 2} L${accountPos.x},${(accountPos.y + regionPos.y) / 2} L${regionPos.x},${(accountPos.y + regionPos.y) / 2} L${regionPos.x},${regionPos.y - NODE_SIZES[NodeType.REGION].height / 2}`,
            )
            .attr("fill", "none")
            .attr("stroke", "#ccc")
            .attr("stroke-width", 1.5);

          (region.children || []).forEach((vpc) => {
            const vpcPos = nodePositions.get(vpc.id);
            if (!vpcPos) return;

            // Region → VPC 연결선
            treeLinksGroup
              .append("path")
              .attr("class", "tree-link")
              .attr(
                "d",
                `M${regionPos.x},${regionPos.y + NODE_SIZES[NodeType.REGION].height / 2} L${regionPos.x},${(regionPos.y + vpcPos.y) / 2} L${vpcPos.x},${(regionPos.y + vpcPos.y) / 2} L${vpcPos.x},${vpcPos.y - NODE_SIZES[NodeType.VPC].height / 2}`,
              )
              .attr("fill", "none")
              .attr("stroke", "#ccc")
              .attr("stroke-width", 1.5);

            // VPC → Subnet 연결선
            if (expandedVpcs.has(vpc.id) && vpc.children) {
              vpc.children.forEach((subnet) => {
                const subnetPos = nodePositions.get(subnet.id);
                if (!subnetPos) return;

                treeLinksGroup
                  .append("path")
                  .attr("class", "tree-link")
                  .attr(
                    "d",
                    `M${vpcPos.x},${vpcPos.y + NODE_SIZES[NodeType.VPC].height / 2} L${vpcPos.x},${(vpcPos.y + subnetPos.y) / 2} L${subnetPos.x},${(vpcPos.y + subnetPos.y) / 2} L${subnetPos.x},${subnetPos.y - NODE_SIZES[NodeType.SUBNET].height / 2}`,
                  )
                  .attr("fill", "none")
                  .attr("stroke", "#ccc")
                  .attr("stroke-width", 1);
              });
            }
          });
        });
      });

      // 크로스 연결선 그리기 (VPC간 피어링 등)
      const crossLinksGroup = g.append("g").attr("class", "cross-links");

      // 호버된 노드의 연결된 노드들
      const hoveredConnections = hoveredNode
        ? getConnectedNodesAtLevel(hoveredNode.id, hoveredNode.type)
        : new Set<string>();

      // 선택된 서브넷의 연결
      const selectedSubnetConnections = selectedSubnet
        ? subnetConnections.get(selectedSubnet) || new Set<string>()
        : new Set<string>();

      connections.forEach((conn) => {
        const sourcePos = nodePositions.get(conn.sourceId);
        const targetPos = nodePositions.get(conn.targetId);

        if (!sourcePos || !targetPos) return;
        if (conn.sourceId === conn.targetId) return;

        // 같은 레벨의 노드 간 연결만 그리기 (크로스 연결)
        if (conn.sourceLevel !== conn.targetLevel) return;

        const isHighlighted =
          (hoveredNode?.id === conn.sourceId &&
            hoveredConnections.has(conn.targetId)) ||
          (hoveredNode?.id === conn.targetId &&
            hoveredConnections.has(conn.sourceId));

        const isSubnetConnection =
          conn.sourceLevel === NodeType.SUBNET &&
          ((selectedSubnet === conn.sourceId &&
            selectedSubnetConnections.has(conn.targetId)) ||
            (selectedSubnet === conn.targetId &&
              selectedSubnetConnections.has(conn.sourceId)));

        // 펼쳐진 VPC의 서브넷만 표시
        if (conn.sourceLevel === NodeType.SUBNET) {
          const sourceVpc = getVpcFromNode(conn.sourceId);
          const targetVpc = getVpcFromNode(conn.targetId);
          if (!sourceVpc || !targetVpc) return;
          if (!expandedVpcs.has(sourceVpc) || !expandedVpcs.has(targetVpc))
            return;
        }

        const strokeColor =
          isHighlighted || isSubnetConnection
            ? HIGHLIGHT_COLOR
            : CONNECTION_COLORS[conn.type] || "#999";
        const strokeWidth = isHighlighted || isSubnetConnection ? 3 : 1.5;
        const strokeOpacity = isHighlighted || isSubnetConnection ? 1 : 0.5;

        // 곡선 연결선
        const midY = Math.min(sourcePos.y, targetPos.y) - 40;
        crossLinksGroup
          .append("path")
          .attr(
            "class",
            `cross-link ${isHighlighted ? "highlighted" : ""} ${isSubnetConnection ? "subnet-connected" : ""}`,
          )
          .attr(
            "d",
            `M${sourcePos.x},${sourcePos.y - NODE_SIZES[conn.sourceLevel].height / 2} Q${(sourcePos.x + targetPos.x) / 2},${midY} ${targetPos.x},${targetPos.y - NODE_SIZES[conn.targetLevel].height / 2}`,
          )
          .attr("fill", "none")
          .attr("stroke", strokeColor)
          .attr("stroke-width", strokeWidth)
          .attr("stroke-opacity", strokeOpacity)
          .attr("stroke-dasharray", isSubnetConnection ? "none" : "5,3")
          .attr(
            "marker-end",
            isHighlighted
              ? "url(#arrow-highlight)"
              : `url(#arrow-${conn.type})`,
          );
      });

      // 서브넷 연결선 (선택된 서브넷)
      if (selectedSubnet && selectedSubnetConnections.size > 0) {
        const sourcePos = nodePositions.get(selectedSubnet);
        if (sourcePos) {
          selectedSubnetConnections.forEach((targetSubnetId) => {
            const targetPos = nodePositions.get(targetSubnetId);
            if (!targetPos) return;

            const midY = Math.max(sourcePos.y, targetPos.y) + 60;
            crossLinksGroup
              .append("path")
              .attr("class", "subnet-connection highlighted")
              .attr(
                "d",
                `M${sourcePos.x},${sourcePos.y + NODE_SIZES[NodeType.SUBNET].height / 2} Q${(sourcePos.x + targetPos.x) / 2},${midY} ${targetPos.x},${targetPos.y + NODE_SIZES[NodeType.SUBNET].height / 2}`,
              )
              .attr("fill", "none")
              .attr("stroke", HIGHLIGHT_COLOR)
              .attr("stroke-width", 3)
              .attr("stroke-opacity", 1)
              .attr("marker-end", "url(#arrow-highlight)");
          });
        }
      }

      // 노드 그리기
      const nodesGroup = g.append("g").attr("class", "nodes");

      const renderNode = (node: TreeNode, isVisible: boolean = true) => {
        const pos = nodePositions.get(node.id);
        if (!pos || !isVisible) return;

        const size = NODE_SIZES[node.type];
        const colors = NODE_COLORS[node.type];

        const isHovered = hoveredNode?.id === node.id;
        const isConnected =
          hoveredNode &&
          hoveredConnections.has(node.id) &&
          hoveredNode.type === node.type;
        const isSelectedSubnetNode = selectedSubnet === node.id;
        const isConnectedSubnet =
          selectedSubnet && selectedSubnetConnections.has(node.id);

        const nodeGroup = nodesGroup
          .append("g")
          .attr("class", `node node-${node.type.toLowerCase()}`)
          .attr(
            "transform",
            `translate(${pos.x - size.width / 2}, ${pos.y - size.height / 2})`,
          )
          .style(
            "cursor",
            node.type === NodeType.VPC || node.type === NodeType.SUBNET
              ? "pointer"
              : "default",
          );

        // 노드 배경
        nodeGroup
          .append("rect")
          .attr("width", size.width)
          .attr("height", size.height)
          .attr("rx", 6)
          .attr("ry", 6)
          .attr(
            "fill",
            isHovered ||
              isConnected ||
              isSelectedSubnetNode ||
              isConnectedSubnet
              ? HIGHLIGHT_COLOR
              : colors.fill,
          )
          .attr(
            "stroke",
            isHovered ||
              isConnected ||
              isSelectedSubnetNode ||
              isConnectedSubnet
              ? HIGHLIGHT_COLOR
              : colors.stroke,
          )
          .attr(
            "stroke-width",
            isHovered ||
              isConnected ||
              isSelectedSubnetNode ||
              isConnectedSubnet
              ? 3
              : 2,
          )
          .attr(
            "filter",
            isHovered || isConnected
              ? "drop-shadow(0 0 8px rgba(0, 255, 0, 0.8))"
              : "none",
          );

        // 노드 라벨
        nodeGroup
          .append("text")
          .attr("x", size.width / 2)
          .attr("y", size.height / 2)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .style("font-size", node.type === NodeType.ACCOUNT ? "12px" : "10px")
          .style(
            "font-weight",
            node.type === NodeType.ACCOUNT ? "bold" : "normal",
          )
          .style(
            "fill",
            isHovered ||
              isConnected ||
              isSelectedSubnetNode ||
              isConnectedSubnet
              ? "#000"
              : "#333",
          )
          .style("pointer-events", "none")
          .text(
            node.label.length > 18
              ? node.label.substring(0, 15) + "..."
              : node.label,
          );

        // VPC 확장 아이콘
        if (
          node.type === NodeType.VPC &&
          node.children &&
          node.children.length > 0
        ) {
          const isExpanded = expandedVpcs.has(node.id);
          nodeGroup
            .append("text")
            .attr("x", size.width - 15)
            .attr("y", size.height / 2)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "14px")
            .style("fill", colors.stroke)
            .style("pointer-events", "none")
            .text(isExpanded ? "−" : "+");
        }

        // 서브넷 개수 표시 (접힌 VPC)
        if (
          node.type === NodeType.VPC &&
          !expandedVpcs.has(node.id) &&
          node.children &&
          node.children.length > 0
        ) {
          nodeGroup
            .append("text")
            .attr("x", size.width / 2)
            .attr("y", size.height + 12)
            .attr("text-anchor", "middle")
            .style("font-size", "9px")
            .style("fill", "#666")
            .style("pointer-events", "none")
            .text(`(${node.children.length} subnets)`);
        }

        // 이벤트 핸들러
        nodeGroup
          .on("click", (event) => {
            event.stopPropagation();
            if (node.type === NodeType.VPC) {
              handleVpcClick(node.id);
            } else if (node.type === NodeType.SUBNET) {
              handleSubnetClick(node.id);
            }
            onNodeClick?.({
              id: node.id,
              type: node.type,
              label: node.label,
              metadata: node.metadata,
            });
          })
          .on("mouseenter", () => {
            handleNodeHover({
              id: node.id,
              type: node.type,
              label: node.label,
              metadata: node.metadata,
            });
          })
          .on("mouseleave", () => {
            handleNodeHover(null);
          });
      };

      // 모든 노드 렌더링
      treeData.forEach((account) => {
        renderNode(account);
        (account.children || []).forEach((region) => {
          renderNode(region);
          (region.children || []).forEach((vpc) => {
            renderNode(vpc);
            if (expandedVpcs.has(vpc.id)) {
              (vpc.children || []).forEach((subnet) => {
                renderNode(subnet);
              });
            }
          });
        });
      });

      // 초기 뷰 설정
      const initialTransform = d3.zoomIdentity.translate(50, 50).scale(0.8);
      svg.call(zoom.transform, initialTransform);
    } catch (error) {
      console.error("트리 토폴로지 렌더링 오류:", error);
      onError?.(error instanceof Error ? error : new Error("렌더링 실패"));
    }
  }, [
    treeData,
    connections,
    dimensions,
    expandedVpcs,
    selectedSubnet,
    hoveredNode,
    subnetConnections,
    handleVpcClick,
    handleSubnetClick,
    handleNodeHover,
    onNodeClick,
    onError,
    getConnectedNodesAtLevel,
    getVpcFromNode,
  ]);

  // 줌 컨트롤
  const handleZoomIn = useCallback(() => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .call(zoomBehaviorRef.current.scaleBy, 1.3);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .call(zoomBehaviorRef.current.scaleBy, 0.7);
    }
  }, []);

  const handleReset = useCallback(() => {
    if (svgRef.current && zoomBehaviorRef.current) {
      const initialTransform = d3.zoomIdentity.translate(50, 50).scale(0.8);
      d3.select(svgRef.current)
        .transition()
        .call(zoomBehaviorRef.current.transform, initialTransform);
    }
    setExpandedVpcs(new Set());
    setSelectedSubnet(null);
    setHoveredNode(null);
  }, []);

  const handleFitView = useCallback(() => {
    if (svgRef.current && zoomBehaviorRef.current) {
      const svg = d3.select(svgRef.current);
      const g = svg.select(".main-group");
      const bounds = (g.node() as SVGGElement)?.getBBox();

      if (bounds) {
        const { width, height } = dimensions;
        const scale = Math.min(
          (width - 100) / bounds.width,
          (height - 100) / bounds.height,
          1,
        );
        const tx = (width - bounds.width * scale) / 2 - bounds.x * scale;
        const ty = (height - bounds.height * scale) / 2 - bounds.y * scale;

        svg
          .transition()
          .duration(500)
          .call(
            zoomBehaviorRef.current.transform,
            d3.zoomIdentity.translate(tx, ty).scale(scale),
          );
      }
    }
  }, [dimensions]);

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
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 rounded-lg p-3 shadow-sm border">
        <div className="text-xs font-medium mb-2">범례</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-3 rounded"
              style={{
                backgroundColor: NODE_COLORS[NodeType.ACCOUNT].fill,
                border: `1px solid ${NODE_COLORS[NodeType.ACCOUNT].stroke}`,
              }}
            />
            <span>계정</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-3 rounded"
              style={{
                backgroundColor: NODE_COLORS[NodeType.REGION].fill,
                border: `1px solid ${NODE_COLORS[NodeType.REGION].stroke}`,
              }}
            />
            <span>리전</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-3 rounded"
              style={{
                backgroundColor: NODE_COLORS[NodeType.VPC].fill,
                border: `1px solid ${NODE_COLORS[NodeType.VPC].stroke}`,
              }}
            />
            <span>VPC</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-3 rounded"
              style={{
                backgroundColor: NODE_COLORS[NodeType.SUBNET].fill,
                border: `1px solid ${NODE_COLORS[NodeType.SUBNET].stroke}`,
              }}
            />
            <span>서브넷</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-3 rounded"
              style={{ backgroundColor: HIGHLIGHT_COLOR }}
            />
            <span>연결된 노드 (호버/선택)</span>
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          <p>• VPC 클릭: 서브넷 펼침/접힘</p>
          <p>• 서브넷 클릭: 연결된 서브넷 표시</p>
          <p>• 노드 호버: 연결 하이라이트</p>
        </div>
      </div>

      {/* 선택된 서브넷 정보 */}
      {selectedSubnet && (
        <div className="absolute top-4 left-4 z-10 bg-white/90 rounded-lg p-3 shadow-sm border max-w-xs">
          <div className="text-sm font-medium mb-1">선택된 서브넷</div>
          <div className="text-xs text-muted-foreground">{selectedSubnet}</div>
          <div className="text-xs mt-1">
            연결된 서브넷: {subnetConnections.get(selectedSubnet)?.size || 0}개
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

      <svg ref={svgRef} className="w-full h-full bg-gray-50" />
    </div>
  );
}

export default TreeTopologyVisualization;
