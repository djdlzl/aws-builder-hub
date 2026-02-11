/**
 * 네트워크 토폴로지 D3.js 시각화 컴포넌트
 * 계층적 그래프 레이아웃으로 AWS 네트워크 구조를 시각화합니다.
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
  EdgeData,
  FilterOptions,
  VisualizationSettings,
} from "@/types/network-topology";
import { NodeType } from "@/types/network-topology";
import {
  NetworkStatusVisualizer,
  type NetworkStatus,
} from "./NetworkStatusMonitor";
import {
  VisualizationErrorBoundary,
  PerformanceOptimizer,
} from "./VisualizationErrorHandler";
import { AlertTriangle, Zap, Filter } from "lucide-react";

interface NetworkVisualizationProps {
  data: NetworkTopologyData;
  filters?: FilterOptions;
  settings?: VisualizationSettings;
  onNodeClick?: (node: NodeData) => void;
  onNodeHover?: (node: NodeData | null) => void;
  enableRealTimeStatus?: boolean;
  statusUpdateInterval?: number;
  className?: string;
  onError?: (error: Error) => void;
  onPerformanceWarning?: (warning: string) => void;
}

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  type: NodeType;
  label: string;
  metadata: Record<string, any>;
  parent?: string;
  level: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  id: string;
  source: string | D3Node;
  target: string | D3Node;
  type: string;
  metadata: Record<string, any>;
}

export function NetworkVisualization({
  data,
  filters,
  settings,
  onNodeClick,
  onNodeHover,
  enableRealTimeStatus = true,
  statusUpdateInterval = 5000,
  className = "",
  onError,
  onPerformanceWarning,
}: NetworkVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const statusVisualizerRef = useRef<NetworkStatusVisualizer | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus[]>([]);
  const [isOptimizedMode, setIsOptimizedMode] = useState(false);
  const [performanceWarnings, setPerformanceWarnings] = useState<string[]>([]);
  const [renderingError, setRenderingError] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NodeData | null>(null);

  // 기본 설정 (성능 최적화 포함)
  const defaultSettings: VisualizationSettings = useMemo(() => {
    const nodeCount = data?.nodes?.length || 0;
    const edgeCount = data?.edges?.length || 0;
    const optimizations = PerformanceOptimizer.suggestOptimizations(
      nodeCount,
      edgeCount,
    );

    return {
      showLabels: !optimizations.reduceDetails,
      showMetadata: false,
      highlightConnections: !optimizations.disableAnimations,
      layoutType: optimizations.useSimpleLayout ? "simple" : "hierarchical",
      zoomLevel: 1,
      centerPosition: { x: 0, y: 0 },
      enableAnimations: !optimizations.disableAnimations,
      ...settings,
    };
  }, [data, settings]);

  // 데이터 검증 및 성능 경고
  const dataValidation = useMemo(() => {
    if (!data?.nodes || !data?.edges) {
      return { isValid: true, warnings: [], recommendations: [] };
    }

    return PerformanceOptimizer.validateDataSize(data.nodes, data.edges);
  }, [data]);

  // 성능 경고 처리
  useEffect(() => {
    if (!dataValidation.isValid) {
      setPerformanceWarnings(dataValidation.warnings);
      onPerformanceWarning?.(dataValidation.warnings.join("; "));

      // 자동으로 최적화 모드 활성화
      if (data?.nodes?.length > 500 || data?.edges?.length > 1000) {
        setIsOptimizedMode(true);
      }
    } else {
      setPerformanceWarnings([]);
    }
  }, [dataValidation, data, onPerformanceWarning]);

  // 컨테이너 크기 감지
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: width || 800, height: height || 600 });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // 네트워크 상태 시뮬레이션
  const simulateNetworkStatus = useCallback((): NetworkStatus[] => {
    if (!data?.edges) return [];

    return data.edges.map((edge) => {
      const baseLatency = Math.random() * 50 + 10; // 10-60ms
      const baseBandwidth = Math.random() * 1000 + 100; // 100-1100 Mbps
      const throughputVariation = Math.random() * 0.4 + 0.6; // 60-100%

      // 상태 결정 로직 (실제 환경에서는 실제 메트릭 사용)
      let state: NetworkStatus["state"] = "active";
      if (Math.random() < 0.05) state = "error";
      else if (Math.random() < 0.1) state = "degraded";
      else if (Math.random() < 0.15) state = "inactive";

      return {
        connectionId: edge.id,
        state,
        bandwidth: baseBandwidth,
        latency: baseLatency,
        packetLoss: Math.random() * 2, // 0-2%
        throughput: throughputVariation * 100,
        lastUpdated: new Date(),
      };
    });
  }, [data?.edges]);

  // 실시간 상태 업데이트
  useEffect(() => {
    if (!enableRealTimeStatus || !data?.edges) return;

    const updateStatus = () => {
      const newStatus = simulateNetworkStatus();
      setNetworkStatus(newStatus);

      // 시각화에 상태 적용
      if (statusVisualizerRef.current) {
        statusVisualizerRef.current.updateStatus(newStatus);
      }
    };

    // 초기 업데이트
    updateStatus();

    // 주기적 업데이트
    const interval = setInterval(updateStatus, statusUpdateInterval);

    return () => clearInterval(interval);
  }, [
    enableRealTimeStatus,
    statusUpdateInterval,
    simulateNetworkStatus,
    data?.edges,
  ]);

  // 데이터 전처리 및 시각화 렌더링 (오류 처리 포함)
  useEffect(() => {
    if (!data || !svgRef.current) return;

    try {
      setRenderingError(null);

      // 메모리 사용량 확인
      const memoryCheck = PerformanceOptimizer.checkMemoryUsage();
      if (memoryCheck.isHigh) {
        console.warn("높은 메모리 사용량 감지:", memoryCheck.usage);
        setIsOptimizedMode(true);
      }

      // 성능 측정 시작
      const renderStart = performance.now();
      performance.mark("visualization-render-start");

      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove(); // 기존 요소 제거

      // 필터링된 데이터 준비
      const filteredNodes = filterNodes(data.nodes, filters);
      const filteredEdges = filterEdges(
        data.edges,
        filteredNodes,
        filters,
        hoveredNode,
      );

      // 대용량 데이터 처리
      let processedNodes = filteredNodes;
      let processedEdges = filteredEdges;

      if (isOptimizedMode) {
        // 최적화 모드에서는 데이터를 제한
        processedNodes = filteredNodes.slice(0, 500);
        processedEdges = filteredEdges.slice(0, 1000);
      }

      // D3 데이터 구조로 변환
      const d3Nodes: D3Node[] = processedNodes.map((node) => ({
        ...node,
        level: getNodeLevel(node.type),
      }));

      const d3Links: D3Link[] = processedEdges.map((edge) => ({
        ...edge,
        source: edge.source,
        target: edge.target,
      }));

      // SVG 설정
      const { width, height } = dimensions;
      svg.attr("width", width).attr("height", height);

      // 줌 및 팬 설정 (최적화 모드에서는 제한)
      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent(isOptimizedMode ? [0.5, 2] : [0.1, 4])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
        });

      svg.call(zoom);

      // 메인 그룹
      const g = svg.append("g");

      // 계층적 레이아웃 적용
      if (defaultSettings.layoutType === "hierarchical") {
        applyHierarchicalLayout(d3Nodes, width, height);
      } else {
        applySimpleLayout(d3Nodes, width, height);
      }

      // 링크 렌더링 (청킹 처리)
      const linkChunks = PerformanceOptimizer.chunkData(d3Links, 50);
      const links = g
        .selectAll(".link")
        .data(d3Links)
        .enter()
        .append("g")
        .attr("class", "link-group");

      // 기본 링크 라인
      const linkPaths = links
        .append("line")
        .attr("class", "link connection-path")
        .attr("id", (d) => `link-${d.id}`)
        .attr("stroke", (d) => getLinkColor(d.type))
        .attr("stroke-width", (d) =>
          isOptimizedMode ? 1 : getLinkWidth(d.metadata),
        )
        .attr("stroke-opacity", 0.6)
        .attr("marker-end", isOptimizedMode ? null : "url(#arrowhead)");

      // 애니메이션 효과 (최적화 모드에서는 비활성화)
      if (!isOptimizedMode && defaultSettings.enableAnimations) {
        // 트래픽 플로우 애니메이션을 위한 점들
        const flowDots = links
          .append("circle")
          .attr("class", "flow-dot")
          .attr("r", 2)
          .attr("fill", "#00bcd4")
          .attr("opacity", 0)
          .style("pointer-events", "none");

        // 화살표 마커 정의
        const defs = svg.append("defs");
        defs
          .append("marker")
          .attr("id", "arrowhead")
          .attr("viewBox", "-0 -5 10 10")
          .attr("refX", 13)
          .attr("refY", 0)
          .attr("orient", "auto")
          .attr("markerWidth", 13)
          .attr("markerHeight", 13)
          .attr("xoverflow", "visible")
          .append("svg:path")
          .attr("d", "M 0,-5 L 10 ,0 L 0,5")
          .attr("fill", "#999")
          .style("stroke", "none");
      }

      // 노드 그룹 생성 (청킹 처리)
      const nodeChunks = PerformanceOptimizer.chunkData(d3Nodes, 50);
      const nodeGroups = g
        .selectAll(".node-group")
        .data(d3Nodes)
        .enter()
        .append("g")
        .attr("class", "node-group")
        .style("cursor", "pointer");

      // 부모-자식 관계 맵 구축 (컨테이너 크기 계산용)
      const childrenMap = new Map<string, D3Node[]>();
      d3Nodes.forEach((node) => {
        if (node.parent) {
          if (!childrenMap.has(node.parent)) {
            childrenMap.set(node.parent, []);
          }
          childrenMap.get(node.parent)!.push(node);
        }
      });

      // 컨테이너 크기 계산 함수
      const calculateContainerBounds = (
        nodeId: string,
      ): { width: number; height: number } => {
        const children = childrenMap.get(nodeId) || [];
        const node = d3Nodes.find((n) => n.id === nodeId);
        if (!node) return { width: 100, height: 80 };

        const baseWidth = getNodeWidth(node.type);
        const baseHeight = getNodeHeight(node.type);

        if (children.length === 0) {
          return { width: baseWidth, height: baseHeight };
        }

        // 자식들의 바운드 계산
        let minX = Infinity,
          maxX = -Infinity,
          minY = Infinity,
          maxY = -Infinity;
        children.forEach((child) => {
          const childBounds = calculateContainerBounds(child.id);
          const cx = child.x || 0;
          const cy = child.y || 0;
          minX = Math.min(minX, cx - childBounds.width / 2);
          maxX = Math.max(maxX, cx + childBounds.width / 2);
          minY = Math.min(minY, cy - childBounds.height / 2);
          maxY = Math.max(maxY, cy + childBounds.height / 2);
        });

        return {
          width: Math.max(baseWidth, maxX - minX + 40),
          height: Math.max(baseHeight, maxY - minY + 60),
        };
      };

      // 컨테이너 노드 (계정, 리전, VPC) - 자식을 포함하는 크기로 렌더링
      const containerNodes = nodeGroups.filter((d) => isContainerNode(d.type));
      containerNodes
        .append("rect")
        .attr("class", "container-node")
        .attr("width", (d) => {
          const bounds = calculateContainerBounds(d.id);
          return isOptimizedMode ? bounds.width * 0.8 : bounds.width;
        })
        .attr("height", (d) => {
          const bounds = calculateContainerBounds(d.id);
          return isOptimizedMode ? bounds.height * 0.8 : bounds.height;
        })
        .attr("rx", 8)
        .attr("ry", 8)
        .attr("fill", (d) => getNodeColor(d.type, d.metadata))
        .attr("stroke", (d) => getNodeBorderColor(d.type, d.metadata))
        .attr("stroke-width", isOptimizedMode ? 1 : 2)
        .attr("stroke-dasharray", (d) =>
          d.type === NodeType.ACCOUNT ? "none" : "5,3",
        )
        .attr("fill-opacity", 0.08)
        .attr("stroke-opacity", 0.9);

      // 컨테이너 노드 위치 조정 (좌상단 기준)
      containerNodes.attr("transform", (d) => {
        const bounds = calculateContainerBounds(d.id);
        const width = isOptimizedMode ? bounds.width * 0.8 : bounds.width;
        const height = isOptimizedMode ? bounds.height * 0.8 : bounds.height;
        return `translate(${d.x! - width / 2}, ${d.y! - height / 2})`;
      });

      // 일반 노드 (서브넷, 게이트웨이)
      const regularNodes = nodeGroups.filter((d) => !isContainerNode(d.type));
      regularNodes
        .append("rect")
        .attr("class", "regular-node")
        .attr("width", (d) =>
          isOptimizedMode ? getNodeWidth(d.type) * 0.8 : getNodeWidth(d.type),
        )
        .attr("height", (d) =>
          isOptimizedMode ? getNodeHeight(d.type) * 0.8 : getNodeHeight(d.type),
        )
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("fill", (d) => getNodeColor(d.type, d.metadata))
        .attr("stroke", (d) => getNodeBorderColor(d.type, d.metadata))
        .attr("stroke-width", 1.5);

      // 일반 노드 위치 설정
      regularNodes.attr("transform", (d) => {
        const width = isOptimizedMode
          ? getNodeWidth(d.type) * 0.8
          : getNodeWidth(d.type);
        const height = isOptimizedMode
          ? getNodeHeight(d.type) * 0.8
          : getNodeHeight(d.type);
        return `translate(${d.x! - width / 2}, ${d.y! - height / 2})`;
      });

      // 노드 라벨 (서브넷은 호버 시에만 표시)
      if (
        defaultSettings.showLabels &&
        (!isOptimizedMode || d3Nodes.length < 200)
      ) {
        // 컨테이너 노드 라벨 (항상 표시)
        containerNodes
          .append("text")
          .attr("class", "node-label")
          .attr("x", (d) => {
            const bounds = calculateContainerBounds(d.id);
            return (isOptimizedMode ? bounds.width * 0.8 : bounds.width) / 2;
          })
          .attr("y", 20)
          .attr("text-anchor", "middle")
          .style("font-size", (d) =>
            isOptimizedMode ? "10px" : getNodeFontSize(d.type),
          )
          .style("font-weight", "bold")
          .style("fill", "#333")
          .style("pointer-events", "none")
          .text((d) => truncateLabel(d.label, d.type));

        // 일반 노드 라벨 (서브넷은 호버 시에만 표시)
        const nonSubnetNodes = regularNodes.filter(
          (d) => d.type !== NodeType.SUBNET,
        );
        nonSubnetNodes
          .append("text")
          .attr("class", "node-label")
          .attr("x", (d) => getNodeWidth(d.type) / 2)
          .attr("y", (d) => getNodeHeight(d.type) / 2)
          .attr("text-anchor", "middle")
          .attr("dy", "0.35em")
          .style("font-size", (d) =>
            isOptimizedMode ? "8px" : getNodeFontSize(d.type),
          )
          .style("font-weight", "normal")
          .style("fill", "#333")
          .style("pointer-events", "none")
          .text((d) => truncateLabel(d.label, d.type));

        // 서브넷 노드 라벨 (호버 시에만 표시)
        const subnetNodes = regularNodes.filter(
          (d) => d.type === NodeType.SUBNET,
        );
        const subnetLabels = subnetNodes
          .append("text")
          .attr("class", "node-label subnet-label")
          .attr("x", (d) => getNodeWidth(d.type) / 2)
          .attr("y", (d) => getNodeHeight(d.type) + 12)
          .attr("text-anchor", "middle")
          .style("font-size", "9px")
          .style("font-weight", "normal")
          .style("fill", "#666")
          .style("pointer-events", "none")
          .style("opacity", 0) // 기본적으로 숨김
          .text((d) => truncateLabel(d.label, d.type));

        // 서브넷 호버 이벤트
        subnetNodes
          .on("mouseenter", function () {
            d3.select(this).select(".subnet-label").style("opacity", 1);
          })
          .on("mouseleave", function () {
            d3.select(this).select(".subnet-label").style("opacity", 0);
          });
      }

      // 링크 위치 설정
      linkPaths
        .attr("x1", (d) => (d.source as D3Node).x!)
        .attr("y1", (d) => (d.source as D3Node).y!)
        .attr("x2", (d) => (d.target as D3Node).x!)
        .attr("y2", (d) => (d.target as D3Node).y!);

      // 이벤트 핸들러 (최적화 모드에서는 간소화)
      nodeGroups
        .on("click", (event, d) => {
          event.stopPropagation();
          onNodeClick?.(d as NodeData);
        })
        .on("mouseenter", (event, d) => {
          if (!isOptimizedMode) {
            setHoveredNode(d as NodeData);
            onNodeHover?.(d as NodeData);
            highlightConnectedNodes(d, nodeGroups, linkPaths);
          }
        })
        .on("mouseleave", () => {
          if (!isOptimizedMode) {
            setHoveredNode(null);
            onNodeHover?.(null);
            clearHighlights(nodeGroups, linkPaths);
          }
        });

      // 실시간 상태 시각화 초기화 (최적화 모드에서는 비활성화)
      if (enableRealTimeStatus && !isOptimizedMode) {
        statusVisualizerRef.current = new NetworkStatusVisualizer(svg);

        // 초기 상태 적용
        if (networkStatus.length > 0) {
          statusVisualizerRef.current.updateStatus(networkStatus);
        }
      }

      // 초기 줌 설정
      const initialTransform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(defaultSettings.zoomLevel);
      svg.call(zoom.transform, initialTransform);

      // 성능 측정 완료
      const renderEnd = performance.now();
      const renderTime = renderEnd - renderStart;
      performance.mark("visualization-render-end");
      performance.measure(
        "visualization-render",
        "visualization-render-start",
        "visualization-render-end",
      );

      // 성능 경고 확인
      if (renderTime > 3000) {
        const warning = `렌더링 시간이 오래 걸렸습니다 (${Math.round(renderTime)}ms)`;
        setPerformanceWarnings((prev) => [...prev, warning]);
        onPerformanceWarning?.(warning);
      }
    } catch (error) {
      console.error("시각화 렌더링 오류:", error);
      setRenderingError(
        error instanceof Error ? error.message : "알 수 없는 렌더링 오류",
      );
      onError?.(error instanceof Error ? error : new Error("렌더링 실패"));
    }
  }, [
    data,
    filters,
    defaultSettings,
    dimensions,
    onNodeClick,
    onNodeHover,
    hoveredNode,
    isOptimizedMode,
    enableRealTimeStatus,
    networkStatus,
    onError,
    onPerformanceWarning,
  ]);

  // 오류 처리 콜백
  const handleVisualizationRetry = useCallback(() => {
    setRenderingError(null);
    setIsOptimizedMode(false);
  }, []);

  const handleVisualizationFallback = useCallback(() => {
    setIsOptimizedMode(true);
    setRenderingError(null);
  }, []);

  // 렌더링 오류가 있는 경우 오류 표시
  if (renderingError) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[400px] bg-gray-50">
        <div className="max-w-md p-8 bg-white rounded-lg shadow-lg text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            렌더링 오류
          </h3>
          <p className="text-gray-600 mb-4">{renderingError}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleVisualizationRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              다시 시도
            </button>
            <button
              onClick={handleVisualizationFallback}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              간단한 모드
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <VisualizationErrorBoundary
      onRetry={handleVisualizationRetry}
      onFallback={handleVisualizationFallback}
      maxRetries={3}
      performanceThreshold={5000}
      memoryThreshold={0.8}
    >
      <div ref={containerRef} className={`w-full h-full ${className}`}>
        {/* 성능 경고 표시 */}
        {performanceWarnings.length > 0 && (
          <div className="absolute top-4 right-4 z-10 max-w-sm">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start">
                <Zap className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">
                    성능 경고
                  </h4>
                  <ul className="mt-1 text-xs text-yellow-700 space-y-1">
                    {performanceWarnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                  {dataValidation.recommendations.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-yellow-800">
                        권장사항:
                      </p>
                      <ul className="text-xs text-yellow-700 space-y-1">
                        {dataValidation.recommendations.map((rec, index) => (
                          <li key={index}>• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 최적화 모드 표시 */}
        {isOptimizedMode && (
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center">
              <Filter className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-sm text-blue-800">최적화 모드</span>
            </div>
          </div>
        )}

        <svg ref={svgRef} className="w-full h-full" />

        {/* 서브넷 타입 범례 */}
        <div className="absolute bottom-4 left-4 z-10">
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg p-3 shadow-sm">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">
              서브넷 타입
            </h4>
            <div className="space-y-1.5">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: "#10b981" }} />
                <span className="text-xs text-gray-600">퍼블릭 (IGW)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: "#f59e0b" }} />
                <span className="text-xs text-gray-600">프라이빗 (NAT)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: "#ef4444" }} />
                <span className="text-xs text-gray-600">격리됨</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </VisualizationErrorBoundary>
  );
}

