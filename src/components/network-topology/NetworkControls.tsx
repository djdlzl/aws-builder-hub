/**
 * 네트워크 토폴로지 시각화 제어 컴포넌트
 * 필터링, 검색, 시각화 설정 등을 제공합니다.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Search,
    Filter,
    Settings,
    ChevronDown,
    ChevronUp,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Eye,
    EyeOff,
    Activity,
    Monitor,
    Sliders
} from 'lucide-react';
import type {
    FilterOptions,
    VisualizationSettings
} from '@/types/network-topology';
import { NodeType, ConnectionType } from '@/types/network-topology';

interface NetworkControlsProps {
    filters: FilterOptions;
    settings: VisualizationSettings;
    onFiltersChange: (filters: FilterOptions) => void;
    onSettingsChange: (settings: VisualizationSettings) => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetView: () => void;
    showStatusMonitor?: boolean;
    onToggleStatusMonitor?: () => void;
    statusMonitorVisible?: boolean;
    enableAdvancedFilters?: boolean;
    onToggleAdvancedFilters?: () => void;
    advancedFiltersVisible?: boolean;
    useAdvancedFilters?: boolean;
    onToggleUseAdvancedFilters?: () => void;
    className?: string;
}

export function NetworkControls({
    filters,
    settings,
    onFiltersChange,
    onSettingsChange,
    onZoomIn,
    onZoomOut,
    onResetView,
    showStatusMonitor = false,
    onToggleStatusMonitor,
    statusMonitorVisible = false,
    enableAdvancedFilters = false,
    onToggleAdvancedFilters,
    advancedFiltersVisible = false,
    useAdvancedFilters = false,
    onToggleUseAdvancedFilters,
    className = ''
}: NetworkControlsProps) {
    const [isFiltersOpen, setIsFiltersOpen] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // 노드 타입 옵션
    const nodeTypeOptions = [
        { value: NodeType.ACCOUNT, label: '계정', color: '#3b82f6' },
        { value: NodeType.REGION, label: '리전', color: '#10b981' },
        { value: NodeType.VPC, label: 'VPC', color: '#8b5cf6' },
        { value: NodeType.SUBNET, label: '서브넷', color: '#f59e0b' },
        { value: NodeType.IGW, label: 'IGW', color: '#ef4444' },
        { value: NodeType.NAT, label: 'NAT', color: '#06b6d4' },
    ];

    // 연결 타입 옵션
    const connectionTypeOptions = [
        { value: ConnectionType.VPC_PEERING, label: 'VPC 피어링', color: '#8b5cf6' },
        { value: ConnectionType.CLOUDWAN, label: 'CloudWAN', color: '#10b981' },
        { value: ConnectionType.GATEWAY, label: '게이트웨이', color: '#f59e0b' },
        { value: ConnectionType.ROUTE, label: '라우트', color: '#6b7280' },
        { value: ConnectionType.TRANSIT_GATEWAY, label: 'Transit Gateway', color: '#ef4444' },
    ];

    // 검색어 변경 핸들러
    const handleSearchChange = (value: string) => {
        onFiltersChange({ ...filters, searchQuery: value });
    };

    // 노드 타입 필터 토글
    const toggleNodeType = (nodeType: NodeType) => {
        const newNodeTypes = filters.nodeTypes.includes(nodeType)
            ? filters.nodeTypes.filter(t => t !== nodeType)
            : [...filters.nodeTypes, nodeType];

        onFiltersChange({ ...filters, nodeTypes: newNodeTypes });
    };

    // 연결 타입 필터 토글
    const toggleConnectionType = (connectionType: ConnectionType) => {
        const newConnectionTypes = filters.connectionTypes.includes(connectionType)
            ? filters.connectionTypes.filter(t => t !== connectionType)
            : [...filters.connectionTypes, connectionType];

        onFiltersChange({ ...filters, connectionTypes: newConnectionTypes });
    };

    // 모든 노드 타입 선택/해제
    const toggleAllNodeTypes = () => {
        const allSelected = nodeTypeOptions.every(option =>
            filters.nodeTypes.includes(option.value)
        );

        const newNodeTypes = allSelected ? [] : nodeTypeOptions.map(option => option.value);
        onFiltersChange({ ...filters, nodeTypes: newNodeTypes });
    };

    // 모든 연결 타입 선택/해제
    const toggleAllConnectionTypes = () => {
        const allSelected = connectionTypeOptions.every(option =>
            filters.connectionTypes.includes(option.value)
        );

        const newConnectionTypes = allSelected ? [] : connectionTypeOptions.map(option => option.value);
        onFiltersChange({ ...filters, connectionTypes: newConnectionTypes });
    };

    return (
        <Card className={`w-80 ${className}`}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Settings className="h-5 w-5" />
                    시각화 제어
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* 검색 */}
                <div className="space-y-2">
                    <Label htmlFor="search" className="flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        검색
                    </Label>
                    <Input
                        id="search"
                        placeholder="노드 ID 또는 이름으로 검색..."
                        value={filters.searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                    />
                </div>

                <Separator />

                {/* 뷰 제어 */}
                <div className="space-y-2">
                    <Label>뷰 제어</Label>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={onZoomIn}>
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={onZoomOut}>
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={onResetView}>
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* 상태 모니터 토글 */}
                {showStatusMonitor && onToggleStatusMonitor && (
                    <div className="space-y-2">
                        <Label>실시간 모니터링</Label>
                        <Button
                            variant={statusMonitorVisible ? "default" : "outline"}
                            size="sm"
                            onClick={onToggleStatusMonitor}
                            className="w-full justify-start gap-2"
                        >
                            {statusMonitorVisible ? (
                                <Activity className="h-4 w-4" />
                            ) : (
                                <Monitor className="h-4 w-4" />
                            )}
                            {statusMonitorVisible ? '상태 모니터 숨기기' : '상태 모니터 표시'}
                        </Button>
                    </div>
                )}

                {/* 고급 필터 토글 */}
                {enableAdvancedFilters && onToggleAdvancedFilters && onToggleUseAdvancedFilters && (
                    <div className="space-y-2">
                        <Label>고급 필터링</Label>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="use-advanced-filters" className="text-sm">고급 필터 사용</Label>
                                <Switch
                                    id="use-advanced-filters"
                                    checked={useAdvancedFilters}
                                    onCheckedChange={onToggleUseAdvancedFilters}
                                />
                            </div>
                            {useAdvancedFilters && (
                                <Button
                                    variant={advancedFiltersVisible ? "default" : "outline"}
                                    size="sm"
                                    onClick={onToggleAdvancedFilters}
                                    className="w-full justify-start gap-2"
                                >
                                    <Sliders className="h-4 w-4" />
                                    {advancedFiltersVisible ? '고급 필터 숨기기' : '고급 필터 표시'}
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                <Separator />

                {/* 필터 */}
                <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-0">
                            <span className="flex items-center gap-2">
                                <Filter className="h-4 w-4" />
                                필터
                            </span>
                            {isFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="space-y-4 mt-3">
                        {/* 노드 타입 필터 */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">노드 타입</Label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={toggleAllNodeTypes}
                                    className="h-6 px-2 text-xs"
                                >
                                    {nodeTypeOptions.every(option => filters.nodeTypes.includes(option.value))
                                        ? '전체 해제' : '전체 선택'}
                                </Button>
                            </div>

                            <div className="flex flex-wrap gap-1">
                                {nodeTypeOptions.map((option) => {
                                    const isSelected = filters.nodeTypes.includes(option.value);
                                    return (
                                        <Badge
                                            key={option.value}
                                            variant={isSelected ? "default" : "outline"}
                                            className="cursor-pointer text-xs"
                                            style={isSelected ? { backgroundColor: option.color } : {}}
                                            onClick={() => toggleNodeType(option.value)}
                                        >
                                            {option.label}
                                        </Badge>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 연결 타입 필터 */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">연결 타입</Label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={toggleAllConnectionTypes}
                                    className="h-6 px-2 text-xs"
                                >
                                    {connectionTypeOptions.every(option => filters.connectionTypes.includes(option.value))
                                        ? '전체 해제' : '전체 선택'}
                                </Button>
                            </div>

                            <div className="flex flex-wrap gap-1">
                                {connectionTypeOptions.map((option) => {
                                    const isSelected = filters.connectionTypes.includes(option.value);
                                    return (
                                        <Badge
                                            key={option.value}
                                            variant={isSelected ? "default" : "outline"}
                                            className="cursor-pointer text-xs"
                                            style={isSelected ? { backgroundColor: option.color } : {}}
                                            onClick={() => toggleConnectionType(option.value)}
                                        >
                                            {option.label}
                                        </Badge>
                                    );
                                })}
                            </div>
                        </div>
                    </CollapsibleContent>
                </Collapsible>

                <Separator />

                {/* 시각화 설정 */}
                <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-0">
                            <span className="flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                시각화 설정
                            </span>
                            {isSettingsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="space-y-4 mt-3">
                        {/* 라벨 표시 */}
                        <div className="flex items-center justify-between">
                            <Label htmlFor="show-labels" className="flex items-center gap-2">
                                {settings.showLabels ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                라벨 표시
                            </Label>
                            <Switch
                                id="show-labels"
                                checked={settings.showLabels}
                                onCheckedChange={(checked) =>
                                    onSettingsChange({ ...settings, showLabels: checked })
                                }
                            />
                        </div>

                        {/* 메타데이터 표시 */}
                        <div className="flex items-center justify-between">
                            <Label htmlFor="show-metadata" className="flex items-center gap-2">
                                {settings.showMetadata ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                메타데이터 표시
                            </Label>
                            <Switch
                                id="show-metadata"
                                checked={settings.showMetadata}
                                onCheckedChange={(checked) =>
                                    onSettingsChange({ ...settings, showMetadata: checked })
                                }
                            />
                        </div>

                        {/* 연결 하이라이트 */}
                        <div className="flex items-center justify-between">
                            <Label htmlFor="highlight-connections" className="flex items-center gap-2">
                                {settings.highlightConnections ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                연결 하이라이트
                            </Label>
                            <Switch
                                id="highlight-connections"
                                checked={settings.highlightConnections}
                                onCheckedChange={(checked) =>
                                    onSettingsChange({ ...settings, highlightConnections: checked })
                                }
                            />
                        </div>

                        {/* 레이아웃 타입 */}
                        <div className="space-y-2">
                            <Label>레이아웃 타입</Label>
                            <Select
                                value={settings.layoutType}
                                onValueChange={(value: 'hierarchical' | 'force' | 'circular') =>
                                    onSettingsChange({ ...settings, layoutType: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hierarchical">계층적</SelectItem>
                                    <SelectItem value="force">포스 기반</SelectItem>
                                    <SelectItem value="circular">원형</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </CardContent>
        </Card>
    );
}