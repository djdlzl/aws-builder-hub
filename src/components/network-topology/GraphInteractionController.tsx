/**
 * 그래프 인터랙션 컨트롤러
 * 줌, 팬, 드래그 등의 그래프 조작 기능을 제공합니다.
 */

import * as d3 from 'd3';
import type { NodeData } from '@/types/network-topology';

export interface InteractionOptions {
    enableZoom: boolean;
    enablePan: boolean;
    enableNodeDrag: boolean;
    zoomExtent: [number, number];
    panBoundary?: {
        left: number;
        right: number;
        top: number;
        bottom: number;
    };
    snapToGrid: boolean;
    gridSize: number;
}

export interface InteractionCallbacks {
    onNodeClick?: (node: NodeData, event: MouseEvent) => void;
    onNodeDoubleClick?: (node: NodeData, event: MouseEvent) => void;
    onNodeDragStart?: (node: NodeData, event: d3.D3DragEvent<any, any, any>) => void;
    onNodeDrag?: (node: NodeData, event: d3.D3DragEvent<any, any, any>) => void;
    onNodeDragEnd?: (node: NodeData, event: d3.D3DragEvent<any, any, any>) => void;
    onZoom?: (transform: d3.ZoomTransform) => void;
    onPan?: (transform: d3.ZoomTransform) => void;
}

export class GraphInteractionController {
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private container: d3.Selection<SVGGElement, unknown, null, undefined>;
    private options: InteractionOptions;
    private callbacks: InteractionCallbacks;
    private zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown>;
    private dragBehavior: d3.DragBehavior<any, any, any>;
    private currentTransform: d3.ZoomTransform;
    private isDragging: boolean;
    private dimensions: { width: number; height: number };

    constructor(
        svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        container: d3.Selection<SVGGElement, unknown, null, undefined>,
        options: Partial<InteractionOptions> = {},
        callbacks: InteractionCallbacks = {}
    ) {
        this.svg = svg;
        this.container = container;
        this.callbacks = callbacks;
        this.isDragging = false;
        this.currentTransform = d3.zoomIdentity;
        this.dimensions = { width: 800, height: 600 };

        this.options = {
            enableZoom: true,
            enablePan: true,
            enableNodeDrag: true,
            zoomExtent: [0.1, 4],
            snapToGrid: false,
            gridSize: 20,
            ...options
        };

        this.setupInteractions();
        this.updateDimensions();
    }

    /**
     * 인터랙션 설정
     */
    private setupInteractions() {
        this.setupZoomAndPan();
        this.setupNodeDrag();
        this.setupClickHandlers();
    }

    /**
     * 줌 및 팬 설정
     */
    private setupZoomAndPan() {
        if (!this.options.enableZoom && !this.options.enablePan) return;

        this.zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent(this.options.zoomExtent)
            .on('zoom', (event) => this.handleZoom(event))
            .on('start', (event) => this.handleZoomStart(event))
            .on('end', (event) => this.handleZoomEnd(event));

        // 줌만 비활성화하고 팬은 활성화하는 경우
        if (!this.options.enableZoom && this.options.enablePan) {
            this.zoomBehavior.scaleExtent([1, 1]);
        }

        // 팬만 비활성화하고 줌은 활성화하는 경우
        if (this.options.enableZoom && !this.options.enablePan) {
            this.zoomBehavior.translateExtent([[0, 0], [0, 0]]);
        }

        // 팬 경계 설정
        if (this.options.panBoundary) {
            const { left, right, top, bottom } = this.options.panBoundary;
            this.zoomBehavior.translateExtent([[left, top], [right, bottom]]);
        }

        this.svg.call(this.zoomBehavior);
    }

    /**
     * 노드 드래그 설정
     */
    private setupNodeDrag() {
        if (!this.options.enableNodeDrag) return;

        this.dragBehavior = d3.drag<any, any, any>()
            .on('start', (event, d) => this.handleDragStart(event, d))
            .on('drag', (event, d) => this.handleDrag(event, d))
            .on('end', (event, d) => this.handleDragEnd(event, d));
    }

    /**
     * 클릭 핸들러 설정
     */
    private setupClickHandlers() {
        // 배경 클릭 시 선택 해제
        this.svg.on('click', (event) => {
            if (event.target === this.svg.node()) {
                this.clearSelection();
            }
        });
    }