// 유틸리티 함수들

function filterNodes(nodes: NodeData[], filters?: FilterOptions): NodeData[] {
  if (!filters) return nodes;

  return nodes.filter((node) => {
    // 노드 타입 필터
    if (
      filters.nodeTypes.length > 0 &&
      !filters.nodeTypes.includes(node.type)
    ) {
      return false;
    }

    // 검색 쿼리 필터 (향상된 검색)
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const searchableText = [
        node.label,
        node.id,
        node.metadata.accountId,
        node.metadata.region,
        node.metadata.vpcId,
        node.metadata.subnetId,
        ...(node.metadata.tags
          ? Object.entries(node.metadata.tags).flat()
          : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!searchableText.includes(query)) {
        return false;
      }
    }

    // 고급 필터 지원
    const advancedFilters = filters as any;

    // 계정 필터
    if (
      advancedFilters.accountIds?.length > 0 &&
      node.metadata.accountId &&
      !advancedFilters.accountIds.includes(node.metadata.accountId)
    ) {
      return false;
    }

    // 리전 필터
    if (
      advancedFilters.regionNames?.length > 0 &&
      node.metadata.region &&
      !advancedFilters.regionNames.includes(node.metadata.region)
    ) {
      return false;
    }

    // VPC 필터
    if (
      advancedFilters.vpcIds?.length > 0 &&
      node.metadata.vpcId &&
      !advancedFilters.vpcIds.includes(node.metadata.vpcId)
    ) {
      return false;
    }

    // 상태 필터
    if (
      advancedFilters.nodeStates?.length > 0 &&
      node.metadata.state &&
      !advancedFilters.nodeStates.includes(node.metadata.state)
    ) {
      return false;
    }

    // 태그 필터
    if (advancedFilters.tagFilters?.length > 0) {
      const nodeTags = node.metadata.tags || {};
      const matchesAllTagFilters = advancedFilters.tagFilters.every(
        (tagFilter: any) => {
          if (!tagFilter.key || !tagFilter.value) return true;

          const tagValue = nodeTags[tagFilter.key];
          if (!tagValue) return false;

          const tagValueStr = String(tagValue).toLowerCase();
          const filterValue = tagFilter.value.toLowerCase();

          switch (tagFilter.operator) {
            case "equals":
              return tagValueStr === filterValue;
            case "contains":
              return tagValueStr.includes(filterValue);
            case "startsWith":
              return tagValueStr.startsWith(filterValue);
            case "endsWith":
              return tagValueStr.endsWith(filterValue);
            default:
              return tagValueStr === filterValue;
          }
        },
      );

      if (!matchesAllTagFilters) {
        return false;
      }
    }

    return true;
  });
}

