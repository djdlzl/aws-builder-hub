/**
 * 인터랙티브 하이라이트 시스템
 * 마우스 호버 시 연결된 네트워크 경로를 강조 표시합니다.
 */

import * as d3 from "d3";
import type { NodeData, EdgeData } from "@/types/network-topology";
import { NodeType } from "@/types/network-topology";

export interface HighlightOptions {
  highlightColor: string;
  fadeOpacity: number;
  highlightOpacity: number;
  animationDuration: number;
  showTooltip: boolean;
  highlightConnectedPaths: boolean;
}

export interface HighlightState {
  hoveredNode: NodeData | null;
  highlightedNodes: Set<string>;
  highlightedEdges: Set<string>;
  isHighlighting: boolean;
}

export class InteractiveHighlightSystem {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private options: HighlightOptions;
  private state: HighlightState;
  private nodeMap: Map<string, NodeData>;
  private edgeMap: Map<string, EdgeData>;
  private adjacencyList: Map<string, Set<string>>;
  private tooltip: d3.Selection<
    HTMLDivElement,
    unknown,
    null,
    undefined
  > | null;

  constructor(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    options: Partial<HighlightOptions> = {},
  ) {
    this.svg = svg;
    this.options = {
      highlightColor: "#00bcd4",
      fadeOpacity: 0.2,
      highlightOpacity: 1.0,
      animationDuration: 200,
      showTooltip: true,
      highlightConnectedPaths: true,
      ...options,
    };

    this.state = {
      hoveredNode: null,
      highlightedNodes: new Set(),
      highlightedEdges: new Set(),
      isHighlighting: false,
    };

    this.nodeMap = new Map();
    this.edgeMap = new Map();
    this.adjacencyList = new Map();
    this.tooltip = null;

    this.setupTooltip();
  }

  /**
   * 툴팁 설정
   */
  private setupTooltip() {
    if (!this.options.showTooltip) return;

    // 기존 툴팁 제거
    d3.select("body").selectAll(".network-tooltip").remove();

    this.tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "network-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "rgba(0, 0, 0, 0.9)")
      .style("color", "white")
      .style("padding", "8px 12px")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("font-family", "system-ui, sans-serif")
      .style("box-shadow", "0 4px 12px rgba(0, 0, 0, 0.3)")
      .style("pointer-events", "none")
      .style("z-index", "1000")
      .style("max-width", "300px")
      .style("word-wrap", "break-word");
  }

  /**
   * 데이터 업데이트
   */
  updateData(nodes: NodeData[], edges: EdgeData[]) {
    // 노드 맵 업데이트
    this.nodeMap.clear();
    nodes.forEach((node) => {
      this.nodeMap.set(node.id, node);
    });

    // 엣지 맵 업데이트
    this.edgeMap.clear();
    edges.forEach((edge) => {
      this.edgeMap.set(edge.id, edge);
    });

    // 인접 리스트 구성
    this.buildAdjacencyList(edges);
  }

  /**
   * 인접 리스트 구성
   */
  private buildAdjacencyList(edges: EdgeData[]) {
    this.adjacencyList.clear();

    // 모든 노드 초기화
    this.nodeMap.forEach((_, nodeId) => {
      this.adjacencyList.set(nodeId, new Set());
    });

    // 엣지 기반으로 인접 관계 구성
    edges.forEach((edge) => {
      const sourceSet = this.adjacencyList.get(edge.source) || new Set();
      const targetSet = this.adjacencyList.get(edge.target) || new Set();

      sourceSet.add(edge.target);
      targetSet.add(edge.source);

      this.adjacencyList.set(edge.source, sourceSet);
      this.adjacencyList.set(edge.target, targetSet);
    });
  }

  /**
   * 노드 호버 이벤트 설정
   */
  setupNodeInteractions() {
    const nodeGroups = this.svg.selectAll(".node-group, .gateway-node");

    nodeGroups
      .on("mouseenter", (event, d: any) => {
        this.handleNodeHover(d, event);
      })
      .on("mousemove", (event) => {
        this.updateTooltipPosition(event);
      })
      .on("mouseleave", () => {
        this.clearHighlight();
      });
  }

  /**
   * 노드 호버 처리
   */
  private handleNodeHover(node: NodeData, event: MouseEvent) {
    if (this.state.isHighlighting && this.state.hoveredNode?.id === node.id) {
      return; // 이미 같은 노드가 하이라이트되어 있음
    }

    this.state.hoveredNode = node;
    this.state.isHighlighting = true;

    // 연결된 노드와 엣지 찾기
    const connectedInfo = this.findConnectedElements(node);

    this.state.highlightedNodes = connectedInfo.nodes;
    this.state.highlightedEdges = connectedInfo.edges;

    // 하이라이트 적용
    this.applyHighlight();

    // 툴팁 표시
    if (this.tooltip) {
      this.showTooltip(node, event);
    }
  }