    /**
     * 노드에 인터랙션 적용
     */
    applyNodeInteractions(nodeSelection: d3.Selection<any, NodeData, any, any>) {
        // 드래그 적용
        if (this.options.enableNodeDrag) {
            nodeSelection.call(this.dragBehavior);
        }

        // 클릭 이벤트
        nodeSelection
            .on('click', (event, d) => {
                event.stopPropagation();
                this.handleNodeClick(event, d);
            })
            .on('dblclick', (event, d) => {
                event.stopPropagation();
                this.handleNodeDoubleClick(event, d);
            });

        // 커서 스타일
        nodeSelection.style('cursor', this.options.enableNodeDrag ? 'grab' : 'pointer');
    }

    /**
     * 줌 이벤트 처리
     */
    private handleZoom(event: d3.D3ZoomEvent<SVGSVGElement, unknown>) {
        if (this.isDragging) return; // 드래그 중에는 줌 무시

        this.currentTransform = event.transform;
        this.container.attr('transform', this.currentTransform.toString());

        // 콜백 호출
        if (this.callbacks.onZoom) {
            this.callbacks.onZoom(this.currentTransform);
        }

        // 팬 콜백 (이동이 있는 경우)
        if (this.callbacks.onPan && (event.transform.x !== 0 || event.transform.y !== 0)) {
            this.callbacks.onPan(this.currentTransform);
        }
    }

    /**
     * 줌 시작 이벤트 처리
     */
    private handleZoomStart(event: d3.D3ZoomEvent<SVGSVGElement, unknown>) {
        // 줌 시작 시 처리할 로직
    }

    /**
     * 줌 종료 이벤트 처리
     */
    private handleZoomEnd(event: d3.D3ZoomEvent<SVGSVGElement, unknown>) {
        // 줌 종료 시 처리할 로직
    }

    /**
     * 드래그 시작 처리
     */
    private handleDragStart(event: d3.D3DragEvent<any, any, any>, d: NodeData) {
        this.isDragging = true;

        // 줌 비활성화 (드래그 중 충돌 방지)
        this.svg.on('.zoom', null);

        // 노드 스타일 변경
        d3.select(event.sourceEvent.currentTarget)
            .style('cursor', 'grabbing')
            .style('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))');

        // 콜백 호출
        if (this.callbacks.onNodeDragStart) {
            this.callbacks.onNodeDragStart(d, event);
        }
    }

    /**
     * 드래그 처리
     */
    private handleDrag(event: d3.D3DragEvent<any, any, any>, d: NodeData) {
        let newX = event.x;
        let newY = event.y;

        // 그리드 스냅
        if (this.options.snapToGrid) {
            newX = Math.round(newX / this.options.gridSize) * this.options.gridSize;
            newY = Math.round(newY / this.options.gridSize) * this.options.gridSize;
        }

        // 경계 체크
        const bounds = this.getNodeBounds();
        newX = Math.max(bounds.minX, Math.min(bounds.maxX, newX));
        newY = Math.max(bounds.minY, Math.min(bounds.maxY, newY));

        // 노드 위치 업데이트
        d.position = { x: newX, y: newY };

        // 시각적 업데이트
        d3.select(event.sourceEvent.currentTarget)
            .attr('transform', `translate(${newX}, ${newY})`);

        // 연결된 엣지 업데이트
        this.updateConnectedEdges(d);

        // 콜백 호출
        if (this.callbacks.onNodeDrag) {
            this.callbacks.onNodeDrag(d, event);
        }
    }

    /**
     * 드래그 종료 처리
     */
    private handleDragEnd(event: d3.D3DragEvent<any, any, any>, d: NodeData) {
        this.isDragging = false;

        // 줌 다시 활성화
        this.svg.call(this.zoomBehavior);

        // 노드 스타일 복원
        d3.select(event.sourceEvent.currentTarget)
            .style('cursor', 'grab')
            .style('filter', null);

        // 콜백 호출
        if (this.callbacks.onNodeDragEnd) {
            this.callbacks.onNodeDragEnd(d, event);
        }
    }

    /**
     * 노드 클릭 처리
     */
    private handleNodeClick(event: MouseEvent, d: NodeData) {
        if (this.callbacks.onNodeClick) {
            this.callbacks.onNodeClick(d, event);
        }
    }

    /**
     * 노드 더블클릭 처리
     */
    private handleNodeDoubleClick(event: MouseEvent, d: NodeData) {
        // 더블클릭 시 해당 노드로 줌 인
        this.focusOnNode(d);

        if (this.callbacks.onNodeDoubleClick) {
            this.callbacks.onNodeDoubleClick(d, event);
        }
    }

    /**
     * 연결된 엣지 업데이트
     */
    private updateConnectedEdges(node: NodeData) {
        // 해당 노드와 연결된 모든 엣지의 위치 업데이트
        this.svg.selectAll('.edge-path, .connection-path')
            .filter((d: any) => d.source === node.id || d.target === node.id)
            .attr('d', (d: any) => this.calculateEdgePath(d));
    }

