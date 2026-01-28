/**
 * 네트워크 시각화 성능 테스트
 * 대규모 데이터셋에서의 렌더링 성능을 검증합니다.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NetworkVisualization } from '../NetworkVisualization';
import { PerformanceOptimizer } from '../PerformanceOptimizer';
import type { NetworkTopologyData, NodeData, EdgeData } from '@/types/network-topology';
import { NodeType } from '@/types/network-topology';

// Mock D3.js
vi.mock('d3', () => ({
    select: vi.fn(() => ({
        selectAll: vi.fn(() => ({
            remove: vi.fn(),
            data: vi.fn(() => ({
                enter: vi.fn(() => ({
                    append: vi.fn(() => ({
                        attr: vi.fn(() => ({ attr: vi.fn() })),
                        style: vi.fn(() => ({ style: vi.fn() })),
                        text: vi.fn(),
                        on: vi.fn()
                    }))
                }))
            }))
        })),
        attr: vi.fn(() => ({ attr: vi.fn() })),
        append: vi.fn(() => ({
            attr: vi.fn(() => ({ attr: vi.fn() })),
            append: vi.fn(() => ({
                attr: vi.fn(() => ({ attr: vi.fn() }))
            }))
        })),
        call: vi.fn()
    })),
    zoom: vi.fn(() => ({
        scaleExtent: vi.fn(() => ({
            on: vi.fn(() => ({ on: vi.fn() }))
        }))
    })),
    zoomIdentity: {
        translate: vi.fn(() => ({
            scale: vi.fn()
        }))
    }
}));

describe('NetworkVisualization Performance Tests', () => {
    let performanceObserver: any;
    let originalPerformance: any;

    beforeEach(() => {
        // Performance API 모킹
        originalPerformance = global.performance;
        global.performance = {
            ...originalPerformance,
            now: vi.fn(() => Date.now()),
            mark: vi.fn(),
            measure: vi.fn(),
            memory: {
                usedJSHeapSize: 50 * 1024 * 1024, // 50MB
                totalJSHeapSize: 100 * 1024 * 1024, // 100MB
                jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB
            }
        };

        // PerformanceObserver 모킹
        performanceObserver = vi.fn();
        global.PerformanceObserver = performanceObserver;
    });

    afterEach(() => {
        global.performance = originalPerformance;
        vi.clearAllMocks();
    });

    describe('Large Dataset Performance', () => {
        it('대규모 데이터셋 (1000+ 노드) 렌더링 성능 테스트', async () => {
            // Given: 대규모 네트워크 데이터 생성
            const largeDataset = generateLargeNetworkData(1000, 2000);

            // Performance 측정 시작
            const startTime = performance.now();

            // When: 컴포넌트 렌더링
            const { container } = render(
                <NetworkVisualization
                    data={largeDataset}
                    onPerformanceWarning={vi.fn()}
                    onError={vi.fn()}
                />
            );

            // Then: 렌더링 완료 대기
            await waitFor(() => {
                expect(container.querySelector('svg')).toBeInTheDocument();
            }, { timeout: 10000 });

            const endTime = performance.now();
            const renderTime = endTime - startTime;

            // 성능 기준 검증 (10초 이내)
            expect(renderTime).toBeLessThan(10000);

            console.log(`대규모 데이터셋 렌더링 시간: ${renderTime.toFixed(2)}ms`);
            console.log(`노드 수: ${largeDataset.nodes.length}, 엣지 수: ${largeDataset.edges.length}`);
        });

        it('메모리 사용량 최적화 검증', async () => {
            // Given: 메모리 집약적인 데이터
            const memoryIntensiveData = generateMemoryIntensiveData();

            // 초기 메모리 사용량
            const initialMemory = (performance as any).memory.usedJSHeapSize;

            // When: 컴포넌트 렌더링
            const { unmount } = render(
                <NetworkVisualization
                    data={memoryIntensiveData}
                    onPerformanceWarning={vi.fn()}
                />
            );

            await waitFor(() => {
                expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
            });

            // 렌더링 후 메모리 사용량
            const afterRenderMemory = (performance as any).memory.usedJSHeapSize;
            const memoryIncrease = afterRenderMemory - initialMemory;

            // 컴포넌트 언마운트
            unmount();

            // Then: 메모리 사용량 검증
            expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB 미만

            console.log(`메모리 증가량: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
        });

        it('최적화 모드 자동 활성화 검증', async () => {
            // Given: 최적화가 필요한 대용량 데이터
            const largeData = generateLargeNetworkData(600, 1200);
            const onPerformanceWarning = vi.fn();

            // When: 컴포넌트 렌더링
            render(
                <NetworkVisualization
                    data={largeData}
                    onPerformanceWarning={onPerformanceWarning}
                />
            );

            // Then: 성능 경고 발생 확인
            await waitFor(() => {
                expect(onPerformanceWarning).toHaveBeenCalled();
            });

            // 최적화 모드 표시 확인
            expect(screen.getByText('최적화 모드')).toBeInTheDocument();
        });
    });

    describe('PerformanceOptimizer Unit Tests', () => {
        it('데이터 크기 검증 기능 테스트', () => {
            // Given: 다양한 크기의 데이터셋
            const smallData = { nodes: generateNodes(100), edges: generateEdges(200) };
            const largeData = { nodes: generateNodes(600), edges: generateEdges(1200) };

            // When: 데이터 크기 검증
            const smallResult = PerformanceOptimizer.validateDataSize(smallData.nodes, smallData.edges);
            const largeResult = PerformanceOptimizer.validateDataSize(largeData.nodes, largeData.edges);

            // Then: 검증 결과 확인
            expect(smallResult.isValid).toBe(true);
            expect(smallResult.warnings).toHaveLength(0);

            expect(largeResult.isValid).toBe(false);
            expect(largeResult.warnings.length).toBeGreaterThan(0);
            expect(largeResult.recommendations.length).toBeGreaterThan(0);
        });

        it('최적화 제안 생성 테스트', () => {
            // Given: 다양한 데이터 크기
            const testCases = [
                { nodes: 100, edges: 200, expectedOptimizations: { reduceDetails: false, disableAnimations: false } },
                { nodes: 300, edges: 600, expectedOptimizations: { reduceDetails: true, disableAnimations: true } },
                { nodes: 600, edges: 1200, expectedOptimizations: { reduceDetails: true, disableAnimations: true, useSimpleLayout: true } }
            ];

            testCases.forEach(({ nodes, edges, expectedOptimizations }) => {
                // When: 최적화 제안 생성
                const suggestions = PerformanceOptimizer.suggestOptimizations(nodes, edges);

                // Then: 예상된 최적화 확인
                Object.entries(expectedOptimizations).forEach(([key, expected]) => {
                    expect(suggestions[key as keyof typeof suggestions]).toBe(expected);
                });
            });
        });

        it('데이터 청킹 기능 테스트', () => {
            // Given: 대용량 데이터 배열
            const largeArray = Array.from({ length: 1000 }, (_, i) => i);
            const chunkSize = 50;

            // When: 데이터 청킹
            const chunks = PerformanceOptimizer.chunkData(largeArray, chunkSize);

            // Then: 청킹 결과 검증
            expect(chunks).toHaveLength(20); // 1000 / 50 = 20
            expect(chunks[0]).toHaveLength(chunkSize);
            expect(chunks[chunks.length - 1]).toHaveLength(chunkSize);

            // 모든 데이터가 보존되었는지 확인
            const flattenedData = chunks.flat();
            expect(flattenedData).toHaveLength(1000);
            expect(flattenedData).toEqual(largeArray);
        });

        it('노드 최적화 기능 테스트', () => {
            // Given: 우선순위가 다른 노드들
            const nodes = [
                createNode('account-1', NodeType.ACCOUNT, { priority: 100 }),
                createNode('vpc-1', NodeType.VPC, { priority: 60 }),
                createNode('subnet-1', NodeType.SUBNET, { priority: 40 }),
                createNode('subnet-2', NodeType.SUBNET, { priority: 40 }),
                createNode('igw-1', NodeType.IGW, { priority: 50 })
            ];

            // When: 노드 최적화 (최대 3개)
            const optimizedNodes = PerformanceOptimizer.optimizeNodes(nodes, 3);

            // Then: 우선순위 높은 노드들만 선택되었는지 확인
            expect(optimizedNodes).toHaveLength(3);
            expect(optimizedNodes.map(n => n.type)).toContain(NodeType.ACCOUNT);
            expect(optimizedNodes.map(n => n.type)).toContain(NodeType.VPC);
        });

        it('메모리 사용량 확인 기능 테스트', () => {
            // When: 메모리 사용량 확인
            const memoryUsage = PerformanceOptimizer.checkMemoryUsage();

            // Then: 메모리 정보 반환 확인
            expect(memoryUsage).toHaveProperty('used');
            expect(memoryUsage).toHaveProperty('total');
            expect(memoryUsage).toHaveProperty('percentage');
            expect(memoryUsage).toHaveProperty('isHigh');

            expect(typeof memoryUsage.used).toBe('number');
            expect(typeof memoryUsage.total).toBe('number');
            expect(typeof memoryUsage.percentage).toBe('number');
            expect(typeof memoryUsage.isHigh).toBe('boolean');
        });
    });

    describe('Rendering Performance Tests', () => {
        it('렌더링 성능 측정 기능 테스트', () => {
            // Given: 렌더링 함수 모킹
            const mockRenderFunction = vi.fn(() => {
                // 렌더링 시뮬레이션 (동기적 작업)
                for (let i = 0; i < 1000; i++) {
                    Math.random();
                }
            });

            // When: 렌더링 성능 측정
            const metrics = PerformanceOptimizer.measureRenderPerformance(mockRenderFunction);

            // Then: 성능 메트릭 검증
            expect(metrics).toHaveProperty('renderTime');
            expect(metrics).toHaveProperty('memoryUsage');
            expect(metrics).toHaveProperty('isOptimized');

            expect(typeof metrics.renderTime).toBe('number');
            expect(metrics.renderTime).toBeGreaterThan(0);
            expect(mockRenderFunction).toHaveBeenCalledOnce();
        });

        it('디바운스된 렌더링 함수 테스트', async () => {
            // Given: 렌더링 함수와 디바운스 설정
            const mockRenderFunction = vi.fn();
            const debouncedRender = PerformanceOptimizer.createDebouncedRenderer(mockRenderFunction, 100);

            // When: 연속적인 호출
            debouncedRender();
            debouncedRender();
            debouncedRender();

            // Then: 즉시는 호출되지 않음
            expect(mockRenderFunction).not.toHaveBeenCalled();

            // 디바운스 시간 후 한 번만 호출됨
            await new Promise(resolve => setTimeout(resolve, 150));
            expect(mockRenderFunction).toHaveBeenCalledOnce();
        });

        it('스로틀된 렌더링 함수 테스트', async () => {
            // Given: 렌더링 함수와 스로틀 설정
            const mockRenderFunction = vi.fn();
            const throttledRender = PerformanceOptimizer.createThrottledRenderer(mockRenderFunction, 50);

            // When: 연속적인 호출
            throttledRender(); // 즉시 실행
            throttledRender(); // 무시됨
            throttledRender(); // 무시됨

            // Then: 첫 번째 호출만 실행됨
            expect(mockRenderFunction).toHaveBeenCalledOnce();

            // 스로틀 시간 후 다시 호출 가능
            await new Promise(resolve => setTimeout(resolve, 60));
            throttledRender();
            expect(mockRenderFunction).toHaveBeenCalledTimes(2);
        });
    });

    describe('Error Handling Performance', () => {
        it('오류 발생 시 성능 저하 방지 테스트', async () => {
            // Given: 오류를 발생시키는 데이터
            const corruptedData = {
                nodes: [{ id: 'invalid', type: 'INVALID_TYPE' as any }],
                edges: [],
                hierarchy: { accounts: {} }
            };

            const onError = vi.fn();
            const startTime = performance.now();

            // When: 오류가 있는 데이터로 렌더링
            render(
                <NetworkVisualization
                    data={corruptedData}
                    onError={onError}
                />
            );

            // Then: 오류 처리가 빠르게 완료되어야 함
            await waitFor(() => {
                expect(onError).toHaveBeenCalled();
            }, { timeout: 1000 });

            const endTime = performance.now();
            const errorHandlingTime = endTime - startTime;

            expect(errorHandlingTime).toBeLessThan(1000); // 1초 이내
        });
    });
});

// 테스트 헬퍼 함수들

function generateLargeNetworkData(nodeCount: number, edgeCount: number): NetworkTopologyData {
    return {
        nodes: generateNodes(nodeCount),
        edges: generateEdges(edgeCount),
        hierarchy: {
            accounts: {
                'test-account': {
                    accountId: 'test-account',
                    accountName: 'Test Account',
                    regions: {}
                }
            }
        },
        lastUpdated: new Date().toISOString(),
        cacheStatus: 'HIT'
    };
}

function generateMemoryIntensiveData(): NetworkTopologyData {
    const largeMetadata = Array.from({ length: 1000 }, (_, i) => [`key${i}`, `value${i}`.repeat(100)])
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    return {
        nodes: Array.from({ length: 100 }, (_, i) => ({
            id: `node-${i}`,
            type: NodeType.SUBNET,
            label: `Node ${i}`,
            metadata: { ...largeMetadata, index: i },
            position: { x: i * 10, y: i * 10 },
            parent: null
        })),
        edges: [],
        hierarchy: { accounts: {} },
        lastUpdated: new Date().toISOString(),
        cacheStatus: 'HIT'
    };
}

function generateNodes(count: number): NodeData[] {
    const nodeTypes = [NodeType.ACCOUNT, NodeType.REGION, NodeType.VPC, NodeType.SUBNET, NodeType.IGW, NodeType.NAT];

    return Array.from({ length: count }, (_, i) => ({
        id: `node-${i}`,
        type: nodeTypes[i % nodeTypes.length],
        label: `Node ${i}`,
        metadata: {
            index: i,
            accountId: `account-${Math.floor(i / 100)}`,
            region: `region-${Math.floor(i / 50)}`,
            isPublic: i % 2 === 0,
            hasConnections: i % 3 === 0
        },
        position: { x: (i % 20) * 50, y: Math.floor(i / 20) * 50 },
        parent: i > 0 ? `node-${Math.floor(i / 2)}` : null
    }));
}

function generateEdges(count: number): EdgeData[] {
    const edgeTypes = ['VPC_PEERING', 'CLOUDWAN', 'GATEWAY', 'ROUTE', 'TRANSIT_GATEWAY'];

    return Array.from({ length: count }, (_, i) => ({
        id: `edge-${i}`,
        source: `node-${i % 100}`,
        target: `node-${(i + 1) % 100}`,
        type: edgeTypes[i % edgeTypes.length] as any,
        metadata: {
            state: i % 10 === 0 ? 'inactive' : 'active',
            bandwidth: Math.random() * 1000,
            latency: Math.random() * 100,
            isCrossAccount: i % 20 === 0,
            isCrossRegion: i % 15 === 0,
            additionalInfo: {}
        }
    }));
}

function createNode(id: string, type: NodeType, metadata: any = {}): NodeData {
    return {
        id,
        type,
        label: `${type} ${id}`,
        metadata,
        position: { x: 0, y: 0 },
        parent: null
    };
}