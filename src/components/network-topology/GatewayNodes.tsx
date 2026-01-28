/**
 * 게이트웨이 노드 특별 렌더링 컴포넌트
 * IGW, NAT Gateway 등의 특별한 시각적 표현을 제공합니다.
 */

import * as d3 from "d3";
import type { NodeData } from "@/types/network-topology";
import { NodeType } from "@/types/network-topology";

export interface GatewayRenderOptions {
  showStatus: boolean;
  showThroughput: boolean;
  animateActivity: boolean;
  showConnections: boolean;
}

export class GatewayNodeRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private gatewayGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private options: GatewayRenderOptions;

  constructor(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    options: GatewayRenderOptions = {
      showStatus: true,
      showThroughput: true,
      animateActivity: true,
      showConnections: true,
    },
  ) {
    this.svg = svg;
    this.options = options;
    this.gatewayGroup = svg.select(".gateways-group").empty()
      ? svg.append("g").attr("class", "gateways-group")
      : svg.select(".gateways-group");

    this.setupPatterns();
  }

  /**
   * 패턴 및 그라디언트 설정
   */
  private setupPatterns() {
    const defs = this.svg.select("defs").empty()
      ? this.svg.append("defs")
      : this.svg.select("defs");

    // IGW 그라디언트
    const igwGradient = defs
      .selectAll("#igw-gradient")
      .data([1])
      .enter()
      .append("linearGradient")
      .attr("id", "igw-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "100%");

    igwGradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#ef4444")
      .attr("stop-opacity", 0.8);

    igwGradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#dc2626")
      .attr("stop-opacity", 1);

    // NAT Gateway 그라디언트
    const natGradient = defs
      .selectAll("#nat-gradient")
      .data([1])
      .enter()
      .append("linearGradient")
      .attr("id", "nat-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "100%");

    natGradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#06b6d4")
      .attr("stop-opacity", 0.8);

    natGradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#0891b2")
      .attr("stop-opacity", 1);

    // 활동 표시용 펄스 필터
    if (this.options.animateActivity) {
      const pulseFilter = defs
        .selectAll("#pulse-filter")
        .data([1])
        .enter()
        .append("filter")
        .attr("id", "pulse-filter")
        .attr("x", "-50%")
        .attr("y", "-50%")
        .attr("width", "200%")
        .attr("height", "200%");

      pulseFilter
        .append("feGaussianBlur")
        .attr("stdDeviation", "3")
        .attr("result", "coloredBlur");

      const feMerge = pulseFilter.append("feMerge");
      feMerge.append("feMergeNode").attr("in", "coloredBlur");
      feMerge.append("feMergeNode").attr("in", "SourceGraphic");
    }
  }

  /**
   * 게이트웨이 노드 렌더링
   */
  renderGatewayNodes(nodes: NodeData[]) {
    const gatewayNodes = nodes.filter(
      (node) => node.type === NodeType.IGW || node.type === NodeType.NAT,
    );

    const nodeSelection = this.gatewayGroup
      .selectAll(".gateway-node")
      .data(gatewayNodes, (d: any) => d.id);

    // 새로운 노드 추가
    const nodeEnter = nodeSelection
      .enter()
      .append("g")
      .attr("class", "gateway-node")
      .style("cursor", "pointer");

    // IGW 노드 렌더링
    this.renderIGWNodes(nodeEnter.filter((d) => d.type === NodeType.IGW));

    // NAT Gateway 노드 렌더링
    this.renderNATNodes(nodeEnter.filter((d) => d.type === NodeType.NAT));

    // 공통 요소 추가
    this.addCommonElements(nodeEnter);

    // 업데이트
    const nodeUpdate = nodeEnter.merge(nodeSelection as any);

    // 위치 업데이트
    nodeUpdate.attr(
      "transform",
      (d) => `translate(${d.position?.x || 0}, ${d.position?.y || 0})`,
    );

    // 상태 업데이트
    this.updateNodeStatus(nodeUpdate);

    // 제거
    nodeSelection.exit().remove();

    return nodeUpdate;
  }

  /**
   * IGW 노드 렌더링
   */
  private renderIGWNodes(
    selection: d3.Selection<d3.BaseType, NodeData, d3.BaseType, unknown>,
  ) {
    // 메인 아이콘 (클라우드 모양)
    const iconGroup = selection.append("g").attr("class", "icon-group");

    // 클라우드 배경
    iconGroup
      .append("ellipse")
      .attr("cx", 0)
      .attr("cy", -5)
      .attr("rx", 25)
      .attr("ry", 15)
      .attr("fill", "url(#igw-gradient)")
      .attr("stroke", "#dc2626")
      .attr("stroke-width", 2);

    // 클라우드 상단 원들
    iconGroup
      .append("circle")
      .attr("cx", -15)
      .attr("cy", -12)
      .attr("r", 8)
      .attr("fill", "url(#igw-gradient)");

    iconGroup
      .append("circle")
      .attr("cx", 0)
      .attr("cy", -15)
      .attr("r", 10)
      .attr("fill", "url(#igw-gradient)");

    iconGroup
      .append("circle")
      .attr("cx", 15)
      .attr("cy", -12)
      .attr("r", 8)
      .attr("fill", "url(#igw-gradient)");

    // 인터넷 표시 (글로브 아이콘)
    iconGroup
      .append("circle")
      .attr("cx", 0)
      .attr("cy", -5)
      .attr("r", 8)
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-width", 1.5);

    iconGroup
      .append("path")
      .attr("d", "M -6,-5 Q 0,-12 6,-5 M -6,-5 Q 0,2 6,-5")
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-width", 1);

    iconGroup
      .append("line")
      .attr("x1", -8)
      .attr("y1", -5)
      .attr("x2", 8)
      .attr("y2", -5)
      .attr("stroke", "white")
      .attr("stroke-width", 1);
  }

  /**
   * NAT Gateway 노드 렌더링
   */
  private renderNATNodes(
    selection: d3.Selection<d3.BaseType, NodeData, d3.BaseType, unknown>,
  ) {
    // 메인 아이콘 (라우터 모양)
    const iconGroup = selection.append("g").attr("class", "icon-group");

    // 라우터 본체
    iconGroup
      .append("rect")
      .attr("x", -20)
      .attr("y", -12)
      .attr("width", 40)
      .attr("height", 24)
      .attr("rx", 4)
      .attr("fill", "url(#nat-gradient)")
      .attr("stroke", "#0891b2")
      .attr("stroke-width", 2);

    // 안테나
    iconGroup
      .append("line")
      .attr("x1", -10)
      .attr("y1", -12)
      .attr("x2", -10)
      .attr("y2", -20)
      .attr("stroke", "#0891b2")
      .attr("stroke-width", 2);

    iconGroup
      .append("line")
      .attr("x1", 10)
      .attr("y1", -12)
      .attr("x2", 10)
      .attr("y2", -20)
      .attr("stroke", "#0891b2")
      .attr("stroke-width", 2);

    // LED 표시등
    iconGroup
      .selectAll(".led")
      .data([-8, -2, 4, 10])
      .enter()
      .append("circle")
      .attr("class", "led")
      .attr("cx", (d) => d)
      .attr("cy", -4)
      .attr("r", 2)
      .attr("fill", "#22d3ee");

    // NAT 표시
    iconGroup
      .append("text")
      .attr("x", 0)
      .attr("y", 4)
      .attr("text-anchor", "middle")
      .attr("font-size", "8px")
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .text("NAT");
  }

  /**
   * 공통 요소 추가
   */
  private addCommonElements(
    selection: d3.Selection<d3.BaseType, NodeData, d3.BaseType, unknown>,
  ) {
    // 라벨
    selection
      .append("text")
      .attr("class", "node-label")
      .attr("x", 0)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("fill", "#374151")
      .text((d) => this.truncateLabel(d.label));

    // 상태 표시기
    if (this.options.showStatus) {
      selection
        .append("circle")
        .attr("class", "status-indicator")
        .attr("cx", 20)
        .attr("cy", -15)
        .attr("r", 4)
        .attr("stroke", "white")
        .attr("stroke-width", 1);
    }

    // 처리량 표시기
    if (this.options.showThroughput) {
      const throughputGroup = selection
        .append("g")
        .attr("class", "throughput-indicator")
        .attr("transform", "translate(-25, 15)");

      throughputGroup
        .append("rect")
        .attr("width", 50)
        .attr("height", 8)
        .attr("rx", 4)
        .attr("fill", "#e5e7eb")
        .attr("stroke", "#9ca3af")
        .attr("stroke-width", 1);

      throughputGroup
        .append("rect")
        .attr("class", "throughput-bar")
        .attr("width", 0)
        .attr("height", 8)
        .attr("rx", 4)
        .attr("fill", "#10b981");
    }

    // 활동 표시 (펄스 효과)
    if (this.options.animateActivity) {
      selection
        .append("circle")
        .attr("class", "activity-pulse")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 30)
        .attr("fill", "none")
        .attr("stroke", "#06b6d4")
        .attr("stroke-width", 2)
        .attr("opacity", 0)
        .attr("filter", "url(#pulse-filter)");
    }
  }

  /**
   * 노드 상태 업데이트
   */
  private updateNodeStatus(
    selection: d3.Selection<d3.BaseType, NodeData, d3.BaseType, unknown>,
  ) {
    // 상태 표시기 업데이트
    if (this.options.showStatus) {
      selection
        .select(".status-indicator")
        .attr("fill", (d) => this.getStatusColor(d.metadata.state));
    }

    // 처리량 표시기 업데이트
    if (this.options.showThroughput) {
      selection
        .select(".throughput-bar")
        .transition()
        .duration(1000)
        .attr("width", (d) => {
          const throughput = d.metadata.throughput || 0;
          const maxThroughput = d.metadata.maxThroughput || 100;
          return Math.min(50, (throughput / maxThroughput) * 50);
        })
        .attr("fill", (d) =>
          this.getThroughputColor(d.metadata.throughput || 0),
        );
    }

    // 활동 애니메이션
    if (this.options.animateActivity) {
      selection.select(".activity-pulse").each(function (d) {
        const isActive =
          d.metadata.state === "available" && (d.metadata.throughput || 0) > 0;

        if (isActive) {
          d3.select(this)
            .transition()
            .duration(2000)
            .ease(d3.easeLinear)
            .attr("r", 50)
            .attr("opacity", 0.3)
            .transition()
            .duration(0)
            .attr("r", 30)
            .attr("opacity", 0)
            .on("end", function () {
              // 애니메이션 반복
              d3.select(this).call((selection) =>
                selection.select(".activity-pulse").each(arguments.callee),
              );
            });
        } else {
          d3.select(this).interrupt().attr("opacity", 0);
        }
      });
    }

    // LED 애니메이션 (NAT Gateway)
    selection
      .filter((d) => d.type === NodeType.NAT)
      .selectAll(".led")
      .transition()
      .duration(500)
      .delay((d, i) => i * 100)
      .attr("fill", (d) =>
        d.metadata.state === "available" ? "#22d3ee" : "#6b7280",
      )
      .transition()
      .duration(500)
      .attr("fill", (d) =>
        d.metadata.state === "available" ? "#06b6d4" : "#9ca3af",
      );
  }

  /**
   * 상태 색상 결정
   */
  private getStatusColor(state: string): string {
    switch (state) {
      case "available":
        return "#10b981";
      case "pending":
        return "#f59e0b";
      case "deleting":
        return "#ef4444";
      case "deleted":
        return "#6b7280";
      default:
        return "#9ca3af";
    }
  }

  /**
   * 처리량 색상 결정
   */
  private getThroughputColor(throughput: number): string {
    if (throughput > 80) return "#ef4444"; // 높음 (빨강)
    if (throughput > 60) return "#f59e0b"; // 중간 (주황)
    if (throughput > 20) return "#10b981"; // 낮음 (초록)
    return "#6b7280"; // 매우 낮음 (회색)
  }

  /**
   * 라벨 자르기
   */
  private truncateLabel(label: string): string {
    return label.length > 12 ? `${label.substring(0, 12)}...` : label;
  }

  /**
   * 게이트웨이 노드 하이라이트
   */
  highlightGatewayNodes(nodeIds: string[]) {
    this.gatewayGroup.selectAll(".gateway-node").style("opacity", 0.3);

    this.gatewayGroup
      .selectAll(".gateway-node")
      .filter((d: any) => nodeIds.includes(d.id))
      .style("opacity", 1)
      .select(".icon-group")
      .style("filter", "drop-shadow(0 0 10px #00bcd4)");
  }

  /**
   * 하이라이트 제거
   */
  clearHighlights() {
    this.gatewayGroup
      .selectAll(".gateway-node")
      .style("opacity", 1)
      .select(".icon-group")
      .style("filter", null);
  }

  /**
   * 옵션 업데이트
   */
  updateOptions(options: Partial<GatewayRenderOptions>) {
    this.options = { ...this.options, ...options };
  }
}
