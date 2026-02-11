/**
 * 네트워크 토폴로지 알림 시스템
 * 동기화 진행률, 완료 알림, 오류 메시지를 표시합니다.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    CheckCircle,
    AlertCircle,
    Info,
    X,
    Loader2,
    Wifi,
    WifiOff,
    RefreshCw,
    Clock
} from 'lucide-react';

export interface NotificationData {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info' | 'progress';
    title: string;
    message: string;
    duration?: number; // ms, 0이면 수동 닫기
    progress?: number; // 0-100
    actions?: NotificationAction[];
    timestamp: Date;
}

export interface NotificationAction {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
}

export interface SyncProgressData {
    isInProgress: boolean;
    currentStep: string;
    totalSteps: number;
    completedSteps: number;
    estimatedTimeRemaining?: number; // seconds
    message: string;
    progress: number; // 0-1
}

interface NotificationSystemProps {
    notifications: NotificationData[];
    syncProgress?: SyncProgressData;
    onDismiss: (id: string) => void;
    onClearAll: () => void;
    className?: string;
}

/**
 * 알림 시스템 메인 컴포넌트
 */
export function NotificationSystem({
    notifications,
    syncProgress,
    onDismiss,
    onClearAll,
    className = ''
}: NotificationSystemProps) {
    const [visibleNotifications, setVisibleNotifications] = useState<NotificationData[]>([]);

    // 알림 자동 제거 처리
    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];

        notifications.forEach(notification => {
            if (notification.duration && notification.duration > 0) {
                const timer = setTimeout(() => {
                    onDismiss(notification.id);
                }, notification.duration);
                timers.push(timer);
            }
        });

        return () => {
            timers.forEach(timer => clearTimeout(timer));
        };
    }, [notifications, onDismiss]);

    // 알림 애니메이션 처리
    useEffect(() => {
        setVisibleNotifications(notifications);
    }, [notifications]);

    return (
        <div className={`fixed top-4 right-4 z-50 space-y-2 max-w-sm ${className}`}>
            {/* 동기화 진행률 표시 */}
            {syncProgress?.isInProgress && (
                <SyncProgressNotification
                    progress={syncProgress}
                    onDismiss={() => { }} // 진행 중에는 닫기 불가
                />
            )}

            {/* 일반 알림들 */}
            {visibleNotifications.map(notification => (
                <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onDismiss={() => onDismiss(notification.id)}
                />
            ))}

            {/* 전체 지우기 버튼 */}
            {notifications.length > 1 && (
                <div className="flex justify-end">
                    <button
                        onClick={onClearAll}
                        className="text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                        모든 알림 지우기
                    </button>
                </div>
            )}
        </div>
    );
}

/**
 * 개별 알림 카드 컴포넌트
 */
interface NotificationCardProps {
    notification: NotificationData;
    onDismiss: () => void;
}

