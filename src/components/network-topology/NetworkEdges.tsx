/**
 * 네트워크 연결 엣지 렌더링 컴포넌트
 * 다양한 연결 타입에 따른 시각적 표현을 제공합니다.
 */

import * as d3 from "d3";
import type { EdgeData } from "@/types/network-topology";
import { ConnectionType } from "@/types/network-topology";

export interface EdgeRenderOptions {
  showArrows: boolean;
  showLabels: boolean;
  animateFlow: boolean;
  highlightActive: boolean;
}

export class NetworkEdgeRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private edgeGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private options: EdgeRenderOptions;

  constructor(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    options: EdgeRenderOptions = {
      showArrows: true,
      showLabels: false,
      animateFlow: true,
      highlightActive: true,
    },
  ) {
    this.svg = svg;
    this.options = options;
    this.edgeGroup = svg.select(".edges-group").empty()
      ? svg.append("g").attr("class", "edges-group")
      : svg.select(".edges-group");

    this.setupMarkers();
  }

  /**
   * 화살표 마커 설정
   */
  private setupMarkers() {
    const defs = this.svg.select("defs").empty()
      ? this.svg.append("defs")
      : this.svg.select("defs");

    // 기본 화살표 마커
    const arrowMarker = defs
      .selectAll(".arrow-marker")
      .data([
        { id: "arrow-default", color: "#666" },
        { id: "arrow-vpc-peering", color: "#8b5cf6" },
        { id: "arrow-cloudwan", color: "#10b981" },
        { id: "arrow-gateway", color: "#f59e0b" },
        { id: "arrow-route", color: "#6b7280" },
        { id: "arrow-transit", color: "#ef4444" },
        { id: "arrow-highlighted", color: "#00bcd4" },
      ])
      .enter()
      .append("marker")
      .attr("class", "arrow-marker")
      .attr("id", (d) => d.id)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 15)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto");

    arrowMarker
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", (d) => d.color);

    // 플로우 애니메이션용 원형 마커
    if (this.options.animateFlow) {
      const flowMarker = defs
        .selectAll(".flow-marker")
        .data(["flow-active", "flow-inactive"])
        .enter()
        .append("marker")
        .attr("class", "flow-marker")
        .attr("id", (d) => d)
        .attr("viewBox", "0 0 10 10")
        .attr("refX", 5)
        .attr("refY", 5)
        .attr("markerWidth", 4)
        .attr("markerHeight", 4);

      flowMarker
        .append("circle")
        .attr("cx", 5)
        .attr("cy", 5)
        .attr("r", 3)
        .attr("fill", (d) => (d === "flow-active" ? "#00bcd4" : "#ccc"));
    }
  }

  /**
   * 엣지 렌더링
   */
  renderEdges(
    edges: EdgeData[],
    nodePositions: Map<string, { x: number; y: number }>,
  ) {
    const edgeSelection = this.edgeGroup
      .selectAll(".edge")
      .data(edges, (d: any) => d.id);

    // 새로운 엣지 추가
    const edgeEnter = edgeSelection.enter().append("g").attr("class", "edge");

    // 메인 연결선
    edgeEnter
      .append("path")
      .attr("class", "edge-path")
      .attr("fill", "none")
      .attr("stroke-width", 2)
      .attr("opacity", 0.7);

    // 라벨 (옵션)
    if (this.options.showLabels) {
      edgeEnter
        .append("text")
        .attr("class", "edge-label")
        .attr("text-anchor", "middle")
        .attr("dy", -5)
        .style("font-size", "10px")
        .style("fill", "#666")
        .style("pointer-events", "none");
    }

    // 플로우 애니메이션 (옵션)
    if (this.options.animateFlow) {
      edgeEnter
        .append("circle")
        .attr("class", "flow-indicator")
        .attr("r", 3)
        .attr("fill", "#00bcd4")
        .attr("opacity", 0);
    }

    // 업데이트
    const edgeUpdate = edgeEnter.merge(edgeSelection as any);

    // 경로 업데이트
    edgeUpdate
      .select(".edge-path")
      .attr("d", (d) => this.getEdgePath(d, nodePositions))
      .attr("stroke", (d) => this.getEdgeColor(d.type))
      .attr("stroke-width", (d) => this.getEdgeWidth(d))
      .attr("stroke-dasharray", (d) => this.getEdgeDashArray(d.type))
      .attr("marker-end", (d) =>
        this.options.showArrows
          ? `url(#${this.getArrowMarkerId(d.type)})`
          : null,
      );

    // 라벨 업데이트
    if (this.options.showLabels) {
      edgeUpdate
        .select(".edge-label")
        .attr("transform", (d) => {
          const sourcePos = nodePositions.get(d.source);
          const targetPos = nodePositions.get(d.target);
          if (sourcePos && targetPos) {
            const midX = (sourcePos.x + targetPos.x) / 2;
            const midY = (sourcePos.y + targetPos.y) / 2;
            return `translate(${midX}, ${midY})`;
          }
          return "translate(0, 0)";
        })
        .text((d) => this.getEdgeLabel(d));
    }

    // 플로우 애니메이션
    if (this.options.animateFlow) {
      this.animateFlow(edgeUpdate, nodePositions);
    }

    // 제거
    edgeSelection.exit().remove();

    return edgeUpdate;
  }

  /**
   * 엣지 경로 생성
   */
  private getEdgePath(
    edge: EdgeData,
    nodePositions: Map<string, { x: number; y: number }>,
  ): string {
    const sourcePos = nodePositions.get(edge.source);
    const targetPos = nodePositions.get(edge.target);

    if (!sourcePos || !targetPos) {
      return "";
    }

    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 연결 타입에 따른 경로 스타일
    switch (edge.type) {
      case ConnectionType.VPC_PEERING:
        // 곡선 경로 (VPC 피어링)
        const midX = (sourcePos.x + targetPos.x) / 2;
        const midY = (sourcePos.y + targetPos.y) / 2;
        const offset = Math.min(50, distance * 0.2);
        const controlX = midX + (dy / distance) * offset;
        const controlY = midY - (dx / distance) * offset;
        return `M ${sourcePos.x} ${sourcePos.y} Q ${controlX} ${controlY} ${targetPos.x} ${targetPos.y}`;

      case ConnectionType.CLOUDWAN:
        // 부드러운 곡선 (CloudWAN)
        const cp1x = sourcePos.x + dx * 0.3;
        const cp1y = sourcePos.y;
        const cp2x = targetPos.x - dx * 0.3;
        const cp2y = targetPos.y;
        return `M ${sourcePos.x} ${sourcePos.y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${targetPos.x} ${targetPos.y}`;

      case ConnectionType.TRANSIT_GATEWAY:
        // 각진 경로 (Transit Gateway)
        const midPoint = distance / 2;
        const angle = Math.atan2(dy, dx);
        const perpAngle = angle + Math.PI / 2;
        const bendOffset = 20;
        const bendX =
          sourcePos.x +
          Math.cos(angle) * midPoint +
          Math.cos(perpAngle) * bendOffset;
        const bendY =
          sourcePos.y +
          Math.sin(angle) * midPoint +
          Math.sin(perpAngle) * bendOffset;
        return `M ${sourcePos.x} ${sourcePos.y} L ${bendX} ${bendY} L ${targetPos.x} ${targetPos.y}`;

      default:
        // 직선 경로
        return `M ${sourcePos.x} ${sourcePos.y} L ${targetPos.x} ${targetPos.y}`;
    }
  }

  /**
   * 엣지 색상 결정
   */
  private getEdgeColor(type: ConnectionType): string {
    switch (type) {
      case ConnectionType.VPC_PEERING:
        return "#8b5cf6";
      case ConnectionType.CLOUDWAN:
        return "#10b981";
      case ConnectionType.GATEWAY:
        return "#f59e0b";
      case ConnectionType.ROUTE:
        return "#6b7280";
      case ConnectionType.TRANSIT_GATEWAY:
        return "#ef4444";
      default:
        return "#9ca3af";
    }
  }

  /**
   * 엣지 두께 결정
   */
  private getEdgeWidth(edge: EdgeData): number {
    const bandwidth = edge.metadata.bandwidth || 1;
    const baseWidth = 2;

    // 대역폭에 따른 선 두께 조정
    if (bandwidth > 10000) return baseWidth + 3; // 10Gbps+
    if (bandwidth > 1000) return baseWidth + 2; // 1Gbps+
    if (bandwidth > 100) return baseWidth + 1; // 100Mbps+

    return baseWidth;
  }

  /**
   * 엣지 대시 패턴 결정
   */
  private getEdgeDashArray(type: ConnectionType): string | null {
    switch (type) {
      case ConnectionType.ROUTE:
        return "5,5"; // 점선
      case ConnectionType.GATEWAY:
        return "10,5"; // 긴 대시
      default:
        return null; // 실선
    }
  }

  /**
   * 화살표 마커 ID 결정
   */
  private getArrowMarkerId(type: ConnectionType): string {
    switch (type) {
      case ConnectionType.VPC_PEERING:
        return "arrow-vpc-peering";
      case ConnectionType.CLOUDWAN:
        return "arrow-cloudwan";
      case ConnectionType.GATEWAY:
        return "arrow-gateway";
      case ConnectionType.ROUTE:
        return "arrow-route";
      case ConnectionType.TRANSIT_GATEWAY:
        return "arrow-transit";
      default:
        return "arrow-default";
    }
  }

  /**
   * 엣지 라벨 생성
   */
  private getEdgeLabel(edge: EdgeData): string {
    if (edge.metadata.bandwidth) {
      const bandwidth = edge.metadata.bandwidth;
      if (bandwidth >= 1000) {
        return `${(bandwidth / 1000).toFixed(1)}Gbps`;
      }
      return `${bandwidth}Mbps`;
    }

    return edge.type.replace("_", " ");
  }

  /**
   * 플로우 애니메이션
   */
  private animateFlow(
    edgeSelection: d3.Selection<d3.BaseType, EdgeData, d3.BaseType, unknown>,
    nodePositions: Map<string, { x: number; y: number }>,
  ) {
    edgeSelection.each(function (d) {
      const edge = d3.select(this);
      const path = edge.select(".edge-path").node() as SVGPathElement;
      const flowIndicator = edge.select(".flow-indicator");

      if (!path || flowIndicator.empty()) return;

      const pathLength = path.getTotalLength();
      const isActive =
        d.metadata.state === "active" || d.metadata.state === "available";

      if (isActive && d.metadata.showFlow !== false) {
        // 활성 연결의 플로우 애니메이션
        flowIndicator
          .attr("opacity", 0.8)
          .transition()
          .duration(3000)
          .ease(d3.easeLinear)
          .attrTween("transform", () => {
            return (t: number) => {
              const point = path.getPointAtLength(t * pathLength);
              return `translate(${point.x}, ${point.y})`;
            };
          })
          .on("end", function () {
            // 애니메이션 반복
            d3.select(this)
              .transition()
              .duration(0)
              .attr("opacity", 0)
              .transition()
              .delay(500)
              .attr("opacity", 0.8);
          });
      } else {
        // 비활성 연결
        flowIndicator.attr("opacity", 0);
      }
    });
  }

  /**
   * 엣지 하이라이트
   */
  highlightEdges(edgeIds: string[]) {
    this.edgeGroup
      .selectAll(".edge")
      .classed("highlighted", false)
      .style("opacity", 0.3);

    this.edgeGroup
      .selectAll(".edge")
      .filter((d: any) => edgeIds.includes(d.id))
      .classed("highlighted", true)
      .style("opacity", 1)
      .select(".edge-path")
      .attr("stroke", "#00bcd4")
      .attr("stroke-width", 4)
      .attr("marker-end", "url(#arrow-highlighted)");
  }

  /**
   * 하이라이트 제거
   */
  clearHighlights() {
    this.edgeGroup
      .selectAll(".edge")
      .classed("highlighted", false)
      .style("opacity", 0.7)
      .select(".edge-path")
      .attr("stroke", (d: any) => this.getEdgeColor(d.type))
      .attr("stroke-width", (d: any) => this.getEdgeWidth(d))
      .attr("marker-end", (d: any) =>
        this.options.showArrows
          ? `url(#${this.getArrowMarkerId(d.type)})`
          : null,
      );
  }

  /**
   * 옵션 업데이트
   */
  updateOptions(options: Partial<EdgeRenderOptions>) {
    this.options = { ...this.options, ...options };
  }
}
