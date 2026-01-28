/**
 * 네트워크 시각화 성능 최적화 유틸리티
 * 대규모 네트워크 환경에서의 렌더링 성능을 최적화합니다.
 */

import { NodeData, EdgeData } from '@/types/network-topology';

export interface PerformanceMetrics {
    nodeCount: number;
    edgeCount: number;
    renderTime: number;
    memoryUsage: number;
    isOptimized: boolean;
}

export interface OptimizationSuggestions {
    reduceDetails: boolean;
    disableAnimations: boolean;
    useSimpleLayout: boolean;
    enableVirtualization: boolean;
    limitNodeCount: boolean;
    limitEdgeCount: boolean;
}

export interface DataValidationResult {
    isValid: boolean;
    warnings: string[];
    recommendations: string[];
    suggestedOptimizations: OptimizationSuggestions;
}

export interface MemoryUsage {
    used: number;
    total: number;
    percentage: number;
    isHigh: boolean;
}

export class PerformanceOptimizer {
    // 성능 임계값 상수
    private static readonly LARGE_DATASET_NODE_THRESHOLD = 500;
    private static readonly LARGE_DATASET_EDGE_THRESHOLD = 1000;
    private static readonly MEMORY_WARNING_THRESHOLD = 0.8; // 80%
    private static readonly RENDER_TIME_WARNING_THRESHOLD = 3000; // 3초
    private static readonly MAX_NODES_OPTIMIZED = 300;
    private static readonly MAX_EDGES_OPTIMIZED = 600;

    /**
     * 데이터 크기를 검증하고 성능 경고를 생성합니다.
     */
    static validateDataSize(nodes: NodeData[], edges: EdgeData[]): DataValidationResult {
        const nodeCount = nodes.length;
        const edgeCount = edges.length;
        const warnings: string[] = [];
        const recommendations: string[] = [];

        // 대용량 데이터 감지
        const isLargeDataset = nodeCount > this.LARGE_DATASET_NODE_THRESHOLD ||
            edgeCount > this.LARGE_DATASET_EDGE_THRESHOLD;

        if (isLargeDataset) {
            warnings.push(`대용량 데이터셋 감지 (노드: ${nodeCount}, 엣지: ${edgeCount})`);

            if (nodeCount > this.LARGE_DATASET_NODE_THRESHOLD) {
                warnings.push(`노드 수가 권장 임계값을 초과했습니다 (${nodeCount} > ${this.LARGE_DATASET_NODE_THRESHOLD})`);
                recommendations.push('필터를 사용하여 표시할 노드 수를 줄이세요');
            }

            if (edgeCount > this.LARGE_DATASET_EDGE_THRESHOLD) {
                warnings.push(`연결 수가 권장 임계값을 초과했습니다 (${edgeCount} > ${this.LARGE_DATASET_EDGE_THRESHOLD})`);
                recommendations.push('연결 타입 필터를 사용하여 표시할 연결을 제한하세요');
            }
        }

        // 메모리 사용량 예측
        const estimatedMemoryMB = this.estimateMemoryUsage(nodeCount, edgeCount);
        if (estimatedMemoryMB > 100) {
            warnings.push(`높은 메모리 사용량 예상 (약 ${Math.round(estimatedMemoryMB)}MB)`);
            recommendations.push('브라우저 메모리 사용량을 모니터링하세요');
        }

        // 최적화 제안 생성
        const suggestedOptimizations = this.generateOptimizationSuggestions(nodeCount, edgeCount);

        return {
            isValid: !isLargeDataset,
            warnings,
            recommendations,
            suggestedOptimizations
        };
    }

    /**
     * 최적화 제안을 생성합니다.
     */
    static generateOptimizationSuggestions(nodeCount: number, edgeCount: number): OptimizationSuggestions {
        return {
            reduceDetails: nodeCount > 200,
            disableAnimations: nodeCount > 300 || edgeCount > 500,
            useSimpleLayout: nodeCount > 400,
            enableVirtualization: nodeCount > 500,
            limitNodeCount: nodeCount > this.MAX_NODES_OPTIMIZED,
            limitEdgeCount: edgeCount > this.MAX_EDGES_OPTIMIZED
        };
    }

    /**
     * 최적화 제안을 기반으로 자동 최적화를 적용합니다.
     */
    static suggestOptimizations(nodeCount: number, edgeCount: number): OptimizationSuggestions {
        const isLargeDataset = nodeCount > this.LARGE_DATASET_NODE_THRESHOLD ||
            edgeCount > this.LARGE_DATASET_EDGE_THRESHOLD;

        if (!isLargeDataset) {
            return {
                reduceDetails: false,
                disableAnimations: false,
                useSimpleLayout: false,
                enableVirtualization: false,
                limitNodeCount: false,
                limitEdgeCount: false
            };
        }

        return {
            reduceDetails: nodeCount > 200,
            disableAnimations: nodeCount > 300 || edgeCount > 500,
            useSimpleLayout: nodeCount > 400,
            enableVirtualization: nodeCount > 500,
            limitNodeCount: nodeCount > this.MAX_NODES_OPTIMIZED,
            limitEdgeCount: edgeCount > this.MAX_EDGES_OPTIMIZED
        };
    }

