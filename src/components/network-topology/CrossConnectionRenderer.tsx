/**
 * 크로스 계정/리전 연결 구분 표시 컴포넌트
 * 계정 간, 리전 간 연결을 특별한 시각적 스타일로 표현합니다.
 */

import * as d3 from 'd3';
import type { EdgeData, NodeData } from '@/types/network-topology';

export interface CrossConnectionOptions {
    highlightCrossAccount: boolean;
    highlightCrossRegion: boolean;
    showConnectionLabels: boolean;
    animateCrossConnections: boolean;
}

export class CrossConnectionRenderer {
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private crossConnectionGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
    private options: CrossConnectionOptions;
    private nodeMap: Map<string, NodeData>;

    constructor(
        svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        options: CrossConnectionOptions = {
            highlightCrossAccount: true,
            highlightCrossRegion: true,
            showConnectionLabels: true,
            animateCrossConnections: true
        }
    ) {
        this.svg = svg;
        this.options = options;
        this.nodeMap = new Map();
        this.crossConnectionGroup = svg.select('.cross-connections-group').empty()
            ? svg.append('g').attr('class', 'cross-connections-group')
            : svg.select('.cross-connections-group');

        this.setupCrossConnectionStyles();
    }

    /**
     * 크로스 연결 스타일 설정
     */
    private setupCrossConnectionStyles() {
        const defs = this.svg.select('defs').empty()
            ? this.svg.append('defs')
            : this.svg.select('defs');

        // 크로스 계정 연결 그라디언트
        const crossAccountGradient = defs.selectAll('#cross-account-gradient')
            .data([1])
            .enter()
            .append('linearGradient')
            .attr('id', 'cross-account-gradient')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '100%')
            .attr('y2', '0%');

        crossAccountGradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#ff6b6b')
            .attr('stop-opacity', 0.8);

        crossAccountGradient.append('stop')
            .attr('offset', '50%')
            .attr('stop-color', '#ffd93d')
            .attr('stop-opacity', 0.9);

        crossAccountGradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#ff6b6b')
            .attr('stop-opacity', 0.8);