function filterEdges(
  edges: EdgeData[],
  nodes: NodeData[],
  filters?: FilterOptions,
  hoveredNode?: NodeData | null,
): EdgeData[] {
  if (!filters) return edges;

  const nodeIds = new Set(nodes.map((n) => n.id));

  return edges.filter((edge) => {
    // 소스와 타겟 노드가 모두 필터링된 노드에 포함되어야 함
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      return false;
    }

    // 연결 타입 필터
    if (
      filters.connectionTypes.length > 0 &&
      !filters.connectionTypes.includes(edge.type)
    ) {
      return false;
    }

    // 고급 필터 지원
    const advancedFilters = filters as any;

    if (edge.metadata.scope === "SUBNET") {
      if (!hoveredNode || hoveredNode.type !== NodeType.SUBNET) {
        return false;
      }

      if (edge.source !== hoveredNode.id && edge.target !== hoveredNode.id) {
        return false;
      }
    }

    // 연결 상태 필터
    if (
      advancedFilters.connectionStates?.length > 0 &&
      edge.metadata.state &&
      !advancedFilters.connectionStates.includes(edge.metadata.state)
    ) {
      return false;
    }

    // 비활성 연결 포함 여부
    if (
      advancedFilters.includeInactiveConnections === false &&
      edge.metadata.state === "inactive"
    ) {
      return false;
    }

    // 크로스 연결 포함 여부
    if (advancedFilters.includeCrossConnections === false) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);

      if (sourceNode && targetNode) {
        const isCrossAccount =
          sourceNode.metadata.accountId !== targetNode.metadata.accountId;
        const isCrossRegion =
          sourceNode.metadata.region !== targetNode.metadata.region;

        if (isCrossAccount || isCrossRegion) {
          return false;
        }
      }
    }

    return true;
  });
}