    /**
     * 메모리 사용량을 추정합니다.
     */
    static estimateMemoryUsage(nodeCount: number, edgeCount: number): number {
        // 노드당 약 1KB, 엣지당 약 0.5KB 추정
        const nodeMemoryMB = (nodeCount * 1024) / (1024 * 1024);
        const edgeMemoryMB = (edgeCount * 512) / (1024 * 1024);
        const overheadMB = 10; // DOM 오버헤드

        return nodeMemoryMB + edgeMemoryMB + overheadMB;
    }

    /**
     * 현재 메모리 사용량을 확인합니다.
     */
    static checkMemoryUsage(): MemoryUsage {
        if ('memory' in performance) {
            const memory = (performance as any).memory;
            const used = memory.usedJSHeapSize;
            const total = memory.totalJSHeapSize;
            const percentage = used / total;

            return {
                used: used / (1024 * 1024), // MB 단위
                total: total / (1024 * 1024), // MB 단위
                percentage,
                isHigh: percentage > this.MEMORY_WARNING_THRESHOLD
            };
        }

        // 메모리 정보를 사용할 수 없는 경우 기본값 반환
        return {
            used: 0,
            total: 0,
            percentage: 0,
            isHigh: false
        };
    }

    /**
     * 데이터를 청크 단위로 분할합니다.
     */
    static chunkData<T>(data: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < data.length; i += chunkSize) {
            chunks.push(data.slice(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * 노드 데이터를 최적화합니다.
     */
    static optimizeNodes(nodes: NodeData[], maxNodes: number = this.MAX_NODES_OPTIMIZED): NodeData[] {
        if (nodes.length <= maxNodes) {
            return nodes;
        }

        // 중요도 기반 필터링
        const prioritizedNodes = nodes
            .map(node => ({
                ...node,
                priority: this.calculateNodePriority(node)
            }))
            .sort((a, b) => b.priority - a.priority)
            .slice(0, maxNodes)
            .map(({ priority, ...node }) => node);

        console.warn(`노드 수가 제한되었습니다: ${nodes.length} → ${prioritizedNodes.length}`);
        return prioritizedNodes;
    }

    /**
     * 엣지 데이터를 최적화합니다.
     */
    static optimizeEdges(
        edges: EdgeData[],
        nodes: NodeData[],
        maxEdges: number = this.MAX_EDGES_OPTIMIZED
    ): EdgeData[] {
        if (edges.length <= maxEdges) {
            return edges;
        }

        const nodeIds = new Set(nodes.map(n => n.id));

        // 유효한 엣지만 필터링하고 중요도 기반 정렬
        const validEdges = edges
            .filter(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target))
            .map(edge => ({
                ...edge,
                priority: this.calculateEdgePriority(edge)
            }))
            .sort((a, b) => b.priority - a.priority)
            .slice(0, maxEdges)
            .map(({ priority, ...edge }) => edge);

        console.warn(`엣지 수가 제한되었습니다: ${edges.length} → ${validEdges.length}`);
        return validEdges;
    }

    /**
     * 노드의 중요도를 계산합니다.
     */
    private static calculateNodePriority(node: NodeData): number {
        let priority = 0;

        // 노드 타입별 기본 우선순위
        switch (node.type) {
            case 'ACCOUNT':
                priority += 100;
                break;
            case 'REGION':
                priority += 80;
                break;
            case 'VPC':
                priority += 60;
                break;
            case 'SUBNET':
                priority += 40;
                break;
            case 'IGW':
            case 'NAT':
                priority += 50;
                break;
            default:
                priority += 20;
        }

        // 메타데이터 기반 추가 점수
        if (node.metadata.isPublic) {
            priority += 10;
        }

        if (node.metadata.hasConnections) {
            priority += 15;
        }

        return priority;
    }

    /**
     * 엣지의 중요도를 계산합니다.
     */
    private static calculateEdgePriority(edge: EdgeData): number {
        let priority = 0;

        // 연결 타입별 기본 우선순위
        switch (edge.type) {
            case 'VPC_PEERING':
                priority += 80;
                break;
            case 'CLOUDWAN':
                priority += 90;
                break;
            case 'TRANSIT_GATEWAY':
                priority += 85;
                break;
            case 'GATEWAY':
                priority += 70;
                break;
            case 'ROUTE':
                priority += 50;
                break;
            default:
                priority += 30;
        }

        // 상태 기반 추가 점수
        if (edge.metadata.state === 'active') {
            priority += 20;
        }

        // 크로스 계정/리전 연결 우선순위 증가
        if (edge.metadata.isCrossAccount || edge.metadata.isCrossRegion) {
            priority += 25;
        }

        return priority;
    }

    /**
     * 렌더링 성능을 측정합니다.
     */
    static measureRenderPerformance(renderFunction: () => void): PerformanceMetrics {
        const startTime = performance.now();
        const startMemory = this.checkMemoryUsage();

        // 렌더링 실행
        renderFunction();

        const endTime = performance.now();
        const endMemory = this.checkMemoryUsage();
        const renderTime = endTime - startTime;

        return {
            nodeCount: 0, // 호출자가 설정
            edgeCount: 0, // 호출자가 설정
            renderTime,
            memoryUsage: endMemory.percentage,
            isOptimized: renderTime < this.RENDER_TIME_WARNING_THRESHOLD
        };
    }

    /**
     * 가상화를 위한 뷰포트 계산
     */
    static calculateViewport(
        containerWidth: number,
        containerHeight: number,
        zoomLevel: number = 1
    ): { x: number; y: number; width: number; height: number } {
        const margin = 100; // 뷰포트 마진

        return {
            x: -margin / zoomLevel,
            y: -margin / zoomLevel,
            width: (containerWidth + 2 * margin) / zoomLevel,
            height: (containerHeight + 2 * margin) / zoomLevel
        };
    }

    /**
     * 뷰포트 내의 노드만 필터링합니다.
     */
    static filterNodesInViewport(
        nodes: NodeData[],
        viewport: { x: number; y: number; width: number; height: number }
    ): NodeData[] {
        return nodes.filter(node => {
            if (!node.position) return true; // 위치 정보가 없으면 포함

            const { x, y } = node.position;
            return (
                x >= viewport.x &&
                x <= viewport.x + viewport.width &&
                y >= viewport.y &&
                y <= viewport.y + viewport.height
            );
        });
    }

    /**
     * 디바운스된 렌더링 함수를 생성합니다.
     */
    static createDebouncedRenderer(
        renderFunction: () => void,
        delay: number = 100
    ): () => void {
        let timeoutId: NodeJS.Timeout;

        return () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(renderFunction, delay);
        };
    }

    /**
     * 스로틀된 렌더링 함수를 생성합니다.
     */
    static createThrottledRenderer(
        renderFunction: () => void,
        interval: number = 16 // 60fps
    ): () => void {
        let lastCall = 0;

        return () => {
            const now = Date.now();
            if (now - lastCall >= interval) {
                lastCall = now;
                renderFunction();
            }
        };
    }

    /**
     * 성능 모니터링을 시작합니다.
     */
    static startPerformanceMonitoring(
        callback: (metrics: PerformanceMetrics) => void,
        interval: number = 5000
    ): () => void {
        const intervalId = setInterval(() => {
            const memory = this.checkMemoryUsage();

            callback({
                nodeCount: 0, // 실제 값은 호출자가 제공
                edgeCount: 0, // 실제 값은 호출자가 제공
                renderTime: 0, // 실제 값은 호출자가 제공
                memoryUsage: memory.percentage,
                isOptimized: !memory.isHigh
            });
        }, interval);

        return () => clearInterval(intervalId);
    }

    /**
     * 성능 권장사항을 생성합니다.
     */
    static generatePerformanceRecommendations(metrics: PerformanceMetrics): string[] {
        const recommendations: string[] = [];

        if (metrics.renderTime > this.RENDER_TIME_WARNING_THRESHOLD) {
            recommendations.push('렌더링 시간이 오래 걸립니다. 필터를 사용하여 데이터를 줄이세요.');
        }

        if (metrics.memoryUsage > this.MEMORY_WARNING_THRESHOLD) {
            recommendations.push('메모리 사용량이 높습니다. 브라우저를 새로고침하거나 다른 탭을 닫아보세요.');
        }

        if (metrics.nodeCount > this.LARGE_DATASET_NODE_THRESHOLD) {
            recommendations.push('노드 수가 많습니다. 계정이나 리전 필터를 사용하세요.');
        }

        if (metrics.edgeCount > this.LARGE_DATASET_EDGE_THRESHOLD) {
            recommendations.push('연결 수가 많습니다. 연결 타입 필터를 사용하세요.');
        }

        if (recommendations.length === 0) {
            recommendations.push('현재 성능이 양호합니다.');
        }

        return recommendations;
    }
}

export default PerformanceOptimizer;