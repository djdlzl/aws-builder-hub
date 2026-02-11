/**
 * 네트워크 시각화 컨테이너 컴포넌트
 * 트리형 네트워크 토폴로지 시각화를 제공합니다.
 * - 계정 → 리전 → VPC → 서브넷 트리 구조
 * - VPC 클릭 시 서브넷 펼침/접힘
 * - 서브넷 클릭 시 연결된 서브넷 표시
 * - 노드 호버 시 동일 레벨 연결 하이라이트
 */

import React, { useState, useCallback } from "react";
import { ForceTopologyVisualization } from "./ForceTopologyVisualization";
import { NodeDetailsPanel } from "./NodeDetailsPanel";
import type { NetworkTopologyData, NodeData } from "@/types/network-topology";

interface NetworkVisualizationContainerProps {
  data: NetworkTopologyData;
  onNodeClick?: (node: NodeData) => void;
  onNodeHover?: (node: NodeData | null) => void;
  showStatusMonitor?: boolean;
  enableRealTimeStatus?: boolean;
  enableAdvancedFilters?: boolean;
  className?: string;
  onError?: (error: Error) => void;
  onPerformanceWarning?: (warning: string) => void;
}

export function NetworkVisualizationContainer({
  data,
  onNodeClick,
  onNodeHover,
  className = "",
  onError,
}: NetworkVisualizationContainerProps) {
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);

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
      onNodeHover?.(node);
    },
    [onNodeHover],
  );

  // 패널 닫기 핸들러
  const handleCloseDetailsPanel = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // 에러 핸들러
  const handleError = useCallback(
    (error: Error) => {
      console.error("TreeTopologyVisualization error:", error);
      onError?.(error);
    },
    [onError],
  );

  return (
    <div className={`flex h-full ${className}`}>
      {/* 메인 시각화 영역 */}
      <div className="flex-1 relative">
        <ForceTopologyVisualization
          data={data}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          onError={handleError}
          className="w-full h-full"
        />
      </div>

      {/* 우측 상세 정보 패널 */}
      {selectedNode && (
        <div className="flex-shrink-0 w-80 border-l h-full overflow-hidden">
          <NodeDetailsPanel
            node={selectedNode}
            onClose={handleCloseDetailsPanel}
            className="h-full"
          />
        </div>
      )}
    </div>
  );
}