function getNodeLevel(type: NodeType): number {
  switch (type) {
    case NodeType.ACCOUNT:
      return 0;
    case NodeType.REGION:
      return 1;
    case NodeType.VPC:
      return 2;
    case NodeType.SUBNET:
      return 3;
    case NodeType.IGW:
    case NodeType.NAT:
      return 3;
    default:
      return 4;
  }
}

function applyHierarchicalLayout(
  nodes: D3Node[],
  width: number,
  height: number,
) {
  // 부모-자식 관계 맵 구축
  const childrenMap = new Map<string, D3Node[]>();
  const rootNodes: D3Node[] = [];
  const nodeMap = new Map<string, D3Node>();

  nodes.forEach((node) => {
    nodeMap.set(node.id, node);
    if (!node.parent) {
      rootNodes.push(node);
    } else {
      if (!childrenMap.has(node.parent)) {
        childrenMap.set(node.parent, []);
      }
      childrenMap.get(node.parent)!.push(node);
    }
  });

  // 컨테이너 노드 크기 계산 (자식 포함)
  const calculateContainerSize = (
    node: D3Node,
  ): { width: number; height: number } => {
    const children = childrenMap.get(node.id) || [];
    const baseWidth = getNodeWidth(node.type);
    const baseHeight = getNodeHeight(node.type);

    if (children.length === 0) {
      return { width: baseWidth, height: baseHeight };
    }

    // 자식들의 크기 합산
    let totalChildWidth = 0;
    let maxChildHeight = 0;
    children.forEach((child) => {
      const childSize = calculateContainerSize(child);
      totalChildWidth += childSize.width + 20; // 간격
      maxChildHeight = Math.max(maxChildHeight, childSize.height);
    });

    return {
      width: Math.max(baseWidth, totalChildWidth + 40),
      height: baseHeight + maxChildHeight + 60,
    };
  };

  // 재귀적으로 노드 위치 지정
  const positionNode = (
    node: D3Node,
    containerX: number,
    containerY: number,
    containerWidth: number,
  ) => {
    const nodeWidth = getNodeWidth(node.type);
    const nodeHeight = getNodeHeight(node.type);
    const children = childrenMap.get(node.id) || [];

    // 노드 자체 위치 (컨테이너 중앙 상단)
    node.x = containerX + containerWidth / 2;
    node.y = containerY + nodeHeight / 2 + 20;
    node.fx = node.x;
    node.fy = node.y;

    if (children.length === 0) return;

    // 자식 노드들의 총 너비 계산
    const childSizes = children.map((child) => calculateContainerSize(child));
    const totalChildWidth = childSizes.reduce(
      (sum, size) => sum + size.width + 20,
      -20,
    );

    // 자식 노드들 배치 (부모 아래에 가로로 나열)
    let childX = containerX + (containerWidth - totalChildWidth) / 2;
    const childY = containerY + nodeHeight + 50;

    children.forEach((child, index) => {
      const childSize = childSizes[index];
      positionNode(child, childX, childY, childSize.width);
      childX += childSize.width + 20;
    });
  };

  // 루트 노드들 배치
  const rootSizes = rootNodes.map((node) => calculateContainerSize(node));
  const totalRootWidth = rootSizes.reduce(
    (sum, size) => sum + size.width + 40,
    -40,
  );
  let rootX = (width - totalRootWidth) / 2;
  const rootY = 20;

  rootNodes.forEach((node, index) => {
    const rootSize = rootSizes[index];
    positionNode(node, rootX, rootY, rootSize.width);
    rootX += rootSize.width + 40;
  });
}

