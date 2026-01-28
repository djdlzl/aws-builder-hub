/**
 * 네트워크 토폴로지 성능 검증 스크립트
 * 브라우저 환경에서 실행할 수 있는 간단한 성능 테스트
 */

// 성능 최적화 유틸리티 (간소화된 버전)
class PerformanceValidator {
    static validateDataSize(nodeCount, edgeCount) {
        const warnings = [];
        const recommendations = [];

        const LARGE_DATASET_NODE_THRESHOLD = 500;
        const LARGE_DATASET_EDGE_THRESHOLD = 1000;

        if (nodeCount > LARGE_DATASET_NODE_THRESHOLD) {
            warnings.push(`노드 수가 권장 임계값을 초과했습니다 (${nodeCount} > ${LARGE_DATASET_NODE_THRESHOLD})`);
            recommendations.push('필터를 사용하여 표시할 노드 수를 줄이세요');
        }

        if (edgeCount > LARGE_DATASET_EDGE_THRESHOLD) {
            warnings.push(`연결 수가 권장 임계값을 초과했습니다 (${edgeCount} > ${LARGE_DATASET_EDGE_THRESHOLD})`);
            recommendations.push('연결 타입 필터를 사용하여 표시할 연결을 제한하세요');
        }

        return {
            isValid: warnings.length === 0,
            warnings,
            recommendations
        };
    }

    static estimateMemoryUsage(nodeCount, edgeCount) {
        // 노드당 약 1KB, 엣지당 약 0.5KB 추정
        const nodeMemoryMB = (nodeCount * 1024) / (1024 * 1024);
        const edgeMemoryMB = (edgeCount * 512) / (1024 * 1024);
        const overheadMB = 10; // DOM 오버헤드

        return nodeMemoryMB + edgeMemoryMB + overheadMB;
    }

    static chunkData(data, chunkSize) {
        const chunks = [];
        for (let i = 0; i < data.length; i += chunkSize) {
            chunks.push(data.slice(i, i + chunkSize));
        }
        return chunks;
    }

    static optimizeNodes(nodes, maxNodes = 300) {
        if (nodes.length <= maxNodes) {
            return nodes;
        }

        // 중요도 기반 필터링 (간소화)
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

    static calculateNodePriority(node) {
        let priority = 0;

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

        return priority;
    }

    static measureRenderPerformance(renderFunction) {
        const startTime = performance.now();

        renderFunction();

        const endTime = performance.now();
        const renderTime = endTime - startTime;

        return {
            renderTime,
            isOptimized: renderTime < 3000 // 3초 이내
        };
    }
}

// 테스트 데이터 생성
function generateTestData(nodeCount, edgeCount) {
    const nodes = Array.from({ length: nodeCount }, (_, i) => ({
        id: `node-${i}`,
        type: ['ACCOUNT', 'REGION', 'VPC', 'SUBNET', 'IGW', 'NAT'][i % 6],
        label: `Node ${i}`,
        metadata: { index: i },
        position: { x: i * 10, y: i * 10 },
        parent: i > 0 ? `node-${Math.floor(i / 2)}` : null
    }));

    const edges = Array.from({ length: edgeCount }, (_, i) => ({
        id: `edge-${i}`,
        source: `node-${i % nodeCount}`,
        target: `node-${(i + 1) % nodeCount}`,
        type: ['VPC_PEERING', 'CLOUDWAN', 'GATEWAY', 'ROUTE', 'TRANSIT_GATEWAY'][i % 5],
        metadata: { state: 'active' }
    }));

    return { nodes, edges };
}

// 성능 테스트 실행
function runPerformanceTests() {
    console.log('🚀 네트워크 토폴로지 성능 검증 시작');
    console.log('=====================================');

    // 테스트 케이스들
    const testCases = [
        { name: '소규모 데이터셋', nodes: 100, edges: 200 },
        { name: '중간 규모 데이터셋', nodes: 300, edges: 600 },
        { name: '대규모 데이터셋', nodes: 600, edges: 1200 },
        { name: '초대규모 데이터셋', nodes: 1000, edges: 2000 }
    ];

    testCases.forEach(testCase => {
        console.log(`\n📊 ${testCase.name} 테스트`);
        console.log(`노드: ${testCase.nodes}개, 엣지: ${testCase.edges}개`);

        // 데이터 크기 검증
        const validation = PerformanceValidator.validateDataSize(testCase.nodes, testCase.edges);
        console.log(`✅ 데이터 유효성: ${validation.isValid ? '통과' : '경고'}`);

        if (validation.warnings.length > 0) {
            console.log('⚠️  경고사항:');
            validation.warnings.forEach(warning => console.log(`   - ${warning}`));
        }

        if (validation.recommendations.length > 0) {
            console.log('💡 권장사항:');
            validation.recommendations.forEach(rec => console.log(`   - ${rec}`));
        }

        // 메모리 사용량 추정
        const estimatedMemory = PerformanceValidator.estimateMemoryUsage(testCase.nodes, testCase.edges);
        console.log(`💾 예상 메모리 사용량: ${estimatedMemory.toFixed(2)}MB`);

        // 데이터 생성 및 최적화 테스트
        const testData = generateTestData(testCase.nodes, testCase.edges);

        // 청킹 테스트
        const nodeChunks = PerformanceValidator.chunkData(testData.nodes, 50);
        const edgeChunks = PerformanceValidator.chunkData(testData.edges, 50);
        console.log(`📦 청킹 결과: 노드 ${nodeChunks.length}개 청크, 엣지 ${edgeChunks.length}개 청크`);

        // 노드 최적화 테스트
        const optimizedNodes = PerformanceValidator.optimizeNodes(testData.nodes);
        if (optimizedNodes.length < testData.nodes.length) {
            console.log(`🔧 노드 최적화: ${testData.nodes.length} → ${optimizedNodes.length}`);
        }

        // 렌더링 성능 시뮬레이션
        const renderMetrics = PerformanceValidator.measureRenderPerformance(() => {
            // 렌더링 시뮬레이션 (CPU 집약적 작업)
            for (let i = 0; i < testCase.nodes * 10; i++) {
                Math.random();
            }
        });

        console.log(`⏱️  렌더링 시간: ${renderMetrics.renderTime.toFixed(2)}ms`);
        console.log(`🎯 성능 상태: ${renderMetrics.isOptimized ? '최적화됨' : '최적화 필요'}`);
    });

    console.log('\n🎉 성능 검증 완료');
    console.log('=====================================');

    // 종합 권장사항
    console.log('\n📋 종합 권장사항:');
    console.log('1. 500개 이상의 노드가 있는 경우 필터링 사용');
    console.log('2. 1000개 이상의 연결이 있는 경우 연결 타입 필터 적용');
    console.log('3. 100MB 이상의 메모리 사용이 예상되는 경우 청킹 처리');
    console.log('4. 렌더링 시간이 3초를 초과하는 경우 최적화 모드 활성화');
    console.log('5. 대용량 데이터의 경우 가상화 기법 적용 고려');
}

// 브라우저 환경에서 실행
if (typeof window !== 'undefined') {
    // 브라우저에서 실행
    window.runNetworkTopologyPerformanceTests = runPerformanceTests;
    console.log('브라우저 콘솔에서 runNetworkTopologyPerformanceTests() 함수를 실행하세요.');
} else {
    // Node.js 환경에서 실행
    runPerformanceTests();
}

// 모듈 내보내기 (Node.js 환경)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PerformanceValidator,
        generateTestData,
        runPerformanceTests
    };
}