    /**
     * 엣지 경로 계산
     */
    private calculateEdgePath(edge: any): string {
        // 실제 구현에서는 EdgeRenderer의 경로 계산 로직을 사용
        const sourceNode = this.getNodeById(edge.source);
        const targetNode = this.getNodeById(edge.target);

        if (!sourceNode?.position || !targetNode?.position) {
            return '';
        }

        return `M ${sourceNode.position.x} ${sourceNode.position.y} L ${targetNode.position.x} ${targetNode.position.y}`;
    }

    /**
     * ID로 노드 찾기
     */
    private getNodeById(nodeId: string): NodeData | undefined {
        // 실제 구현에서는 노드 맵을 사용
        return undefined;
    }

    /**
     * 노드 경계 계산
     */
    private getNodeBounds() {
        const margin = 50;
        return {
            minX: margin,
            maxX: this.dimensions.width - margin,
            minY: margin,
            maxY: this.dimensions.height - margin
        };
    }

    /**
     * 특정 노드에 포커스
     */
    focusOnNode(node: NodeData, duration: number = 750) {
        if (!node.position) return;

        const { width, height } = this.dimensions;
        const scale = Math.min(2, this.options.zoomExtent[1]);

        const transform = d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(scale)
            .translate(-node.position.x, -node.position.y);

        this.svg.transition()
            .duration(duration)
            .call(this.zoomBehavior.transform, transform);
    }

    /**
     * 전체 그래프에 맞춤
     */
    fitToContent(nodes: NodeData[], padding: number = 50, duration: number = 750) {
        if (nodes.length === 0) return;

        const positions = nodes
            .filter(node => node.position)
            .map(node => node.position!);

        if (positions.length === 0) return;

        const xExtent = d3.extent(positions, d => d.x) as [number, number];
        const yExtent = d3.extent(positions, d => d.y) as [number, number];

        const contentWidth = xExtent[1] - xExtent[0];
        const contentHeight = yExtent[1] - yExtent[0];

        const { width, height } = this.dimensions;
        const scale = Math.min(
            (width - padding * 2) / contentWidth,
            (height - padding * 2) / contentHeight,
            this.options.zoomExtent[1]
        );

        const centerX = (xExtent[0] + xExtent[1]) / 2;
        const centerY = (yExtent[0] + yExtent[1]) / 2;

        const transform = d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(scale)
            .translate(-centerX, -centerY);

        this.svg.transition()
            .duration(duration)
            .call(this.zoomBehavior.transform, transform);
    }

    /**
     * 줌 인
     */
    zoomIn(factor: number = 1.5, duration: number = 300) {
        const newScale = Math.min(
            this.currentTransform.k * factor,
            this.options.zoomExtent[1]
        );

        const transform = this.currentTransform.scale(newScale / this.currentTransform.k);

        this.svg.transition()
            .duration(duration)
            .call(this.zoomBehavior.transform, transform);
    }

    /**
     * 줌 아웃
     */
    zoomOut(factor: number = 1.5, duration: number = 300) {
        const newScale = Math.max(
            this.currentTransform.k / factor,
            this.options.zoomExtent[0]
        );

        const transform = this.currentTransform.scale(newScale / this.currentTransform.k);

        this.svg.transition()
            .duration(duration)
            .call(this.zoomBehavior.transform, transform);
    }

    /**
     * 뷰 리셋
     */
    resetView(duration: number = 500) {
        this.svg.transition()
            .duration(duration)
            .call(this.zoomBehavior.transform, d3.zoomIdentity);
    }

    /**
     * 선택 해제
     */
    private clearSelection() {
        this.svg.selectAll('.node-group, .gateway-node')
            .classed('selected', false);
    }

    /**
     * 차원 업데이트
     */
    updateDimensions() {
        const svgNode = this.svg.node();
        if (svgNode) {
            const rect = svgNode.getBoundingClientRect();
            this.dimensions = {
                width: rect.width || 800,
                height: rect.height || 600
            };
        }
    }

    /**
     * 현재 변환 상태 반환
     */
    getCurrentTransform(): d3.ZoomTransform {
        return this.currentTransform;
    }

    /**
     * 옵션 업데이트
     */
    updateOptions(options: Partial<InteractionOptions>) {
        this.options = { ...this.options, ...options };
        this.setupInteractions(); // 인터랙션 재설정
    }

    /**
     * 콜백 업데이트
     */
    updateCallbacks(callbacks: Partial<InteractionCallbacks>) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * 정리
     */
    destroy() {
        this.svg.on('.zoom', null);
        this.svg.selectAll('*').on('.drag', null);
    }
}