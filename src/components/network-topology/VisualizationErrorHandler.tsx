/**
 * 시각화 오류 처리 컴포넌트
 * 대용량 데이터, 메모리 부족, 렌더링 실패 등을 처리합니다.
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Zap, MemoryStick, Database } from 'lucide-react';

interface VisualizationErrorBoundaryState {
    hasError: boolean;
    errorType: 'memory' | 'performance' | 'rendering' | 'data' | 'unknown';
    errorMessage: string;
    errorDetails?: string;
    retryCount: number;
}

interface VisualizationErrorBoundaryProps {
    children: ReactNode;
    onRetry?: () => void;
    onFallback?: () => void;
    maxRetries?: number;
    performanceThreshold?: number;
    memoryThreshold?: number;
}

/**
 * 시각화 오류 경계 컴포넌트
 */
export class VisualizationErrorBoundary extends Component<
    VisualizationErrorBoundaryProps,
    VisualizationErrorBoundaryState
> {
    private performanceObserver?: PerformanceObserver;
    private memoryCheckInterval?: NodeJS.Timeout;

    constructor(props: VisualizationErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            errorType: 'unknown',
            errorMessage: '',
            retryCount: 0
        };
    }

    static getDerivedStateFromError(error: Error): Partial<VisualizationErrorBoundaryState> {
        // 오류 타입 분류
        const errorType = classifyError(error);

        return {
            hasError: true,
            errorType,
            errorMessage: error.message,
            errorDetails: error.stack
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('시각화 오류 발생:', error, errorInfo);

        // 오류 리포팅 (실제 환경에서는 모니터링 서비스로 전송)
        this.reportError(error, errorInfo);
    }

    componentDidMount() {
        this.setupPerformanceMonitoring();
        this.setupMemoryMonitoring();
    }

    componentWillUnmount() {
        this.cleanupMonitoring();
    }

    /**
     * 성능 모니터링 설정
     */
    private setupPerformanceMonitoring() {
        if ('PerformanceObserver' in window) {
            this.performanceObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();

                entries.forEach((entry) => {
                    // 렌더링 성능 임계값 확인
                    if (entry.duration > (this.props.performanceThreshold || 5000)) {
                        this.handlePerformanceIssue(entry);
                    }
                });
            });

            try {
                this.performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
            } catch (e) {
                console.warn('성능 모니터링 설정 실패:', e);
            }
        }
    }

    /**
     * 메모리 모니터링 설정
     */
    private setupMemoryMonitoring() {
        if ('memory' in performance) {
            this.memoryCheckInterval = setInterval(() => {
                const memory = (performance as any).memory;
                const memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

                // 메모리 사용률이 임계값을 초과하면 경고
                if (memoryUsage > (this.props.memoryThreshold || 0.8)) {
                    this.handleMemoryIssue(memoryUsage);
                }
            }, 5000);
        }
    }

    /**
     * 모니터링 정리
     */
    private cleanupMonitoring() {
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }

        if (this.memoryCheckInterval) {
            clearInterval(this.memoryCheckInterval);
        }
    }

    /**
     * 성능 문제 처리
     */
    private handlePerformanceIssue(entry: PerformanceEntry) {
        console.warn('성능 문제 감지:', entry);

        this.setState({
            hasError: true,
            errorType: 'performance',
            errorMessage: `렌더링 성능이 저하되었습니다 (${Math.round(entry.duration)}ms)`,
            errorDetails: `성능 임계값(${this.props.performanceThreshold || 5000}ms)을 초과했습니다.`
        });
    }

    /**
     * 메모리 문제 처리
     */
    private handleMemoryIssue(memoryUsage: number) {
        console.warn('메모리 사용량 높음:', memoryUsage);

        this.setState({
            hasError: true,
            errorType: 'memory',
            errorMessage: `메모리 사용량이 높습니다 (${Math.round(memoryUsage * 100)}%)`,
            errorDetails: '브라우저 메모리 부족으로 인해 시각화 성능이 저하될 수 있습니다.'
        });
    }

    /**
     * 오류 리포팅
     */
    private reportError(error: Error, errorInfo: React.ErrorInfo) {
        // 실제 환경에서는 오류 모니터링 서비스로 전송
        const errorReport = {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        console.error('오류 리포트:', errorReport);
    }

    /**
     * 재시도 처리
     */
    private handleRetry = () => {
        const { maxRetries = 3 } = this.props;

        if (this.state.retryCount < maxRetries) {
            this.setState(prevState => ({
                hasError: false,
                retryCount: prevState.retryCount + 1
            }));

            this.props.onRetry?.();
        }
    };

    /**
     * 대체 모드로 전환
     */
    private handleFallback = () => {
        this.props.onFallback?.();
    };

    render() {
        if (this.state.hasError) {
            return (
                <VisualizationErrorDisplay
                    errorType={this.state.errorType}
                    errorMessage={this.state.errorMessage}
                    errorDetails={this.state.errorDetails}
                    retryCount={this.state.retryCount}
                    maxRetries={this.props.maxRetries || 3}
                    onRetry={this.handleRetry}
                    onFallback={this.handleFallback}
                />
            );
        }

        return this.props.children;
    }
}