function NotificationCard({ notification, onDismiss }: NotificationCardProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        // 입장 애니메이션
        const timer = setTimeout(() => setIsVisible(true), 50);
        return () => clearTimeout(timer);
    }, []);

    const handleDismiss = useCallback(() => {
        setIsExiting(true);
        setTimeout(onDismiss, 300); // 애니메이션 완료 후 제거
    }, [onDismiss]);

    const getIcon = () => {
        switch (notification.type) {
            case 'success':
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'error':
                return <AlertCircle className="w-5 h-5 text-red-600" />;
            case 'warning':
                return <AlertCircle className="w-5 h-5 text-yellow-600" />;
            case 'progress':
                return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
            default:
                return <Info className="w-5 h-5 text-blue-600" />;
        }
    };

    const getBgColor = () => {
        switch (notification.type) {
            case 'success':
                return 'bg-green-50 border-green-200';
            case 'error':
                return 'bg-red-50 border-red-200';
            case 'warning':
                return 'bg-yellow-50 border-yellow-200';
            case 'progress':
                return 'bg-blue-50 border-blue-200';
            default:
                return 'bg-blue-50 border-blue-200';
        }
    };

    const getTextColor = () => {
        switch (notification.type) {
            case 'success':
                return 'text-green-800';
            case 'error':
                return 'text-red-800';
            case 'warning':
                return 'text-yellow-800';
            case 'progress':
                return 'text-blue-800';
            default:
                return 'text-blue-800';
        }
    };

    return (
        <div
            className={`
                transform transition-all duration-300 ease-in-out
                ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
                ${getBgColor()}
                border rounded-lg shadow-lg p-4 max-w-sm
            `}
        >
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    {getIcon()}
                </div>

                <div className="ml-3 flex-1">
                    <h4 className={`text-sm font-medium ${getTextColor()}`}>
                        {notification.title}
                    </h4>

                    <p className={`mt-1 text-sm ${getTextColor()} opacity-90`}>
                        {notification.message}
                    </p>

                    {/* 진행률 바 */}
                    {notification.type === 'progress' && notification.progress !== undefined && (
                        <div className="mt-2">
                            <div className="bg-white bg-opacity-50 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${notification.progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-blue-700 mt-1">
                                {Math.round(notification.progress)}% 완료
                            </p>
                        </div>
                    )}

                    {/* 액션 버튼들 */}
                    {notification.actions && notification.actions.length > 0 && (
                        <div className="mt-3 flex gap-2">
                            {notification.actions.map((action, index) => (
                                <button
                                    key={index}
                                    onClick={action.onClick}
                                    className={`
                                        text-xs px-3 py-1 rounded-md font-medium transition-colors
                                        ${action.variant === 'primary'
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-white bg-opacity-50 text-blue-800 hover:bg-opacity-75'
                                        }
                                    `}
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* 타임스탬프 */}
                    <p className="mt-2 text-xs text-gray-500">
                        {notification.timestamp.toLocaleTimeString()}
                    </p>
                </div>

                {/* 닫기 버튼 */}
                <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

/**
 * 동기화 진행률 알림 컴포넌트
 */
interface SyncProgressNotificationProps {
    progress: SyncProgressData;
    onDismiss: () => void;
}

function SyncProgressNotification({ progress, onDismiss }: SyncProgressNotificationProps) {
    const [isBlinking, setIsBlinking] = useState(false);
    const isFailed = !progress.isInProgress && progress.progress < 1;
    const isCompleted = !progress.isInProgress && progress.progress >= 1;

    // 완료 시 깜빡임 효과
    useEffect(() => {
        if (isCompleted) {
            setIsBlinking(true);
            const timer = setTimeout(() => {
                setIsBlinking(false);
                // 3초 후 자동 닫기
                setTimeout(onDismiss, 3000);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isCompleted, onDismiss]);

    const formatTimeRemaining = (seconds: number): string => {
        if (seconds < 60) {
            return `${seconds}초`;
        } else {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}분 ${remainingSeconds}초`;
        }
    };

    return (
        <div
            className={`
                bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm
                ${isBlinking ? 'animate-pulse bg-green-50 border-green-200' : ''}
                ${isFailed ? 'border-red-200 bg-red-50' : ''}
            `}
        >
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    {progress.isInProgress ? (
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    ) : isFailed ? (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                    ) : (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                </div>

                <div className="ml-3 flex-1">
                    <h4 className="text-sm font-medium text-gray-900">
                        {progress.isInProgress
                            ? '네트워크 데이터 동기화 중'
                            : isFailed
                                ? '동기화 실패'
                                : '동기화 완료'}
                    </h4>

                    <p className="mt-1 text-sm text-gray-600">
                        {progress.message}
                    </p>

                    {/* 진행률 바 */}
                    <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>
                                단계 {progress.completedSteps}/{progress.totalSteps}
                            </span>
                            <span>
                                {Math.round(progress.progress * 100)}%
                            </span>
                        </div>

                        <div className="bg-gray-200 rounded-full h-2">
                            <div
                                className={`
                                    h-2 rounded-full transition-all duration-500
                                    ${progress.isInProgress ? 'bg-blue-600' : isFailed ? 'bg-red-600' : 'bg-green-600'}
                                `}
                                style={{ width: `${progress.progress * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* 예상 남은 시간 */}
                    {progress.isInProgress && progress.estimatedTimeRemaining && (
                        <div className="mt-2 flex items-center text-xs text-gray-500">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>
                                약 {formatTimeRemaining(progress.estimatedTimeRemaining)} 남음
                            </span>
                        </div>
                    )}

                    {/* 현재 단계 */}
                    <p className="mt-2 text-xs text-gray-700 font-medium">
                        {progress.currentStep}
                    </p>
                </div>

                {/* 닫기 버튼 (완료 시에만) */}
                {!progress.isInProgress && (
                    <button
                        onClick={onDismiss}
                        className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * 연결 상태 표시 컴포넌트
 */
interface ConnectionStatusProps {
    isConnected: boolean;
    lastUpdated?: Date;
    className?: string;
}

export function ConnectionStatus({ isConnected, lastUpdated, className = '' }: ConnectionStatusProps) {
    return (
        <div className={`flex items-center text-sm ${className}`}>
            {isConnected ? (
                <>
                    <Wifi className="w-4 h-4 text-green-600 mr-2" />
                    <span className="text-green-700">연결됨</span>
                </>
            ) : (
                <>
                    <WifiOff className="w-4 h-4 text-red-600 mr-2" />
                    <span className="text-red-700">연결 끊김</span>
                </>
            )}

            {lastUpdated && (
                <span className="ml-2 text-gray-500">
                    • 마지막 업데이트: {lastUpdated.toLocaleTimeString()}
                </span>
            )}
        </div>
    );
}

/**
 * 알림 생성 유틸리티 함수들
 */
export const NotificationUtils = {
    createSuccessNotification: (title: string, message: string, duration = 5000): NotificationData => ({
        id: `success-${Date.now()}`,
        type: 'success',
        title,
        message,
        duration,
        timestamp: new Date()
    }),

    createErrorNotification: (title: string, message: string, actions?: NotificationAction[]): NotificationData => ({
        id: `error-${Date.now()}`,
        type: 'error',
        title,
        message,
        duration: 0, // 수동 닫기
        actions,
        timestamp: new Date()
    }),

    createWarningNotification: (title: string, message: string, duration = 8000): NotificationData => ({
        id: `warning-${Date.now()}`,
        type: 'warning',
        title,
        message,
        duration,
        timestamp: new Date()
    }),

    createInfoNotification: (title: string, message: string, duration = 5000): NotificationData => ({
        id: `info-${Date.now()}`,
        type: 'info',
        title,
        message,
        duration,
        timestamp: new Date()
    }),

    createProgressNotification: (title: string, message: string, progress: number): NotificationData => ({
        id: `progress-${Date.now()}`,
        type: 'progress',
        title,
        message,
        progress,
        duration: 0, // 수동 닫기
        timestamp: new Date()
    })
};

export default NotificationSystem;
