/**
 * 네트워크 시각화 컨테이너 컴포넌트
 * 모든 시각화 컴포넌트들을 통합하여 관리합니다.
 */

import React, { useState, useCallback } from "react";
import { NetworkVisualization } from "./NetworkVisualization";
import { NetworkControls } from "./NetworkControls";
import { NodeDetailsPanel } from "./NodeDetailsPanel";
import { NetworkStatusMonitor } from "./NetworkStatusMonitor";
import {
  AdvancedFilterSystem,
  type AdvancedFilterOptions,
} from "./AdvancedFilterSystem";
import type {
  NetworkTopologyData,
  NodeData,
  FilterOptions,
  VisualizationSettings,
} from "@/types/network-topology";
import { NodeType, ConnectionType } from "@/types/network-topology";

interface NetworkVisualizationContainerProps {
  data: NetworkTopologyData;
  onNodeClick?: (node: NodeData) => void;
  onNodeHover?: (node: NodeData | null) => void;
  showStatusMonitor?: boolean;
  enableRealTimeStatus?: boolean;
  enableAdvancedFilters?: boolean;
  className?: string;
}

export function NetworkVisualizationContainer({
  data,
  onNodeClick,
  onNodeHover,
  showStatusMonitor = true,
  enableRealTimeStatus = true,
  enableAdvancedFilters = true,
  className = "",
}: NetworkVisualizationContainerProps) {
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NodeData | null>(null);
  const [showMonitorPanel, setShowMonitorPanel] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [useAdvancedFilters, setUseAdvancedFilters] = useState(false);

  // 필터 상태 (기본 및 고급)
  const [filters, setFilters] = useState<FilterOptions>({
    nodeTypes: Object.values(NodeType),
    connectionTypes: Object.values(ConnectionType),
    accounts: [],
    regions: [],
    searchQuery: "",
  });

  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterOptions>(
    {
      nodeTypes: Object.values(NodeType),
      connectionTypes: Object.values(ConnectionType),
      accounts: [],
      regions: [],
      searchQuery: "",
      accountIds: [],
      regionNames: [],
      vpcIds: [],
      nodeStates: [],
      connectionStates: [],
      tagFilters: [],
      includeOrphanNodes: true,
      includeCrossConnections: true,
      includeInactiveConnections: true,
    },
  );

  // 시각화 설정 상태
  const [settings, setSettings] = useState<VisualizationSettings>({
    showLabels: true,
    showMetadata: false,
    highlightConnections: true,
    layoutType: "hierarchical",
    zoomLevel: 1,
    centerPosition: { x: 0, y: 0 },
  });

  // 노드 클릭 핸들러
  const handleNodeClick = useCallback(
    (node: NodeData) => {
      setSelectedNode(node);
      onNodeClick?.(node);
    },
    [onNodeClick],
  );

  // 노드 호버 핸들러
  const handleNodeHover = useCallback(
    (node: NodeData | null) => {
      setHoveredNode(node);
      onNodeHover?.(node);
    },
    [onNodeHover],
  );

  // 줌 제어 핸들러들
  const handleZoomIn = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      zoomLevel: Math.min(prev.zoomLevel * 1.5, 4),
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      zoomLevel: Math.max(prev.zoomLevel / 1.5, 0.1),
    }));
  }, []);

  const handleResetView = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      zoomLevel: 1,
      centerPosition: { x: 0, y: 0 },
    }));
  }, []);

  // 패널 닫기 핸들러
  const handleCloseDetailsPanel = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // 상태 모니터 패널 토글
  const handleToggleMonitorPanel = useCallback(() => {
    setShowMonitorPanel((prev) => !prev);
  }, []);

  // 고급 필터 패널 토글
  const handleToggleAdvancedFilters = useCallback(() => {
    setShowAdvancedFilters((prev) => !prev);
  }, []);

  // 고급 필터 사용 토글
  const handleToggleUseAdvancedFilters = useCallback(() => {
    setUseAdvancedFilters((prev) => !prev);
    if (!useAdvancedFilters) {
      setShowAdvancedFilters(true);
    }
  }, [useAdvancedFilters]);

  // 고급 필터 변경 핸들러
  const handleAdvancedFiltersChange = useCallback(
    (newAdvancedFilters: AdvancedFilterOptions) => {
      setAdvancedFilters(newAdvancedFilters);

      // 기본 필터도 동기화
      setFilters({
        nodeTypes: newAdvancedFilters.nodeTypes,
        connectionTypes: newAdvancedFilters.connectionTypes,
        accounts: newAdvancedFilters.accounts,
        regions: newAdvancedFilters.regions,
        searchQuery: newAdvancedFilters.searchQuery,
      });
    },
    [],
  );

  // 현재 사용할 필터 결정
  const currentFilters = useAdvancedFilters ? advancedFilters : filters;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 상단 상태 모니터 패널 (토글 가능) */}
      {showStatusMonitor && showMonitorPanel && (
        <div className="flex-shrink-0 border-b bg-muted/30">
          <NetworkStatusMonitor
            nodes={data.nodes}
            edges={data.edges}
            className="p-4"
          />
        </div>
      )}

      {/* 메인 시각화 영역 */}
      <div className="flex flex-1 min-h-0">
        {/* 좌측 제어 패널 */}
        <div className="flex-shrink-0">
          <NetworkControls
            filters={filters}
            settings={settings}
            onFiltersChange={setFilters}
            onSettingsChange={setSettings}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetView={handleResetView}
            showStatusMonitor={showStatusMonitor}
            onToggleStatusMonitor={handleToggleMonitorPanel}
            statusMonitorVisible={showMonitorPanel}
            enableAdvancedFilters={enableAdvancedFilters}
            onToggleAdvancedFilters={handleToggleAdvancedFilters}
            advancedFiltersVisible={showAdvancedFilters}
            useAdvancedFilters={useAdvancedFilters}
            onToggleUseAdvancedFilters={handleToggleUseAdvancedFilters}
          />
        </div>

        {/* 고급 필터 패널 (조건부 표시) */}
        {enableAdvancedFilters && showAdvancedFilters && (
          <div className="flex-shrink-0">
            <AdvancedFilterSystem
              nodes={data.nodes}
              edges={data.edges}
              onFiltersChange={handleAdvancedFiltersChange}
            />
          </div>
        )}

        {/* 중앙 시각화 영역 */}
        <div className="flex-1 relative">
          <NetworkVisualization
            data={data}
            filters={currentFilters}
            settings={settings}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            enableRealTimeStatus={enableRealTimeStatus}
            className="w-full h-full"
          />

          {/* 호버된 노드 정보 (간단한 툴팁) */}
          {hoveredNode && (
            <div className="absolute top-4 left-4 bg-black/80 text-white px-3 py-2 rounded-md text-sm pointer-events-none z-10">
              <div className="font-medium">{hoveredNode.label}</div>
              <div className="text-xs opacity-75">{hoveredNode.type}</div>
            </div>
          )}

          {/* 실시간 상태 표시 범례 */}
          {enableRealTimeStatus && (
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm border rounded-lg p-3 text-xs space-y-1">
              <div className="font-medium mb-2">연결 상태</div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-green-500"></div>
                <span>활성</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-gray-400 border-dashed border-t"></div>
                <span>비활성</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-yellow-500"></div>
                <span>성능 저하</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-red-500"></div>
                <span>오류</span>
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                <span>트래픽 플로우</span>
              </div>
            </div>
          )}
        </div>

        {/* 우측 상세 정보 패널 */}
        {selectedNode && (
          <div className="flex-shrink-0">
            <NodeDetailsPanel
              node={selectedNode}
              onClose={handleCloseDetailsPanel}
            />
          </div>
        )}
      </div>
    </div>
  );
}
