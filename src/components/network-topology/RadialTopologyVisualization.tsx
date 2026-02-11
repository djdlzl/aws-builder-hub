/**
 * 방사형 네트워크 토폴로지 시각화 컴포넌트
 * 계정이 중심에, 리전 → VPC → 서브넷이 바깥으로 퍼지는 방사형 레이아웃
 * - VPC 클릭 시 서브넷 펼침/접힘 (유지됨)
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

interface RadialTopologyVisualizationProps {
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
  displayName: string;
  metadata: Record<string, unknown>;
  children?: TreeNode[];
  parent?: TreeNode;
  x?: number;
  y?: number;
  angle?: number;
  radius?: number;
}

interface VpcConnection {
  sourceVpcId: string;
  targetVpcId: string;
  type: ConnectionType;
}

// 노드 레벨별 색상
const NODE_COLORS: Record<NodeType, { fill: string; stroke: string }> = {
  [NodeType.ACCOUNT]: { fill: "#e3f2fd", stroke: "#1976d2" },
  [NodeType.REGION]: { fill: "#f3e5f5", stroke: "#7b1fa2" },
  [NodeType.VPC]: { fill: "#e8f5e9", stroke: "#388e3c" },
  [NodeType.SUBNET]: { fill: "#fff3e0", stroke: "#f57c00" },
  [NodeType.IGW]: { fill: "#e0f7fa", stroke: "#0097a7" },
  [NodeType.NAT]: { fill: "#fce4ec", stroke: "#c2185b" },
};

// 노드 크기
const NODE_SIZES: Record<NodeType, { width: number; height: number }> = {
  [NodeType.ACCOUNT]: { width: 100, height: 36 },
  [NodeType.REGION]: { width: 90, height: 32 },
  [NodeType.VPC]: { width: 85, height: 30 },
  [NodeType.SUBNET]: { width: 80, height: 28 },
  [NodeType.IGW]: { width: 60, height: 24 },
  [NodeType.NAT]: { width: 60, height: 24 },
};

// 연결선 색상
const CONNECTION_COLORS: Record<ConnectionType, string> = {
  [ConnectionType.VPC_PEERING]: "#2196f3",
  [ConnectionType.CLOUDWAN]: "#9c27b0",
  [ConnectionType.GATEWAY]: "#4caf50",
  [ConnectionType.ROUTE]: "#ff9800",
  [ConnectionType.TRANSIT_GATEWAY]: "#e91e63",
};

const HIGHLIGHT_COLOR = "#00ff00";

// 레벨별 반경
const LEVEL_RADIUS = {
  [NodeType.ACCOUNT]: 0,
  [NodeType.REGION]: 150,
  [NodeType.VPC]: 300,
  [NodeType.SUBNET]: 450,
};

// 태그에서 Name 추출
function getTagName(metadata: Record<string, unknown>, fallbackId: string): string {
  const tags = metadata?.tags as Record<string, string> | undefined;
  if (tags?.Name) return tags.Name;
  if (tags?.name) return tags.name;
  if (typeof metadata?.name === "string") return metadata.name;
  if (typeof metadata?.Name === "string") return metadata.Name;
  if (fallbackId.startsWith("vpc-")) return fallbackId.substring(0, 12) + "...";
  if (fallbackId.startsWith("subnet-")) return fallbackId.substring(0, 15) + "...";
  return fallbackId.length > 15 ? fallbackId.substring(0, 12) + "..." : fallbackId;
}

export function RadialTopologyVisualization({
  data,
  onNodeClick,
  onNodeHover,
  className = "",
  onError,
}: RadialTopologyVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [expandedVpcs, setExpandedVpcs] = useState<Set<string>>(new Set());
  const [selectedSubnet, setSelectedSubnet] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // 데이터를 트리 구조로 변환
  const { treeData, vpcConnections, nodeMap, subnetConnections } = useMemo(() => {
    if (!data?.hierarchy?.accounts) {
      return { treeData: [], vpcConnections: [], nodeMap: new Map(), subnetConnections: new Map() };
    }

    const trees: TreeNode[] = [];
    const vpcConns: VpcConnection[] = [];
    const nodes = new Map<string, TreeNode>();
    const subnetConns = new Map<string, Set<string>>();

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
      nodes.set(accountId, accountNode);

      Object.entries(account.regions || {}).forEach(([regionName, region]) => {
        const regionId = `${accountId}-${regionName}`;
        const regionNode: TreeNode = {
          id: regionId,
          type: NodeType.REGION,
          label: regionName,
          displayName: regionName,
          metadata: { accountId, region: regionName },
          children: [],
          parent: accountNode,
        };
        nodes.set(regionId, regionNode);

        Object.entries(region.vpcs || {}).forEach(([vpcId, vpc]) => {
          const vpcRecord = vpc as unknown as Record<string, unknown>;
          const vpcMetadata = {
            accountId,
            region: regionName,
            vpcId,
            cidrBlock: vpc.cidrBlock,
            tags: vpcRecord.tags,
            name: vpcRecord.name,
          };
          const vpcNode: TreeNode = {
            id: vpcId,
            type: NodeType.VPC,
            label: vpcId,
            displayName: getTagName(vpcMetadata, vpcId),
            metadata: vpcMetadata,
            children: [],
            parent: regionNode,
          };
          nodes.set(vpcId, vpcNode);

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
              displayName: getTagName(subnetMetadata, subnetId),
              metadata: subnetMetadata,
              parent: vpcNode,
            };
            nodes.set(subnetId, subnetNode);
            vpcNode.children!.push(subnetNode);
          });

          regionNode.children!.push(vpcNode);
        });

        accountNode.children!.push(regionNode);
      });

      trees.push(accountNode);
    });

    // VPC 간 연결 정보 추출 (VPC Peering, CloudWAN)
    data.edges?.forEach((edge) => {
      if (edge.type === ConnectionType.VPC_PEERING || edge.type === ConnectionType.CLOUDWAN) {
        const sourceNode = nodes.get(edge.source);
        const targetNode = nodes.get(edge.target);
        
        if (sourceNode?.type === NodeType.VPC && targetNode?.type === NodeType.VPC) {
          vpcConns.push({
            sourceVpcId: edge.source,
            targetVpcId: edge.target,
            type: edge.type,
          });
          
          // VPC 연결 시 모든 서브넷간 연결 생성
          const sourceVpc = nodes.get(edge.source);
          const targetVpc = nodes.get(edge.target);
          sourceVpc?.children?.forEach(srcSubnet => {
            targetVpc?.children?.forEach(tgtSubnet => {
              if (!subnetConns.has(srcSubnet.id)) subnetConns.set(srcSubnet.id, new Set());
              if (!subnetConns.has(tgtSubnet.id)) subnetConns.set(tgtSubnet.id, new Set());
              subnetConns.get(srcSubnet.id)!.add(tgtSubnet.id);
              subnetConns.get(tgtSubnet.id)!.add(srcSubnet.id);
            });
          });
        }
      }
    });

    return { treeData: trees, vpcConnections: vpcConns, nodeMap: nodes, subnetConnections: subnetConns };
  }, [data]);

  // VPC ID에서 상위 정보 찾기
  const getVpcFromSubnet = useCallback((subnetId: string): string | null => {
    const node = nodeMap.get(subnetId);
    return node?.parent?.id || null;
  }, [nodeMap]);

  // 연결된 VPC 목록 가져오기
  const getConnectedVpcs = useCallback((vpcId: string): Set<string> => {
    const connected = new Set<string>();
    vpcConnections.forEach(conn => {
      if (conn.sourceVpcId === vpcId) connected.add(conn.targetVpcId);
      if (conn.targetVpcId === vpcId) connected.add(conn.sourceVpcId);
    });
    return connected;
  }, [vpcConnections]);

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
  const handleVpcClick = useCallback((vpcId: string, event: MouseEvent) => {
    event.stopPropagation();
    setExpandedVpcs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(vpcId)) {
        newSet.delete(vpcId);
      } else {
        newSet.add(vpcId);
      }
      return newSet;
    });
  }, []);

  // 서브넷 클릭 핸들러
  const handleSubnetClick = useCallback((subnetId: string, event: MouseEvent) => {
    event.stopPropagation();
    setSelectedSubnet(prev => prev === subnetId ? null : subnetId);
    
    // 연결된 서브넷의 VPC도 펼치기
    const connectedSubnets = subnetConnections.get(subnetId);
    if (connectedSubnets) {
      setExpandedVpcs(prev => {
        const newSet = new Set(prev);
        connectedSubnets.forEach(connSubnetId => {
          const vpcId = getVpcFromSubnet(connSubnetId);
          if (vpcId) newSet.add(vpcId);
        });
        return newSet;
      });
    }
  }, [subnetConnections, getVpcFromSubnet]);

  // 메인 렌더링 - hoveredNodeId 제외하여 호버 시 재렌더링 방지
  useEffect(() => {
    if (!svgRef.current || treeData.length === 0) return;

    try {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const { width, height } = dimensions;
      const centerX = width / 2;
      const centerY = height / 2;

      svg.attr("width", width).attr("height", height);

      // 줌 설정
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 3])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
        });

      zoomBehaviorRef.current = zoom;
      svg.call(zoom);

      const g = svg.append("g").attr("class", "main-group");

      // 마커 정의
      const defs = svg.append("defs");
      Object.entries(CONNECTION_COLORS).forEach(([type, color]) => {
        defs.append("marker")
          .attr("id", `arrow-${type}`)
          .attr("viewBox", "0 -5 10 10")
          .attr("refX", 8)
          .attr("refY", 0)
          .attr("markerWidth", 5)
          .attr("markerHeight", 5)
          .attr("orient", "auto")
          .append("path")
          .attr("d", "M0,-5L10,0L0,5")
          .attr("fill", color);
      });

      defs.append("marker")
        .attr("id", "arrow-highlight")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 8)
        .attr("refY", 0)
        .attr("markerWidth", 5)
        .attr("markerHeight", 5)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", HIGHLIGHT_COLOR);

      // 노드 위치 계산 (방사형)
      const nodePositions = new Map<string, { x: number; y: number }>();
      
      // 계정 수에 따른 각도 분배
      const accountCount = treeData.length;
      const accountAngleStep = (2 * Math.PI) / Math.max(accountCount, 1);

      treeData.forEach((account, accountIdx) => {
        const accountAngle = accountIdx * accountAngleStep - Math.PI / 2;
        
        // 계정 위치 (중앙)
        nodePositions.set(account.id, { x: centerX, y: centerY });

        const regions = account.children || [];
        const regionCount = regions.length;
        const regionAngleSpread = Math.PI / 3; // 각 계정당 리전이 차지하는 각도
        const regionStartAngle = accountAngle - regionAngleSpread / 2;

        regions.forEach((region, regionIdx) => {
          const regionAngle = regionCount > 1 
            ? regionStartAngle + (regionIdx / (regionCount - 1)) * regionAngleSpread
            : accountAngle;
          
          const regionX = centerX + Math.cos(regionAngle) * LEVEL_RADIUS[NodeType.REGION];
          const regionY = centerY + Math.sin(regionAngle) * LEVEL_RADIUS[NodeType.REGION];
          nodePositions.set(region.id, { x: regionX, y: regionY });

          const vpcs = region.children || [];
          const vpcCount = vpcs.length;
          const vpcAngleSpread = regionAngleSpread / Math.max(regionCount, 1);
          const vpcStartAngle = regionAngle - vpcAngleSpread / 2;

          vpcs.forEach((vpc, vpcIdx) => {
            const vpcAngle = vpcCount > 1
              ? vpcStartAngle + (vpcIdx / (vpcCount - 1)) * vpcAngleSpread
              : regionAngle;
            
            const vpcX = centerX + Math.cos(vpcAngle) * LEVEL_RADIUS[NodeType.VPC];
            const vpcY = centerY + Math.sin(vpcAngle) * LEVEL_RADIUS[NodeType.VPC];
            nodePositions.set(vpc.id, { x: vpcX, y: vpcY });

            // 서브넷 위치 (VPC가 펼쳐진 경우)
            if (expandedVpcs.has(vpc.id) && vpc.children) {
              const subnets = vpc.children;
              const subnetCount = subnets.length;
              const subnetAngleSpread = vpcAngleSpread / Math.max(vpcCount, 1);
              const subnetStartAngle = vpcAngle - subnetAngleSpread / 2;

              subnets.forEach((subnet, subnetIdx) => {
                const subnetAngle = subnetCount > 1
                  ? subnetStartAngle + (subnetIdx / (subnetCount - 1)) * subnetAngleSpread
                  : vpcAngle;
                
                const subnetX = centerX + Math.cos(subnetAngle) * LEVEL_RADIUS[NodeType.SUBNET];
                const subnetY = centerY + Math.sin(subnetAngle) * LEVEL_RADIUS[NodeType.SUBNET];
                nodePositions.set(subnet.id, { x: subnetX, y: subnetY });
              });
            }
          });
        });
      });

      // 트리 연결선 그리기
      const treeLinksGroup = g.append("g").attr("class", "tree-links");

      treeData.forEach(account => {
        const accountPos = nodePositions.get(account.id);
        if (!accountPos) return;

        (account.children || []).forEach(region => {
          const regionPos = nodePositions.get(region.id);
          if (!regionPos) return;

          // Account → Region
          treeLinksGroup.append("line")
            .attr("class", "tree-link")
            .attr("x1", accountPos.x)
            .attr("y1", accountPos.y)
            .attr("x2", regionPos.x)
            .attr("y2", regionPos.y)
            .attr("stroke", "#ccc")
            .attr("stroke-width", 1.5);

          (region.children || []).forEach(vpc => {
            const vpcPos = nodePositions.get(vpc.id);
            if (!vpcPos) return;

            // Region → VPC
            treeLinksGroup.append("line")
              .attr("class", "tree-link")
              .attr("x1", regionPos.x)
              .attr("y1", regionPos.y)
              .attr("x2", vpcPos.x)
              .attr("y2", vpcPos.y)
              .attr("stroke", "#ccc")
              .attr("stroke-width", 1.5);

            // VPC → Subnet
            if (expandedVpcs.has(vpc.id) && vpc.children) {
              vpc.children.forEach(subnet => {
                const subnetPos = nodePositions.get(subnet.id);
                if (!subnetPos) return;

                treeLinksGroup.append("line")
                  .attr("class", "tree-link")
                  .attr("x1", vpcPos.x)
                  .attr("y1", vpcPos.y)
                  .attr("x2", subnetPos.x)
                  .attr("y2", subnetPos.y)
                  .attr("stroke", "#ccc")
                  .attr("stroke-width", 1);
              });
            }
          });
        });
      });

      // VPC 피어링 연결선 그리기
      const peeringLinksGroup = g.append("g").attr("class", "peering-links");

      vpcConnections.forEach(conn => {
        const sourcePos = nodePositions.get(conn.sourceVpcId);
        const targetPos = nodePositions.get(conn.targetVpcId);
        if (!sourcePos || !targetPos) return;

        const color = CONNECTION_COLORS[conn.type] || "#999";
        
        // 곡선으로 연결
        const midX = (sourcePos.x + targetPos.x) / 2;
        const midY = (sourcePos.y + targetPos.y) / 2;
        const dx = targetPos.x - sourcePos.x;
        const dy = targetPos.y - sourcePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const offsetX = -dy / dist * 30;
        const offsetY = dx / dist * 30;

        peeringLinksGroup.append("path")
          .attr("class", `peering-link peering-${conn.sourceVpcId}-${conn.targetVpcId}`)
          .attr("d", `M${sourcePos.x},${sourcePos.y} Q${midX + offsetX},${midY + offsetY} ${targetPos.x},${targetPos.y}`)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "5,3")
          .attr("opacity", 0.6)
          .attr("marker-end", `url(#arrow-${conn.type})`);
      });

      // 노드 그리기
      const nodesGroup = g.append("g").attr("class", "nodes");

      const renderNode = (node: TreeNode) => {
        const pos = nodePositions.get(node.id);
        if (!pos) return;

        const size = NODE_SIZES[node.type];
        const colors = NODE_COLORS[node.type];

        const nodeGroup = nodesGroup.append("g")
          .attr("class", `node node-${node.id}`)
          .attr("data-node-id", node.id)
          .attr("data-node-type", node.type)
          .attr("transform", `translate(${pos.x - size.width / 2}, ${pos.y - size.height / 2})`)
          .style("cursor", node.type === NodeType.VPC || node.type === NodeType.SUBNET ? "pointer" : "default");

        // 노드 배경
        nodeGroup.append("rect")
          .attr("class", "node-bg")
          .attr("width", size.width)
          .attr("height", size.height)
          .attr("rx", 4)
          .attr("ry", 4)
          .attr("fill", colors.fill)
          .attr("stroke", colors.stroke)
          .attr("stroke-width", 2);

        // 노드 라벨
        nodeGroup.append("text")
          .attr("class", "node-label")
          .attr("x", size.width / 2)
          .attr("y", size.height / 2)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .style("font-size", "9px")
          .style("fill", "#333")
          .style("pointer-events", "none")
          .text(node.displayName);

        // VPC 펼침/접힘 아이콘
        if (node.type === NodeType.VPC && node.children && node.children.length > 0) {
          const isExpanded = expandedVpcs.has(node.id);
          nodeGroup.append("text")
            .attr("x", size.width - 10)
            .attr("y", size.height / 2)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "12px")
            .style("font-weight", "bold")
            .style("fill", colors.stroke)
            .style("pointer-events", "none")
            .text(isExpanded ? "−" : "+");

          // 서브넷 개수 표시
          if (!isExpanded) {
            nodeGroup.append("text")
              .attr("x", size.width / 2)
              .attr("y", size.height + 10)
              .attr("text-anchor", "middle")
              .style("font-size", "8px")
              .style("fill", "#666")
              .style("pointer-events", "none")
              .text(`(${node.children.length})`);
          }
        }

        // 이벤트 핸들러
        nodeGroup
          .on("click", (event: MouseEvent) => {
            if (node.type === NodeType.VPC) {
              handleVpcClick(node.id, event);
            } else if (node.type === NodeType.SUBNET) {
              handleSubnetClick(node.id, event);
            }
            onNodeClick?.({
              id: node.id,
              type: node.type,
              label: node.label,
              metadata: node.metadata,
            });
          })
          .on("mouseenter", () => {
            setHoveredNodeId(node.id);
            onNodeHover?.({
              id: node.id,
              type: node.type,
              label: node.label,
              metadata: node.metadata,
            });
          })
          .on("mouseleave", () => {
            setHoveredNodeId(null);
            onNodeHover?.(null);
          });
      };

      // 모든 노드 렌더링
      treeData.forEach(account => {
        renderNode(account);
        (account.children || []).forEach(region => {
          renderNode(region);
          (region.children || []).forEach(vpc => {
            renderNode(vpc);
            if (expandedVpcs.has(vpc.id)) {
              (vpc.children || []).forEach(subnet => {
                renderNode(subnet);
              });
            }
          });
        });
      });

      // 초기 뷰 설정 (최초 한번만)
      if (!isInitializedRef.current) {
        const initialTransform = d3.zoomIdentity.translate(0, 0).scale(0.9);
        svg.call(zoom.transform, initialTransform);
        isInitializedRef.current = true;
      }

    } catch (error) {
      console.error("방사형 토폴로지 렌더링 오류:", error);
      onError?.(error instanceof Error ? error : new Error("렌더링 실패"));
    }
  }, [treeData, vpcConnections, dimensions, expandedVpcs, handleVpcClick, handleSubnetClick, onNodeClick, onNodeHover, onError]);

  // 호버 하이라이트 업데이트 (별도 useEffect로 분리하여 재렌더링 방지)
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const nodesGroup = svg.select(".nodes");
    const peeringLinksGroup = svg.select(".peering-links");

    // 모든 노드 초기화
    nodesGroup.selectAll(".node").each(function() {
      const nodeEl = d3.select(this);
      const nodeId = nodeEl.attr("data-node-id");
      const nodeType = nodeEl.attr("data-node-type");
      const node = nodeMap.get(nodeId);
      if (!node) return;

      const colors = NODE_COLORS[node.type];
      const isSelected = selectedSubnet === nodeId;
      const isConnectedSubnet = selectedSubnet && subnetConnections.get(selectedSubnet)?.has(nodeId);

      // 호버된 노드인지 확인
      const isHovered = hoveredNodeId === nodeId;
      
      // 연결된 VPC인지 확인
      let isConnectedVpc = false;
      if (hoveredNodeId && nodeType === String(NodeType.VPC)) {
        const hoveredNode = nodeMap.get(hoveredNodeId);
        if (hoveredNode?.type === NodeType.VPC) {
          isConnectedVpc = getConnectedVpcs(hoveredNodeId).has(nodeId);
        }
      }

      const shouldHighlight = isHovered || isConnectedVpc || isSelected || isConnectedSubnet;

      nodeEl.select(".node-bg")
        .attr("fill", shouldHighlight ? HIGHLIGHT_COLOR : colors.fill)
        .attr("stroke", shouldHighlight ? HIGHLIGHT_COLOR : colors.stroke)
        .attr("stroke-width", shouldHighlight ? 3 : 2)
        .attr("filter", shouldHighlight ? "drop-shadow(0 0 6px rgba(0, 255, 0, 0.8))" : "none");

      nodeEl.select(".node-label")
        .style("fill", shouldHighlight ? "#000" : "#333")
        .style("font-weight", shouldHighlight ? "bold" : "normal");
    });

    // 피어링 연결선 하이라이트
    peeringLinksGroup.selectAll(".peering-link").each(function() {
      const linkEl = d3.select(this);
      const linkClass = linkEl.attr("class");
      
      let shouldHighlight = false;
      if (hoveredNodeId) {
        const hoveredNode = nodeMap.get(hoveredNodeId);
        if (hoveredNode?.type === NodeType.VPC) {
          shouldHighlight = linkClass.includes(hoveredNodeId);
        }
      }

      if (shouldHighlight) {
        linkEl
          .attr("stroke", HIGHLIGHT_COLOR)
          .attr("stroke-width", 4)
          .attr("opacity", 1)
          .attr("stroke-dasharray", "none")
          .attr("marker-end", "url(#arrow-highlight)");
      } else {
        // 원래 색상 복원
        const match = linkClass.match(/peering-link peering-(\S+)-(\S+)/);
        if (match) {
          const sourceVpcId = match[1];
          const conn = vpcConnections.find(c => c.sourceVpcId === sourceVpcId || c.targetVpcId === sourceVpcId);
          const color = conn ? CONNECTION_COLORS[conn.type] : "#999";
          linkEl
            .attr("stroke", color)
            .attr("stroke-width", 2)
            .attr("opacity", 0.6)
            .attr("stroke-dasharray", "5,3")
            .attr("marker-end", conn ? `url(#arrow-${conn.type})` : "none");
        }
      }
    });

  }, [hoveredNodeId, selectedSubnet, nodeMap, subnetConnections, vpcConnections, getConnectedVpcs]);

  // 줌 컨트롤
  const handleZoomIn = useCallback(() => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().call(zoomBehaviorRef.current.scaleBy, 1.3);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().call(zoomBehaviorRef.current.scaleBy, 0.7);
    }
  }, []);

  const handleFitView = useCallback(() => {
    if (svgRef.current && zoomBehaviorRef.current) {
      const svg = d3.select(svgRef.current);
      const g = svg.select(".main-group");
      const bounds = (g.node() as SVGGElement)?.getBBox();

      if (bounds) {
        const { width, height } = dimensions;
        const scale = Math.min((width - 100) / bounds.width, (height - 100) / bounds.height, 1);
        const tx = (width - bounds.width * scale) / 2 - bounds.x * scale;
        const ty = (height - bounds.height * scale) / 2 - bounds.y * scale;

        svg.transition().duration(500).call(
          zoomBehaviorRef.current.transform,
          d3.zoomIdentity.translate(tx, ty).scale(scale)
        );
      }
    }
  }, [dimensions]);

  const handleReset = useCallback(() => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().call(
        zoomBehaviorRef.current.transform,
        d3.zoomIdentity.scale(0.9)
      );
    }
    setExpandedVpcs(new Set());
    setSelectedSubnet(null);
    setHoveredNodeId(null);
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      {/* 컨트롤 버튼 */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button variant="outline" size="icon" onClick={handleZoomIn} title="확대">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleZoomOut} title="축소">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleFitView} title="화면에 맞춤">
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleReset} title="초기화">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* 범례 */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 rounded-lg p-3 shadow-sm border text-xs">
        <div className="font-medium mb-2">범례</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {[NodeType.ACCOUNT, NodeType.REGION, NodeType.VPC, NodeType.SUBNET].map(type => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="w-4 h-3 rounded"
                style={{
                  backgroundColor: NODE_COLORS[type].fill,
                  border: `1px solid ${NODE_COLORS[type].stroke}`,
                }}
              />
              <span>{type === NodeType.ACCOUNT ? "계정" : type === NodeType.REGION ? "리전" : type === NodeType.VPC ? "VPC" : "서브넷"}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded" style={{ backgroundColor: HIGHLIGHT_COLOR }} />
            <span>연결/호버</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t text-muted-foreground">
          <p>• VPC 클릭: 서브넷 펼침</p>
          <p>• 노드 호버: 연결 하이라이트</p>
        </div>
      </div>

      {/* 선택된 서브넷 정보 */}
      {selectedSubnet && (
        <div className="absolute top-4 left-4 z-10 bg-white/90 rounded-lg p-3 shadow-sm border max-w-xs">
          <div className="text-sm font-medium mb-1">선택된 서브넷</div>
          <div className="text-xs text-muted-foreground break-all">{selectedSubnet}</div>
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

export default RadialTopologyVisualization;
