/**
 * 실시간 네트워크 상태 모니터링 컴포넌트
 * 연결 상태, 트래픽 흐름, 성능 지표를 실시간으로 표시합니다.
 */

import React, { useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Activity,
    Wifi,
    WifiOff,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle,
    Clock
} from 'lucide-react';
import type { NodeData, EdgeData } from '@/types/network-topology';

export interface NetworkStatus {
    connectionId: string;
    state: 'active' | 'inactive' | 'degraded' | 'error';
    bandwidth: number; // Mbps
    latency: number; // ms
    packetLoss: number; // percentage
    throughput: number; // percentage of bandwidth
    lastUpdated: Date;
}

export interface NetworkMetrics {
    totalConnections: number;
    activeConnections: number;
    averageBandwidth: number;
    averageLatency: number;
    totalThroughput: number;
    healthScore: number; // 0-100
}

interface NetworkStatusMonitorProps {
    nodes: NodeData[];
    edges: EdgeData[];
    onStatusUpdate?: (status: NetworkStatus[]) => void;
    refreshInterval?: number; // ms
    className?: string;
}

export function NetworkStatusMonitor({
    nodes,
    edges,
    onStatusUpdate,
    refreshInterval = 5000,
    className = ''
}: NetworkStatusMonitorProps) {
    const [networkStatus, setNetworkStatus] = useState<NetworkStatus[]>([]);
    const [metrics, setMetrics] = useState<NetworkMetrics>({
        totalConnections: 0,
        activeConnections: 0,
        averageBandwidth: 0,
        averageLatency: 0,
        totalThroughput: 0,
        healthScore: 100
    });
    const [isMonitoring, setIsMonitoring] = useState(false);

    // 네트워크 상태 시뮬레이션 (실제 환경에서는 실제 메트릭 수집)
    const simulateNetworkStatus = useCallback((): NetworkStatus[] => {
        return edges.map(edge => {
            const baseLatency = Math.random() * 50 + 10; // 10-60ms
            const baseBandwidth = Math.random() * 1000 + 100; // 100-1100 Mbps
            const throughputVariation = Math.random() * 0.4 + 0.6; // 60-100%

            // 상태 결정 로직
            let state: NetworkStatus['state'] = 'active';
            if (Math.random() < 0.05) state = 'error';
            else if (Math.random() < 0.1) state = 'degraded';
            else if (Math.random() < 0.15) state = 'inactive';

            return {
                connectionId: edge.id,
                state,
                bandwidth: baseBandwidth,
                latency: baseLatency,
                packetLoss: Math.random() * 2, // 0-2%
                throughput: throughputVariation * 100,
                lastUpdated: new Date()
            };
        });
    }, [edges]);

    // 메트릭 계산
    const calculateMetrics = useCallback((statuses: NetworkStatus[]): NetworkMetrics => {
        const activeStatuses = statuses.filter(s => s.state === 'active');
        const totalBandwidth = statuses.reduce((sum, s) => sum + s.bandwidth, 0);
        const totalLatency = statuses.reduce((sum, s) => sum + s.latency, 0);
        const totalThroughput = statuses.reduce((sum, s) => sum + (s.bandwidth * s.throughput / 100), 0);

        // 헬스 스코어 계산 (활성 연결 비율, 평균 지연시간, 패킷 손실률 기반)
        const activeRatio = activeStatuses.length / Math.max(statuses.length, 1);
        const avgLatency = totalLatency / Math.max(statuses.length, 1);
        const avgPacketLoss = statuses.reduce((sum, s) => sum + s.packetLoss, 0) / Math.max(statuses.length, 1);

        const latencyScore = Math.max(0, 100 - (avgLatency - 10) * 2); // 10ms 기준
        const packetLossScore = Math.max(0, 100 - avgPacketLoss * 50); // 패킷 손실률
        const healthScore = (activeRatio * 40 + latencyScore * 0.3 + packetLossScore * 0.3);

        return {
            totalConnections: statuses.length,
            activeConnections: activeStatuses.length,
            averageBandwidth: totalBandwidth / Math.max(statuses.length, 1),
            averageLatency: avgLatency,
            totalThroughput,
            healthScore: Math.round(healthScore)
        };
    }, []);

    // 상태 업데이트
    const updateNetworkStatus = useCallback(() => {
        const newStatus = simulateNetworkStatus();
        const newMetrics = calculateMetrics(newStatus);

        setNetworkStatus(newStatus);
        setMetrics(newMetrics);

        onStatusUpdate?.(newStatus);
    }, [simulateNetworkStatus, calculateMetrics, onStatusUpdate]);

    // 모니터링 시작/중지
    useEffect(() => {
        if (!isMonitoring) return;

        const interval = setInterval(updateNetworkStatus, refreshInterval);

        // 초기 업데이트
        updateNetworkStatus();

        return () => clearInterval(interval);
    }, [isMonitoring, refreshInterval, updateNetworkStatus]);

    // 컴포넌트 마운트 시 모니터링 시작
    useEffect(() => {
        setIsMonitoring(true);
        return () => setIsMonitoring(false);
    }, []);

    // 상태별 색상 및 아이콘
    const getStatusInfo = (state: NetworkStatus['state']) => {
        switch (state) {
            case 'active':
                return { color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle };
            case 'inactive':
                return { color: 'text-gray-600', bgColor: 'bg-gray-100', icon: WifiOff };
            case 'degraded':
                return { color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: AlertTriangle };
            case 'error':
                return { color: 'text-red-600', bgColor: 'bg-red-100', icon: WifiOff };
            default:
                return { color: 'text-gray-600', bgColor: 'bg-gray-100', icon: Wifi };
        }
    };

    // 헬스 스코어 색상
    const getHealthScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-600';
        if (score >= 70) return 'text-yellow-600';
        if (score >= 50) return 'text-orange-600';
        return 'text-red-600';
    };

    // 트렌드 아이콘
    const getTrendIcon = (value: number, threshold: number) => {
        if (value > threshold) return <TrendingUp className="h-4 w-4 text-green-600" />;
        return <TrendingDown className="h-4 w-4 text-red-600" />;
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* 전체 메트릭 카드 */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Activity className="h-5 w-5" />
                        네트워크 상태 모니터링
                        <Badge variant={isMonitoring ? "default" : "secondary"}>
                            {isMonitoring ? '실시간' : '중지됨'}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* 전체 연결 수 */}
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold">{metrics.totalConnections}</div>
                            <div className="text-sm text-muted-foreground">전체 연결</div>
                        </div>

                        {/* 활성 연결 수 */}
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{metrics.activeConnections}</div>
                            <div className="text-sm text-muted-foreground">활성 연결</div>
                        </div>

                        {/* 평균 대역폭 */}
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold">{Math.round(metrics.averageBandwidth)}</div>
                            <div className="text-sm text-muted-foreground">평균 대역폭 (Mbps)</div>
                        </div>

                        {/* 헬스 스코어 */}
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className={`text-2xl font-bold ${getHealthScoreColor(metrics.healthScore)}`}>
                                {metrics.healthScore}%
                            </div>
                            <div className="text-sm text-muted-foreground">헬스 스코어</div>
                        </div>
                    </div>

                    {/* 상세 메트릭 */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* 평균 지연시간 */}
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                                <div className="font-medium">평균 지연시간</div>
                                <div className="text-2xl font-bold">{Math.round(metrics.averageLatency)}ms</div>
                            </div>
                            {getTrendIcon(metrics.averageLatency, 30)}
                        </div>

                        {/* 총 처리량 */}
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                                <div className="font-medium">총 처리량</div>
                                <div className="text-2xl font-bold">{Math.round(metrics.totalThroughput)} Mbps</div>
                            </div>
                            {getTrendIcon(metrics.totalThroughput, metrics.averageBandwidth * 0.7)}
                        </div>

                        {/* 마지막 업데이트 */}
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                                <div className="font-medium">마지막 업데이트</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date().toLocaleTimeString('ko-KR')}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 연결별 상태 목록 */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">연결 상태 상세</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {networkStatus.slice(0, 10).map((status) => {
                            const statusInfo = getStatusInfo(status.state);
                            const StatusIcon = statusInfo.icon;

                            return (
                                <div key={status.connectionId} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                                        <div>
                                            <div className="font-medium text-sm">{status.connectionId.substring(0, 20)}...</div>
                                            <div className="text-xs text-muted-foreground">
                                                {Math.round(status.bandwidth)} Mbps • {Math.round(status.latency)}ms
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Badge variant={status.state === 'active' ? 'default' : 'secondary'}>
                                            {status.state}
                                        </Badge>
                                        <div className="w-16">
                                            <Progress
                                                value={status.throughput}
                                                className="h-2"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {networkStatus.length > 10 && (
                            <div className="text-center text-sm text-muted-foreground py-2">
                                그 외 {networkStatus.length - 10}개 연결...
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

/**
 * D3.js 시각화에 실시간 상태를 적용하는 유틸리티 클래스
 */
export class NetworkStatusVisualizer {
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private statusMap: Map<string, NetworkStatus>;
    private animationFrames: Map<string, number>;

    constructor(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
        this.svg = svg;
        this.statusMap = new Map();
        this.animationFrames = new Map();
    }

    /**
     * 네트워크 상태 업데이트
     */
    updateStatus(statuses: NetworkStatus[]) {
        // 기존 애니메이션 정리
        this.animationFrames.forEach(frameId => cancelAnimationFrame(frameId));
        this.animationFrames.clear();

        this.statusMap.clear();
        statuses.forEach(status => {
            this.statusMap.set(status.connectionId, status);
        });

        this.updateEdgeVisuals();
        this.updateNodeVisuals();
    }

    /**
     * 엣지 시각적 업데이트 (요구사항 6.1-6.4 구현)
     */
    private updateEdgeVisuals() {
        this.svg.selectAll('.connection-path')
            .each((d: any) => {
                const status = this.statusMap.get(d.id);
                if (!status) return;

                const element = d3.select(this as any);

                // 요구사항 6.2: 비활성화된 연결 회색 표시
                if (status.state === 'inactive') {
                    element
                        .attr('stroke', '#9ca3af')
                        .attr('stroke-dasharray', '5,5')
                        .attr('opacity', 0.5)
                        .attr('stroke-width', 1);
                } else {
                    // 요구사항 6.1: 연결 상태 실시간 표시
                    const color = this.getStatusColor(status.state);
                    element
                        .attr('stroke', color)
                        .attr('stroke-dasharray', null)
                        .attr('opacity', 1);

                    // 요구사항 6.4: 높은 트래픽 연결 굵은 선 표시
                    const baseWidth = 2;
                    const width = status.throughput > 70 ?
                        Math.max(baseWidth, Math.min(8, status.throughput / 15)) : baseWidth;
                    element.attr('stroke-width', width);

                    // 요구사항 6.3: 트래픽 흐름 방향 화살표 표시 (애니메이션)
                    if (status.state === 'active' && status.throughput > 20) {
                        this.animateTrafficFlow(element, status.throughput, d.id);
                    }
                }
            });
    }

    /**
     * 노드 시각적 업데이트
     */
    private updateNodeVisuals() {
        this.svg.selectAll('.node-group, .gateway-node')
            .each((d: any) => {
                // 노드와 연결된 엣지들의 상태 확인
                const connectedStatuses = Array.from(this.statusMap.values())
                    .filter(status =>
                        status.connectionId.includes(d.id) ||
                        status.connectionId.startsWith(d.id) ||
                        status.connectionId.endsWith(d.id)
                    );

                if (connectedStatuses.length === 0) return;

                const element = d3.select(this as any);
                const activeCount = connectedStatuses.filter(s => s.state === 'active').length;
                const totalCount = connectedStatuses.length;
                const healthRatio = activeCount / totalCount;

                // 노드 테두리 색상으로 상태 표시
                let borderColor = '#10b981'; // 기본 초록색
                if (healthRatio < 0.5) borderColor = '#ef4444'; // 빨간색
                else if (healthRatio < 0.8) borderColor = '#f59e0b'; // 주황색

                element.select('rect, circle')
                    .attr('stroke', borderColor)
                    .attr('stroke-width', 2);

                // 상태 표시기 추가/업데이트
                this.updateNodeStatusIndicator(element, healthRatio);
            });
    }

    /**
     * 노드 상태 표시기 업데이트
     */
    private updateNodeStatusIndicator(
        nodeElement: d3.Selection<d3.BaseType, any, any, any>,
        healthRatio: number
    ) {
        let indicator = nodeElement.select('.status-indicator');

        if (indicator.empty()) {
            indicator = nodeElement.append('circle')
                .attr('class', 'status-indicator')
                .attr('r', 4)
                .attr('cx', 15)
                .attr('cy', -15);
        }

        const color = healthRatio >= 0.8 ? '#10b981' :
            healthRatio >= 0.5 ? '#f59e0b' : '#ef4444';

        indicator.attr('fill', color)
            .attr('stroke', 'white')
            .attr('stroke-width', 1);

        // 상태에 따른 깜빡임 효과
        if (healthRatio < 0.5) {
            indicator.transition()
                .duration(1000)
                .attr('opacity', 0.3)
                .transition()
                .duration(1000)
                .attr('opacity', 1)
                .on('end', () => {
                    // 재귀적으로 깜빡임 계속
                    if (healthRatio < 0.5) {
                        this.updateNodeStatusIndicator(nodeElement, healthRatio);
                    }
                });
        } else {
            indicator.attr('opacity', 1);
        }
    }

    /**
     * 트래픽 플로우 애니메이션 (요구사항 6.3 구현)
     */
    private animateTrafficFlow(
        pathElement: d3.Selection<d3.BaseType, any, any, any>,
        throughput: number,
        connectionId: string
    ) {
        const linkGroup = pathElement.node()?.parentNode;
        if (!linkGroup) return;

        const groupSelection = d3.select(linkGroup);
        let flowDot = groupSelection.select('.flow-dot');

        if (flowDot.empty()) {
            flowDot = groupSelection.append('circle')
                .attr('class', 'flow-dot')
                .attr('r', 2)
                .attr('fill', '#00bcd4')
                .attr('opacity', 0.8);
        }

        const path = pathElement.node() as SVGLineElement;
        if (!path) return;

        const x1 = parseFloat(path.getAttribute('x1') || '0');
        const y1 = parseFloat(path.getAttribute('y1') || '0');
        const x2 = parseFloat(path.getAttribute('x2') || '0');
        const y2 = parseFloat(path.getAttribute('y2') || '0');

        const duration = Math.max(1000, 3000 - (throughput * 20)); // 처리량이 높을수록 빠름

        // 애니메이션 시작
        const animate = () => {
            flowDot.attr('cx', x1).attr('cy', y1).attr('opacity', 0.8);

            flowDot.transition()
                .duration(duration)
                .ease(d3.easeLinear)
                .attr('cx', x2)
                .attr('cy', y2)
                .attr('opacity', 0.2)
                .on('end', () => {
                    // 상태가 여전히 활성이면 애니메이션 반복
                    const currentStatus = this.statusMap.get(connectionId);
                    if (currentStatus?.state === 'active' && currentStatus.throughput > 20) {
                        const frameId = requestAnimationFrame(animate);
                        this.animationFrames.set(connectionId, frameId);
                    }
                });
        };

        animate();
    }

    /**
     * 상태별 색상 반환
     */
    private getStatusColor(state: NetworkStatus['state']): string {
        switch (state) {
            case 'active': return '#10b981';
            case 'inactive': return '#9ca3af';
            case 'degraded': return '#f59e0b';
            case 'error': return '#ef4444';
            default: return '#6b7280';
        }
    }

    /**
     * 정리 함수
     */
    destroy() {
        this.animationFrames.forEach(frameId => cancelAnimationFrame(frameId));
        this.animationFrames.clear();
        this.statusMap.clear();
    }
}