function applySimpleLayout(nodes: D3Node[], width: number, height: number) {
  // 간단한 그리드 레이아웃
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const rows = Math.ceil(nodes.length / cols);
  const cellWidth = width / cols;
  const cellHeight = height / rows;

  nodes.forEach((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);

    node.x = cellWidth * (col + 0.5);
    node.y = cellHeight * (row + 0.5);
    node.fx = node.x;
    node.fy = node.y;
  });
}

function isContainerNode(type: NodeType): boolean {
  return [NodeType.ACCOUNT, NodeType.REGION, NodeType.VPC].includes(type);
}

function getNodeWidth(type: NodeType): number {
  switch (type) {
    case NodeType.ACCOUNT:
      return 200;
    case NodeType.REGION:
      return 160;
    case NodeType.VPC:
      return 120;
    case NodeType.SUBNET:
      return 80;
    case NodeType.IGW:
    case NodeType.NAT:
      return 60;
    default:
      return 40;
  }
}

function getNodeHeight(type: NodeType): number {
  switch (type) {
    case NodeType.ACCOUNT:
      return 150;
    case NodeType.REGION:
      return 120;
    case NodeType.VPC:
      return 90;
    case NodeType.SUBNET:
      return 40;
    case NodeType.IGW:
    case NodeType.NAT:
      return 40;
    default:
      return 30;
  }
}