  /**
   * 연결된 요소 찾기
   */
  private findConnectedElements(node: NodeData): {
    nodes: Set<string>;
    edges: Set<string>;
  } {
    const connectedNodes = new Set<string>([node.id]);
    const connectedEdges = new Set<string>();

    if (!this.options.highlightConnectedPaths) {
      return { nodes: connectedNodes, edges: connectedEdges };
    }

    // IP 대역 기반 연결성 분석
    const nodeConnections = this.analyzeNodeConnections(node);

    // 직접 연결된 노드들
    const directlyConnected = this.adjacencyList.get(node.id) || new Set();
    directlyConnected.forEach((nodeId) => {
      connectedNodes.add(nodeId);
    });

    // IP 대역 기반으로 연결된 노드들
    nodeConnections.forEach((nodeId) => {
      connectedNodes.add(nodeId);
    });

    // 연결된 엣지들 찾기
    this.edgeMap.forEach((edge, edgeId) => {
      const isSourceHighlighted = connectedNodes.has(edge.source);
      const isTargetHighlighted = connectedNodes.has(edge.target);

      if (isSourceHighlighted && isTargetHighlighted) {
        connectedEdges.add(edgeId);
      }
    });

    return { nodes: connectedNodes, edges: connectedEdges };
  }

  /**
   * 노드 연결성 분석 (IP 대역 기반)
   */
  private analyzeNodeConnections(node: NodeData): Set<string> {
    const connectedNodes = new Set<string>();

    // 노드의 IP 대역 정보 추출
    const nodeCidr = this.getNodeCidr(node);
    if (!nodeCidr) return connectedNodes;

    // 같은 VPC 내의 노드들
    if (node.type === NodeType.SUBNET) {
      const vpcId = node.metadata.vpcId || node.parent;
      if (vpcId) {
        this.nodeMap.forEach((otherNode, nodeId) => {
          if (
            otherNode.type === NodeType.SUBNET &&
            (otherNode.metadata.vpcId === vpcId || otherNode.parent === vpcId)
          ) {
            connectedNodes.add(nodeId);
          }
        });
      }
    }

    // VPC 레벨에서의 연결성
    if (node.type === NodeType.VPC) {
      this.nodeMap.forEach((otherNode, nodeId) => {
        if (
          otherNode.parent === node.id ||
          (otherNode.type === NodeType.SUBNET &&
            otherNode.metadata.vpcId === node.id)
        ) {
          connectedNodes.add(nodeId);
        }
      });
    }

    // 계층적 연결성 (부모-자식 관계)
    this.addHierarchicalConnections(node, connectedNodes);

    return connectedNodes;
  }

  /**
   * 계층적 연결성 추가
   */
  private addHierarchicalConnections(
    node: NodeData,
    connectedNodes: Set<string>,
  ) {
    // 부모 노드 추가
    if (node.parent) {
      connectedNodes.add(node.parent);
    }

    // 자식 노드들 추가
    this.nodeMap.forEach((otherNode, nodeId) => {
      if (otherNode.parent === node.id) {
        connectedNodes.add(nodeId);
      }
    });

    // 같은 부모를 가진 형제 노드들 추가
    if (node.parent) {
      this.nodeMap.forEach((otherNode, nodeId) => {
        if (otherNode.parent === node.parent && nodeId !== node.id) {
          connectedNodes.add(nodeId);
        }
      });
    }
  }

  /**
   * 노드의 CIDR 블록 추출
   */
  private getNodeCidr(node: NodeData): string | null {
    return (
      node.metadata.cidrBlock ||
      node.metadata.cidr ||
      node.metadata.ipRange ||
      null
    );
  }

  /**
   * 하이라이트 적용
   */
  private applyHighlight() {
    const { fadeOpacity, highlightOpacity, animationDuration, highlightColor } =
      this.options;

    // 모든 노드 페이드 아웃
    this.svg
      .selectAll(".node-group, .gateway-node")
      .transition()
      .duration(animationDuration)
      .style("opacity", fadeOpacity);

    // 하이라이트된 노드들 강조
    this.svg
      .selectAll(".node-group, .gateway-node")
      .filter((d: any) => this.state.highlightedNodes.has(d.id))
      .transition()
      .duration(animationDuration)
      .style("opacity", highlightOpacity)
      .select("rect, circle, path")
      .style("stroke", highlightColor)
      .style("stroke-width", 3)
      .style("filter", "drop-shadow(0 0 8px rgba(0, 188, 212, 0.6))");

    // 모든 엣지 페이드 아웃
    this.svg
      .selectAll(".edge, .cross-connection")
      .transition()
      .duration(animationDuration)
      .style("opacity", fadeOpacity);

    // 하이라이트된 엣지들 강조
    this.svg
      .selectAll(".edge, .cross-connection")
      .filter((d: any) => this.state.highlightedEdges.has(d.id))
      .transition()
      .duration(animationDuration)
      .style("opacity", highlightOpacity)
      .select(".edge-path, .connection-path")
      .style("stroke", highlightColor)
      .style("stroke-width", 4)
      .style("filter", "drop-shadow(0 0 6px rgba(0, 188, 212, 0.8))");
  }