        // 크로스 리전 연결 그라디언트
        const crossRegionGradient = defs.selectAll('#cross-region-gradient')
            .data([1])
            .enter()
            .append('linearGradient')
            .attr('id', 'cross-region-gradient')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '100%')
            .attr('y2', '0%');

        crossRegionGradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#4ecdc4')
            .attr('stop-opacity', 0.8);

        crossRegionGradient.append('stop')
            .attr('offset', '50%')
            .attr('stop-color', '#44a08d')
            .attr('stop-opacity', 0.9);

        crossRegionGradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#4ecdc4')
            .attr('stop-opacity', 0.8);

        // 크로스 연결 마커
        const crossAccountMarker = defs.selectAll('#cross-account-marker')
            .data([1])
            .enter()
            .append('marker')
            .attr('id', 'cross-account-marker')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 15)
            .attr('refY', 0)
            .attr('markerWidth', 8)
            .attr('markerHeight', 8)
            .attr('orient', 'auto');

        crossAccountMarker.append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#ff6b6b')
            .attr('stroke', '#e55656')
            .attr('stroke-width', 1);

        const crossRegionMarker = defs.selectAll('#cross-region-marker')
            .data([1])
            .enter()
            .append('marker')
            .attr('id', 'cross-region-marker')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 15)
            .attr('refY', 0)
            .attr('markerWidth', 8)
            .attr('markerHeight', 8)
            .attr('orient', 'auto');

        crossRegionMarker.append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#4ecdc4')
            .attr('stroke', '#3bb3ac')
            .attr('stroke-width', 1);

        // 애니메이션용 패턴
        if (this.options.animateCrossConnections) {
            const animatedPattern = defs.selectAll('#cross-connection-pattern')
                .data([1])
                .enter()
                .append('pattern')
                .attr('id', 'cross-connection-pattern')
                .attr('patternUnits', 'userSpaceOnUse')
                .attr('width', 20)
                .attr('height', 4);

            animatedPattern.append('rect')
                .attr('width', 20)
                .attr('height', 4)
                .attr('fill', 'url(#cross-account-gradient)');

            animatedPattern.append('rect')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', 10)
                .attr('height', 4)
                .attr('fill', 'rgba(255,255,255,0.3)');
        }
    }

    /**
     * 노드 맵 업데이트
     */
    updateNodeMap(nodes: NodeData[]) {
        this.nodeMap.clear();
        nodes.forEach(node => {
            this.nodeMap.set(node.id, node);
        });
    }

    /**
     * 크로스 연결 렌더링
     */
    renderCrossConnections(
        edges: EdgeData[],
        nodePositions: Map<string, { x: number; y: number }>
    ) {
        const crossConnections = this.identifyCrossConnections(edges);

        const connectionSelection = this.crossConnectionGroup.selectAll('.cross-connection')
            .data(crossConnections, (d: any) => d.id);

        // 새로운 크로스 연결 추가
        const connectionEnter = connectionSelection.enter()
            .append('g')
            .attr('class', 'cross-connection');

        // 배경 하이라이트
        connectionEnter.append('path')
            .attr('class', 'connection-highlight')
            .attr('fill', 'none')
            .attr('stroke-width', 8)
            .attr('opacity', 0.3);

        // 메인 연결선
        connectionEnter.append('path')
            .attr('class', 'connection-path')
            .attr('fill', 'none')
            .attr('stroke-width', 3);

        // 연결 라벨
        if (this.options.showConnectionLabels) {
            connectionEnter.append('text')
                .attr('class', 'connection-label')
                .attr('text-anchor', 'middle')
                .attr('dy', -8)
                .style('font-size', '11px')
                .style('font-weight', 'bold')
                .style('fill', '#374151')
                .style('text-shadow', '1px 1px 2px rgba(255,255,255,0.8)')
                .style('pointer-events', 'none');

            // 라벨 배경
            connectionEnter.insert('rect', '.connection-label')
                .attr('class', 'label-background')
                .attr('fill', 'rgba(255,255,255,0.9)')
                .attr('stroke', 'rgba(0,0,0,0.1)')
                .attr('stroke-width', 1)
                .attr('rx', 4);
        }

        // 연결 아이콘 (계정/리전 구분)
        connectionEnter.append('g')
            .attr('class', 'connection-icon');

        // 업데이트
        const connectionUpdate = connectionEnter.merge(connectionSelection as any);

        // 경로 업데이트
        connectionUpdate.select('.connection-highlight')
            .attr('d', d => this.getCrossConnectionPath(d, nodePositions))
            .attr('stroke', d => this.getCrossConnectionHighlightColor(d.crossType));

        connectionUpdate.select('.connection-path')
            .attr('d', d => this.getCrossConnectionPath(d, nodePositions))
            .attr('stroke', d => this.getCrossConnectionStroke(d.crossType))
            .attr('stroke-dasharray', d => this.getCrossConnectionDashArray(d.crossType))
            .attr('marker-end', d => `url(#${this.getCrossConnectionMarker(d.crossType)})`);

        // 라벨 업데이트
        if (this.options.showConnectionLabels) {
            connectionUpdate.select('.connection-label')
                .attr('transform', d => {
                    const sourcePos = nodePositions.get(d.source);
                    const targetPos = nodePositions.get(d.target);
                    if (sourcePos && targetPos) {
                        const midX = (sourcePos.x + targetPos.x) / 2;
                        const midY = (sourcePos.y + targetPos.y) / 2;
                        return `translate(${midX}, ${midY})`;
                    }
                    return 'translate(0, 0)';
                })
                .text(d => this.getCrossConnectionLabel(d));

            // 라벨 배경 크기 조정
            connectionUpdate.select('.label-background')
                .attr('transform', d => {
                    const sourcePos = nodePositions.get(d.source);
                    const targetPos = nodePositions.get(d.target);
                    if (sourcePos && targetPos) {
                        const midX = (sourcePos.x + targetPos.x) / 2;
                        const midY = (sourcePos.y + targetPos.y) / 2;
                        const label = this.getCrossConnectionLabel(d);
                        const width = label.length * 7 + 8;
                        return `translate(${midX - width / 2}, ${midY - 18})`;
                    }
                    return 'translate(0, 0)';
                })
                .attr('width', d => this.getCrossConnectionLabel(d).length * 7 + 8)
                .attr('height', 16);
        }

        // 연결 아이콘 업데이트
        this.updateConnectionIcons(connectionUpdate, nodePositions);

        // 애니메이션
        if (this.options.animateCrossConnections) {
            this.animateCrossConnections(connectionUpdate);
        }

        // 제거
        connectionSelection.exit().remove();

        return connectionUpdate;
    }

    /**
     * 크로스 연결 식별
     */
    private identifyCrossConnections(edges: EdgeData[]): Array<EdgeData & { crossType: 'account' | 'region' | 'both' }> {
        return edges.map(edge => {
            const sourceNode = this.nodeMap.get(edge.source);
            const targetNode = this.nodeMap.get(edge.target);

            if (!sourceNode || !targetNode) {
                return { ...edge, crossType: 'region' as const };
            }

            const sourceAccount = this.getNodeAccount(sourceNode);
            const targetAccount = this.getNodeAccount(targetNode);
            const sourceRegion = this.getNodeRegion(sourceNode);
            const targetRegion = this.getNodeRegion(targetNode);

            const isCrossAccount = sourceAccount !== targetAccount;
            const isCrossRegion = sourceRegion !== targetRegion;

            if (isCrossAccount && isCrossRegion) {
                return { ...edge, crossType: 'both' as const };
            } else if (isCrossAccount) {
                return { ...edge, crossType: 'account' as const };
            } else if (isCrossRegion) {
                return { ...edge, crossType: 'region' as const };
            }

            return null;
        }).filter(Boolean) as Array<EdgeData & { crossType: 'account' | 'region' | 'both' }>;
    }

    /**
     * 노드의 계정 정보 추출
     */
    private getNodeAccount(node: NodeData): string {
        return node.metadata.accountId ||
            node.metadata.account ||
            node.parent?.split('-')[0] ||
            'unknown';
    }

    /**
     * 노드의 리전 정보 추출
     */
    private getNodeRegion(node: NodeData): string {
        return node.metadata.region ||
            node.metadata.regionName ||
            node.parent?.split('-')[1] ||
            'unknown';
    }

    /**
     * 크로스 연결 경로 생성
     */
    private getCrossConnectionPath(
        connection: EdgeData & { crossType: string },
        nodePositions: Map<string, { x: number; y: number }>
    ): string {
        const sourcePos = nodePositions.get(connection.source);
        const targetPos = nodePositions.get(connection.target);

        if (!sourcePos || !targetPos) {
            return '';
        }

        const dx = targetPos.x - sourcePos.x;
        const dy = targetPos.y - sourcePos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 크로스 연결은 더 강조된 곡선으로 표시
        const controlPointOffset = Math.min(100, distance * 0.4);
        const midX = (sourcePos.x + targetPos.x) / 2;
        const midY = (sourcePos.y + targetPos.y) / 2;

        // 수직 방향으로 곡선 생성
        const controlX = midX;
        const controlY = midY - controlPointOffset;

        return `M ${sourcePos.x} ${sourcePos.y} Q ${controlX} ${controlY} ${targetPos.x} ${targetPos.y}`;
    }

    /**
     * 크로스 연결 하이라이트 색상
     */
    private getCrossConnectionHighlightColor(crossType: string): string {
        switch (crossType) {
            case 'account': return '#ff6b6b';
            case 'region': return '#4ecdc4';
            case 'both': return '#ffd93d';
            default: return '#9ca3af';
        }
    }

    /**
     * 크로스 연결 스트로크
     */
    private getCrossConnectionStroke(crossType: string): string {
        switch (crossType) {
            case 'account': return 'url(#cross-account-gradient)';
            case 'region': return 'url(#cross-region-gradient)';
            case 'both': return 'url(#cross-account-gradient)';
            default: return '#9ca3af';
        }
    }

    /**
     * 크로스 연결 대시 배열
     */
    private getCrossConnectionDashArray(crossType: string): string {
        switch (crossType) {
            case 'account': return '10,5';
            case 'region': return '15,5,5,5';
            case 'both': return '10,5,5,5,5,5';
            default: return '';
        }
    }

    /**
     * 크로스 연결 마커
     */
    private getCrossConnectionMarker(crossType: string): string {
        switch (crossType) {
            case 'account': return 'cross-account-marker';
            case 'region': return 'cross-region-marker';
            case 'both': return 'cross-account-marker';
            default: return 'arrow-default';
        }
    }

    /**
     * 크로스 연결 라벨
     */
    private getCrossConnectionLabel(connection: EdgeData & { crossType: string }): string {
        switch (connection.crossType) {
            case 'account': return '크로스 계정';
            case 'region': return '크로스 리전';
            case 'both': return '크로스 계정/리전';
            default: return '';
        }
    }

    /**
     * 연결 아이콘 업데이트
     */
    private updateConnectionIcons(
        selection: d3.Selection<d3.BaseType, EdgeData & { crossType: string }, d3.BaseType, unknown>,
        nodePositions: Map<string, { x: number; y: number }>
    ) {
        selection.select('.connection-icon')
            .each(function (d) {
                const iconGroup = d3.select(this);
                iconGroup.selectAll('*').remove();

                const sourcePos = nodePositions.get(d.source);
                const targetPos = nodePositions.get(d.target);

                if (!sourcePos || !targetPos) return;

                const midX = (sourcePos.x + targetPos.x) / 2;
                const midY = (sourcePos.y + targetPos.y) / 2;

                iconGroup.attr('transform', `translate(${midX}, ${midY})`);

                // 배경 원
                iconGroup.append('circle')
                    .attr('r', 12)
                    .attr('fill', 'white')
                    .attr('stroke', d.crossType === 'account' ? '#ff6b6b' : '#4ecdc4')
                    .attr('stroke-width', 2);

                // 아이콘
                if (d.crossType === 'account' || d.crossType === 'both') {
                    // 계정 아이콘 (사용자)
                    iconGroup.append('path')
                        .attr('d', 'M-4,-2 C-4,-4 -2,-6 0,-6 C2,-6 4,-4 4,-2 C4,0 2,2 0,2 C-2,2 -4,0 -4,-2 Z M-6,6 C-6,3 -3,0 0,0 C3,0 6,3 6,6')
                        .attr('fill', '#ff6b6b')
                        .attr('stroke', 'none');
                }

                if (d.crossType === 'region' || d.crossType === 'both') {
                    // 리전 아이콘 (글로브)
                    const offset = d.crossType === 'both' ? 3 : 0;
                    iconGroup.append('circle')
                        .attr('cx', offset)
                        .attr('cy', 0)
                        .attr('r', 5)
                        .attr('fill', 'none')
                        .attr('stroke', '#4ecdc4')
                        .attr('stroke-width', 1.5);

                    iconGroup.append('path')
                        .attr('d', `M ${-3 + offset},0 Q ${0 + offset},-4 ${3 + offset},0 M ${-3 + offset},0 Q ${0 + offset},4 ${3 + offset},0`)
                        .attr('fill', 'none')
                        .attr('stroke', '#4ecdc4')
                        .attr('stroke-width', 1);
                }
            });
    }

    /**
     * 크로스 연결 애니메이션
     */
    private animateCrossConnections(
        selection: d3.Selection<d3.BaseType, EdgeData & { crossType: string }, d3.BaseType, unknown>
    ) {
        selection.select('.connection-path')
            .each(function (d) {
                const path = d3.select(this);

                // 펄스 효과
                path.transition()
                    .duration(2000)
                    .ease(d3.easeLinear)
                    .attr('stroke-width', 5)
                    .transition()
                    .duration(2000)
                    .attr('stroke-width', 3)
                    .on('end', function () {
                        // 애니메이션 반복
                        d3.select(this).call(selection =>
                            selection.select('.connection-path').each(arguments.callee)
                        );
                    });
            });
    }

    /**
     * 옵션 업데이트
     */
    updateOptions(options: Partial<CrossConnectionOptions>) {
        this.options = { ...this.options, ...options };
    }
}