function getNodeColor(type: NodeType, metadata?: Record<string, any>): string {
  // 서브넷 타입에 따라 색상 구분
  if (type === NodeType.SUBNET && metadata?.subnetType) {
    switch (metadata.subnetType) {
      case "PUBLIC":
        return "#10b981"; // emerald (퍼블릭)
      case "PRIVATE_WITH_NAT":
        return "#f59e0b"; // amber (프라이빗 with NAT)
      case "PRIVATE_ISOLATED":
        return "#ef4444"; // red (격리된 프라이빗)
      default:
        return "#f59e0b"; // amber (기본)
    }
  }

  switch (type) {
    case NodeType.ACCOUNT:
      return "#3b82f6"; // blue
    case NodeType.REGION:
      return "#10b981"; // emerald
    case NodeType.VPC:
      return "#8b5cf6"; // violet
    case NodeType.SUBNET:
      return "#f59e0b"; // amber (기본값)
    case NodeType.IGW:
      return "#ef4444"; // red
    case NodeType.NAT:
      return "#06b6d4"; // cyan
    default:
      return "#6b7280"; // gray
  }
}

function getNodeBorderColor(type: NodeType, metadata?: Record<string, any>): string {
  const baseColor = getNodeColor(type, metadata);
  return d3.color(baseColor)?.darker(0.5)?.toString() || baseColor;
}