  /**
   * 하이라이트 제거
   */
  clearHighlight() {
    if (!this.state.isHighlighting) return;

    this.state.isHighlighting = false;
    this.state.hoveredNode = null;
    this.state.highlightedNodes.clear();
    this.state.highlightedEdges.clear();

    const { animationDuration } = this.options;

    // 모든 노드 원래 상태로 복원
    this.svg
      .selectAll(".node-group, .gateway-node")
      .transition()
      .duration(animationDuration)
      .style("opacity", 1)
      .select("rect, circle, path")
      .style("stroke", null)
      .style("stroke-width", null)
      .style("filter", null);

    // 모든 엣지 원래 상태로 복원
    this.svg
      .selectAll(".edge, .cross-connection")
      .transition()
      .duration(animationDuration)
      .style("opacity", null)
      .select(".edge-path, .connection-path")
      .style("stroke", null)
      .style("stroke-width", null)
      .style("filter", null);

    // 툴팁 숨기기
    if (this.tooltip) {
      this.tooltip.style("visibility", "hidden");
    }
  }

  /**
   * 툴팁 표시
   */
  private showTooltip(node: NodeData, event: MouseEvent) {
    if (!this.tooltip) return;

    const tooltipContent = this.generateTooltipContent(node);

    this.tooltip.html(tooltipContent).style("visibility", "visible");

    this.updateTooltipPosition(event);
  }

  /**
   * 툴팁 위치 업데이트
   */
  private updateTooltipPosition(event: MouseEvent) {
    if (!this.tooltip) return;

    const tooltipNode = this.tooltip.node() as HTMLElement;
    const tooltipRect = tooltipNode.getBoundingClientRect();

    let left = event.pageX + 10;
    let top = event.pageY - 10;

    // 화면 경계 체크
    if (left + tooltipRect.width > window.innerWidth) {
      left = event.pageX - tooltipRect.width - 10;
    }

    if (top + tooltipRect.height > window.innerHeight) {
      top = event.pageY - tooltipRect.height - 10;
    }

    this.tooltip.style("left", `${left}px`).style("top", `${top}px`);
  }

  /**
   * 툴팁 내용 생성
   */
  private generateTooltipContent(node: NodeData): string {
    const connectedCount = this.state.highlightedNodes.size - 1; // 자기 자신 제외
    const edgeCount = this.state.highlightedEdges.size;

    let content = `
      <div style="font-weight: bold; margin-bottom: 4px;">${node.label}</div>
      <div style="font-size: 11px; color: #ccc; margin-bottom: 6px;">${node.type}</div>
    `;

    // 주요 메타데이터 표시
    if (node.metadata.cidrBlock) {
      content += `<div style="font-size: 11px;">CIDR: ${node.metadata.cidrBlock}</div>`;
    }

    if (node.metadata.state) {
      const stateColor = this.getStateColor(node.metadata.state);
      content += `<div style="font-size: 11px;">상태: <span style="color: ${stateColor};">${node.metadata.state}</span></div>`;
    }

    // 연결 정보
    if (connectedCount > 0) {
      content += `
        <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #444;">
          <div style="font-size: 11px;">연결된 노드: ${connectedCount}개</div>
          <div style="font-size: 11px;">연결 경로: ${edgeCount}개</div>
        </div>
      `;
    }

    return content;
  }

  /**
   * 상태 색상 결정
   */
  private getStateColor(state: string): string {
    switch (state.toLowerCase()) {
      case "available":
      case "active":
      case "running":
        return "#10b981";
      case "pending":
        return "#f59e0b";
      case "stopping":
      case "deleting":
        return "#ef4444";
      default:
        return "#9ca3af";
    }
  }

  /**
   * 현재 하이라이트 상태 반환
   */
  getHighlightState(): HighlightState {
    return { ...this.state };
  }

  /**
   * 옵션 업데이트
   */
  updateOptions(options: Partial<HighlightOptions>) {
    this.options = { ...this.options, ...options };
  }

  /**
   * 정리
   */
  destroy() {
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }
}