/**
 * 오류 표시 컴포넌트
 */
interface VisualizationErrorDisplayProps {
    errorType: 'memory' | 'performance' | 'rendering' | 'data' | 'unknown';
    errorMessage: string;
    errorDetails?: string;
    retryCount: number;
    maxRetries: number;
    onRetry: () => void;
    onFallback: () => void;
}

function VisualizationErrorDisplay({
    errorType,
    errorMessage,
    errorDetails,
    retryCount,
    maxRetries,
    onRetry,
    onFallback
}: VisualizationErrorDisplayProps) {
    const getErrorIcon = () => {
        switch (errorType) {
            case 'memory':
                return <MemoryStick className="w-12 h-12 text-orange-500" />;
            case 'performance':
                return <Zap className="w-12 h-12 text-yellow-500" />;
            case 'data':
                return <Database className="w-12 h-12 text-blue-500" />;
            default:
                return <AlertTriangle className="w-12 h-12 text-red-500" />;
        }
    };

    const getErrorTitle = () => {
        switch (errorType) {
            case 'memory':
                return '메모리 부족';
            case 'performance':
                return '성능 저하';
            case 'rendering':
                return '렌더링 오류';
            case 'data':
                return '데이터 오류';
            default:
                return '시각화 오류';
        }
    };

    const getRecommendations = () => {
        switch (errorType) {
            case 'memory':
                return [
                    '다른 브라우저 탭을 닫아보세요',
                    '필터를 사용하여 표시할 데이터를 줄여보세요',
                    '브라우저를 재시작해보세요'
                ];
            case 'performance':
                return [
                    '필터를 사용하여 노드 수를 줄여보세요',
                    '실시간 상태 업데이트를 비활성화해보세요',
                    '간단한 레이아웃 모드로 전환해보세요'
                ];
            case 'data':
                return [
                    '네트워크 연결을 확인해보세요',
                    '데이터를 새로 고침해보세요',
                    '관리자에게 문의해보세요'
                ];
            default:
                return [
                    '페이지를 새로 고침해보세요',
                    '브라우저 캐시를 지워보세요',
                    '다른 브라우저를 사용해보세요'
                ];
        }
    };

    return (
        <div className="flex items-center justify-center w-full h-full min-h-[400px] bg-gray-50">
            <div className="max-w-md p-8 bg-white rounded-lg shadow-lg text-center">
                <div className="flex justify-center mb-4">
                    {getErrorIcon()}
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {getErrorTitle()}
                </h3>

                <p className="text-gray-600 mb-4">
                    {errorMessage}
                </p>

                {errorDetails && (
                    <details className="mb-4 text-left">
                        <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                            자세한 정보
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-700 overflow-auto max-h-32">
                            {errorDetails}
                        </pre>
                    </details>
                )}

                <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">권장 해결 방법:</h4>
                    <ul className="text-sm text-gray-600 text-left space-y-1">
                        {getRecommendations().map((recommendation, index) => (
                            <li key={index} className="flex items-start">
                                <span className="inline-block w-1 h-1 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                                {recommendation}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="flex gap-3 justify-center">
                    {retryCount < maxRetries && (
                        <button
                            onClick={onRetry}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            다시 시도 ({retryCount + 1}/{maxRetries})
                        </button>
                    )}

                    <button
                        onClick={onFallback}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                    >
                        간단한 모드로 보기
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * 오류 타입 분류
 */
function classifyError(error: Error): 'memory' | 'performance' | 'rendering' | 'data' | 'unknown' {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // 메모리 관련 오류
    if (message.includes('memory') ||
        message.includes('heap') ||
        message.includes('out of memory') ||
        stack.includes('rangeerror')) {
        return 'memory';
    }

    // 성능 관련 오류
    if (message.includes('timeout') ||
        message.includes('slow') ||
        message.includes('performance')) {
        return 'performance';
    }

    // 렌더링 관련 오류
    if (message.includes('render') ||
        message.includes('dom') ||
        message.includes('svg') ||
        stack.includes('d3')) {
        return 'rendering';
    }

    // 데이터 관련 오류
    if (message.includes('data') ||
        message.includes('fetch') ||
        message.includes('network') ||
        message.includes('json')) {
        return 'data';
    }

    return 'unknown';
}

/**
 * 성능 최적화 유틸리티
 */
export class PerformanceOptimizer {
    private static readonly MAX_NODES = 1000;
    private static readonly MAX_EDGES = 2000;
    private static readonly CHUNK_SIZE = 100;

    /**
     * 대용량 데이터 청킹
     */
    static chunkData<T>(data: T[], chunkSize: number = this.CHUNK_SIZE): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < data.length; i += chunkSize) {
            chunks.push(data.slice(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * 데이터 크기 검증
     */
    static validateDataSize(nodes: any[], edges: any[]): {
        isValid: boolean;
        warnings: string[];
        recommendations: string[];
    } {
        const warnings: string[] = [];
        const recommendations: string[] = [];
        let isValid = true;

        if (nodes.length > this.MAX_NODES) {
            warnings.push(`노드 수가 많습니다 (${nodes.length}/${this.MAX_NODES})`);
            recommendations.push('필터를 사용하여 표시할 노드를 줄이세요');
            isValid = false;
        }

        if (edges.length > this.MAX_EDGES) {
            warnings.push(`연결 수가 많습니다 (${edges.length}/${this.MAX_EDGES})`);
            recommendations.push('연결 타입 필터를 사용하세요');
            isValid = false;
        }

        return { isValid, warnings, recommendations };
    }

    /**
     * 메모리 사용량 확인
     */
    static checkMemoryUsage(): {
        usage: number;
        isHigh: boolean;
        available: number;
    } {
        if ('memory' in performance) {
            const memory = (performance as any).memory;
            const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
            const available = memory.jsHeapSizeLimit - memory.usedJSHeapSize;

            return {
                usage,
                isHigh: usage > 0.8,
                available
            };
        }

        return {
            usage: 0,
            isHigh: false,
            available: Infinity
        };
    }

    /**
     * 렌더링 최적화 설정 제안
     */
    static suggestOptimizations(nodeCount: number, edgeCount: number): {
        disableAnimations: boolean;
        reduceDetails: boolean;
        useSimpleLayout: boolean;
        enableVirtualization: boolean;
    } {
        return {
            disableAnimations: nodeCount > 500 || edgeCount > 1000,
            reduceDetails: nodeCount > 300,
            useSimpleLayout: nodeCount > 200,
            enableVirtualization: nodeCount > 1000
        };
    }
}

export default VisualizationErrorBoundary;