function getNodeFontSize(type: NodeType): string {
  switch (type) {
    case NodeType.ACCOUNT:
      return "14px";
    case NodeType.REGION:
      return "12px";
    case NodeType.VPC:
      return "11px";
    case NodeType.SUBNET:
      return "10px";
    default:
      return "9px";
  }
}

function getLinkColor(type: string): string {
  switch (type) {
    case "VPC_PEERING":
      return "#8b5cf6";
    case "CLOUDWAN":
      return "#10b981";
    case "GATEWAY":
      return "#f59e0b";
    case "ROUTE":
      return "#6b7280";
    case "TRANSIT_GATEWAY":
      return "#ef4444";
    default:
      return "#9ca3af";
  }
}

function getLinkWidth(metadata: Record<string, any>): number {
  const bandwidth = metadata.bandwidth || 1;
  return Math.max(1, Math.min(5, bandwidth / 1000)); // 1-5px 범위
}

function truncateLabel(label: string, type: NodeType): string {
  const maxLength = isContainerNode(type) ? 20 : 12;
  return label.length > maxLength
    ? `${label.substring(0, maxLength)}...`
    : label;
}

function highlightConnectedNodes(
  selectedNode: D3Node,
  nodeGroups: d3.Selection<d3.BaseType, D3Node, d3.BaseType, unknown>,
  links: d3.Selection<d3.BaseType, D3Link, d3.BaseType, unknown>,
) {
  // 모든 노드와 링크를 흐리게 만들기
  nodeGroups.style("opacity", 0.3);
  links.style("opacity", 0.1);

  // 선택된 노드 강조 (형광 하늘색)
  nodeGroups
    .filter((d) => d.id === selectedNode.id)
    .style("opacity", 1)
    .select("rect, circle")
    .attr("stroke", "#00bcd4")
    .attr("stroke-width", 3)
    .attr("filter", "drop-shadow(0 0 8px #00bcd4)");

  // 연결된 링크와 노드 찾기
  const connectedNodeIds = new Set<string>();
  links.each(function (d) {
    const sourceId = typeof d.source === "string" ? d.source : d.source.id;
    const targetId = typeof d.target === "string" ? d.target : d.target.id;

    if (sourceId === selectedNode.id || targetId === selectedNode.id) {
      // 연결된 링크 강조 (형광 하늘색)
      d3.select(this)
        .style("opacity", 1)
        .attr("stroke", "#00bcd4")
        .attr("stroke-width", 4)
        .attr("filter", "drop-shadow(0 0 6px #00bcd4)");

      // 연결된 노드 ID 수집
      connectedNodeIds.add(sourceId);
      connectedNodeIds.add(targetId);
    }
  });

  // 연결된 노드들 강조 (형광 하늘색)
  nodeGroups
    .filter((d) => connectedNodeIds.has(d.id) && d.id !== selectedNode.id)
    .style("opacity", 1)
    .select("rect, circle")
    .attr("stroke", "#00bcd4")
    .attr("stroke-width", 2)
    .attr("filter", "drop-shadow(0 0 6px #00bcd4)");
}

function clearHighlights(
  nodeGroups: d3.Selection<d3.BaseType, D3Node, d3.BaseType, unknown>,
  links: d3.Selection<d3.BaseType, D3Link, d3.BaseType, unknown>,
) {
  // 투명도 복원
  nodeGroups.style("opacity", 1);
  links.style("opacity", 0.6);

  // 노드 스타일 복원
  nodeGroups
    .selectAll("rect, circle")
    .attr("stroke", (d) => getNodeBorderColor((d as D3Node).type))
    .attr("stroke-width", (d) =>
      isContainerNode((d as D3Node).type) ? 2 : 1.5,
    )
    .attr("filter", null);

  // 링크 스타일 복원
  links
    .attr("stroke", (d) => getLinkColor((d as D3Link).type))
    .attr("stroke-width", (d) => getLinkWidth((d as D3Link).metadata))
    .attr("filter", null);
}
