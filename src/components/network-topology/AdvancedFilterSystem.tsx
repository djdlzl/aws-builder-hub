/**
 * 고급 필터링 시스템
 * 복잡한 필터링 조건과 저장된 필터 프리셋을 지원합니다.
 */

import React, { useState, useCallback, useEffect } from 'react';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Filter,
    Search,
    Save,
    Trash2,
    ChevronDown,
    ChevronUp,
    Plus,
    X,
    BookmarkPlus,
    Bookmark
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type {
    NodeData,
    EdgeData,
    FilterOptions
} from '@/types/network-topology';
import { NodeType, ConnectionType } from '@/types/network-topology';

export interface AdvancedFilterOptions extends FilterOptions {
    // 계층적 필터
    accountIds: string[];
    regionNames: string[];
    vpcIds: string[];

    // 상태 필터
    nodeStates: string[];
    connectionStates: string[];

    // 메트릭 필터
    minBandwidth?: number;
    maxBandwidth?: number;
    minLatency?: number;
    maxLatency?: number;

    // 태그 필터
    tagFilters: TagFilter[];

    // 시간 필터
    createdAfter?: Date;
    createdBefore?: Date;

    // 고급 조건
    includeOrphanNodes: boolean;
    includeCrossConnections: boolean;
    includeInactiveConnections: boolean;
}

export interface TagFilter {
    key: string;
    value: string;
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith';
}

export interface FilterPreset {
    id: string;
    name: string;
    description: string;
    filters: AdvancedFilterOptions;
    createdAt: Date;
    isDefault?: boolean;
}

interface AdvancedFilterSystemProps {
    nodes: NodeData[];
    edges: EdgeData[];
    onFiltersChange: (filters: AdvancedFilterOptions) => void;
    className?: string;
}

export function AdvancedFilterSystem({
    nodes,
    edges,
    onFiltersChange,
    className = ''
}: AdvancedFilterSystemProps) {
    const { toast } = useToast();

    // 필터 상태
    const [filters, setFilters] = useState<AdvancedFilterOptions>({
        nodeTypes: Object.values(NodeType),
        connectionTypes: Object.values(ConnectionType),
        accounts: [],
        regions: [],
        searchQuery: '',
        accountIds: [],
        regionNames: [],
        vpcIds: [],
        nodeStates: [],
        connectionStates: [],
        tagFilters: [],
        includeOrphanNodes: true,
        includeCrossConnections: true,
        includeInactiveConnections: true
    });

    // UI 상태
    const [isBasicFiltersOpen, setIsBasicFiltersOpen] = useState(true);
    const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
    const [isPresetsOpen, setIsPresetsOpen] = useState(false);

    // 프리셋 관리
    const [presets, setPresets] = useState<FilterPreset[]>([]);
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
    const [newPresetName, setNewPresetName] = useState('');

    // 동적 옵션 추출
    const [availableOptions, setAvailableOptions] = useState({
        accounts: [] as string[],
        regions: [] as string[],
        vpcs: [] as string[],
        states: [] as string[],
        tags: [] as { key: string; values: string[] }[]
    });

    // 노드와 엣지에서 사용 가능한 옵션 추출
    useEffect(() => {
        const accounts = new Set<string>();
        const regions = new Set<string>();
        const vpcs = new Set<string>();
        const states = new Set<string>();
        const tagMap = new Map<string, Set<string>>();

        nodes.forEach(node => {
            if (node.metadata.accountId) accounts.add(node.metadata.accountId);
            if (node.metadata.region) regions.add(node.metadata.region);
            if (node.metadata.vpcId) vpcs.add(node.metadata.vpcId);
            if (node.metadata.state) states.add(node.metadata.state);

            // 태그 추출
            if (node.metadata.tags) {
                Object.entries(node.metadata.tags).forEach(([key, value]) => {
                    if (!tagMap.has(key)) tagMap.set(key, new Set());
                    tagMap.get(key)!.add(String(value));
                });
            }
        });

        edges.forEach(edge => {
            if (edge.metadata.state) states.add(edge.metadata.state);
        });

        setAvailableOptions({
            accounts: Array.from(accounts).sort(),
            regions: Array.from(regions).sort(),
            vpcs: Array.from(vpcs).sort(),
            states: Array.from(states).sort(),
            tags: Array.from(tagMap.entries()).map(([key, values]) => ({
                key,
                values: Array.from(values).sort()
            }))
        });
    }, [nodes, edges]);

    // 필터 변경 시 콜백 호출
    useEffect(() => {
        onFiltersChange(filters);
    }, [filters, onFiltersChange]);

    // 기본 필터 업데이트
    const updateBasicFilter = useCallback((key: keyof AdvancedFilterOptions, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setSelectedPreset(null); // 프리셋 선택 해제
    }, []);

    // 배열 필터 토글
    const toggleArrayFilter = useCallback((key: keyof AdvancedFilterOptions, value: string) => {
        setFilters(prev => {
            const currentArray = prev[key] as string[];
            const newArray = currentArray.includes(value)
                ? currentArray.filter(item => item !== value)
                : [...currentArray, value];
            return { ...prev, [key]: newArray };
        });
        setSelectedPreset(null);
    }, []);

    // 태그 필터 추가
    const addTagFilter = useCallback(() => {
        setFilters(prev => ({
            ...prev,
            tagFilters: [...prev.tagFilters, { key: '', value: '', operator: 'equals' }]
        }));
    }, []);

    // 태그 필터 제거
    const removeTagFilter = useCallback((index: number) => {
        setFilters(prev => ({
            ...prev,
            tagFilters: prev.tagFilters.filter((_, i) => i !== index)
        }));
    }, []);

    // 태그 필터 업데이트
    const updateTagFilter = useCallback((index: number, field: keyof TagFilter, value: string) => {
        setFilters(prev => ({
            ...prev,
            tagFilters: prev.tagFilters.map((filter, i) =>
                i === index ? { ...filter, [field]: value } : filter
            )
        }));
    }, []);

    // 필터 초기화
    const resetFilters = useCallback(() => {
        setFilters({
            nodeTypes: Object.values(NodeType),
            connectionTypes: Object.values(ConnectionType),
            accounts: [],
            regions: [],
            searchQuery: '',
            accountIds: [],
            regionNames: [],
            vpcIds: [],
            nodeStates: [],
            connectionStates: [],
            tagFilters: [],
            includeOrphanNodes: true,
            includeCrossConnections: true,
            includeInactiveConnections: true
        });
        setSelectedPreset(null);
    }, []);

    // 프리셋 저장
    const savePreset = useCallback(() => {
        if (!newPresetName.trim()) {
            toast({
                title: "프리셋 이름 필요",
                description: "프리셋 이름을 입력해주세요.",
                variant: "destructive",
            });
            return;
        }

        const newPreset: FilterPreset = {
            id: Date.now().toString(),
            name: newPresetName.trim(),
            description: `${filters.nodeTypes.length}개 노드 타입, ${filters.connectionTypes.length}개 연결 타입`,
            filters: { ...filters },
            createdAt: new Date()
        };

        setPresets(prev => [...prev, newPreset]);
        setNewPresetName('');

        toast({
            title: "프리셋 저장됨",
            description: `"${newPreset.name}" 프리셋이 저장되었습니다.`,
        });
    }, [newPresetName, filters, toast]);

    // 프리셋 로드
    const loadPreset = useCallback((preset: FilterPreset) => {
        setFilters(preset.filters);
        setSelectedPreset(preset.id);

        toast({
            title: "프리셋 로드됨",
            description: `"${preset.name}" 프리셋이 적용되었습니다.`,
        });
    }, [toast]);

    // 프리셋 삭제
    const deletePreset = useCallback((presetId: string) => {
        setPresets(prev => prev.filter(p => p.id !== presetId));
        if (selectedPreset === presetId) {
            setSelectedPreset(null);
        }

        toast({
            title: "프리셋 삭제됨",
            description: "프리셋이 삭제되었습니다.",
        });
    }, [selectedPreset, toast]);

    return (
        <Card className={`w-96 ${className}`}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Filter className="h-5 w-5" />
                    고급 필터링
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
                        placeholder="노드 ID, 이름, 태그로 검색..."
                        value={filters.searchQuery}
                        onChange={(e) => updateBasicFilter('searchQuery', e.target.value)}
                    />
                </div>

                <Separator />

                {/* 기본 필터 */}
                <Collapsible open={isBasicFiltersOpen} onOpenChange={setIsBasicFiltersOpen}>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-0">
                            <span>기본 필터</span>
                            {isBasicFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="space-y-4 mt-3">
                        {/* 노드 타입 */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">노드 타입</Label>
                            <div className="flex flex-wrap gap-1">
                                {Object.values(NodeType).map((type) => (
                                    <Badge
                                        key={type}
                                        variant={filters.nodeTypes.includes(type) ? "default" : "outline"}
                                        className="cursor-pointer text-xs"
                                        onClick={() => toggleArrayFilter('nodeTypes', type)}
                                    >
                                        {type}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* 연결 타입 */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">연결 타입</Label>
                            <div className="flex flex-wrap gap-1">
                                {Object.values(ConnectionType).map((type) => (
                                    <Badge
                                        key={type}
                                        variant={filters.connectionTypes.includes(type) ? "default" : "outline"}
                                        className="cursor-pointer text-xs"
                                        onClick={() => toggleArrayFilter('connectionTypes', type)}
                                    >
                                        {type.replace('_', ' ')}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </CollapsibleContent>
                </Collapsible>

                <Separator />

                {/* 고급 필터 */}
                <Collapsible open={isAdvancedFiltersOpen} onOpenChange={setIsAdvancedFiltersOpen}>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-0">
                            <span>고급 필터</span>
                            {isAdvancedFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="space-y-4 mt-3">
                        {/* 계정 필터 */}
                        {availableOptions.accounts.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">계정</Label>
                                <div className="flex flex-wrap gap-1">
                                    {availableOptions.accounts.map((account) => (
                                        <Badge
                                            key={account}
                                            variant={filters.accountIds.includes(account) ? "default" : "outline"}
                                            className="cursor-pointer text-xs"
                                            onClick={() => toggleArrayFilter('accountIds', account)}
                                        >
                                            {account}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 리전 필터 */}
                        {availableOptions.regions.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">리전</Label>
                                <div className="flex flex-wrap gap-1">
                                    {availableOptions.regions.map((region) => (
                                        <Badge
                                            key={region}
                                            variant={filters.regionNames.includes(region) ? "default" : "outline"}
                                            className="cursor-pointer text-xs"
                                            onClick={() => toggleArrayFilter('regionNames', region)}
                                        >
                                            {region}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 상태 필터 */}
                        {availableOptions.states.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">상태</Label>
                                <div className="flex flex-wrap gap-1">
                                    {availableOptions.states.map((state) => (
                                        <Badge
                                            key={state}
                                            variant={filters.nodeStates.includes(state) ? "default" : "outline"}
                                            className="cursor-pointer text-xs"
                                            onClick={() => toggleArrayFilter('nodeStates', state)}
                                        >
                                            {state}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 태그 필터 */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">태그 필터</Label>
                                <Button variant="ghost" size="sm" onClick={addTagFilter}>
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </div>

                            {filters.tagFilters.map((tagFilter, index) => (
                                <div key={index} className="flex items-center gap-2 p-2 border rounded">
                                    <Select
                                        value={tagFilter.key}
                                        onValueChange={(value) => updateTagFilter(index, 'key', value)}
                                    >
                                        <SelectTrigger className="w-20">
                                            <SelectValue placeholder="키" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableOptions.tags.map((tag) => (
                                                <SelectItem key={tag.key} value={tag.key}>
                                                    {tag.key}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select
                                        value={tagFilter.operator}
                                        onValueChange={(value) => updateTagFilter(index, 'operator', value as TagFilter['operator'])}
                                    >
                                        <SelectTrigger className="w-20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="equals">=</SelectItem>
                                            <SelectItem value="contains">포함</SelectItem>
                                            <SelectItem value="startsWith">시작</SelectItem>
                                            <SelectItem value="endsWith">끝</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Input
                                        placeholder="값"
                                        value={tagFilter.value}
                                        onChange={(e) => updateTagFilter(index, 'value', e.target.value)}
                                        className="flex-1"
                                    />

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeTagFilter(index)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        {/* 고급 옵션 */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">고급 옵션</Label>

                            <div className="flex items-center justify-between">
                                <Label htmlFor="orphan-nodes">고아 노드 포함</Label>
                                <Switch
                                    id="orphan-nodes"
                                    checked={filters.includeOrphanNodes}
                                    onCheckedChange={(checked) => updateBasicFilter('includeOrphanNodes', checked)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <Label htmlFor="cross-connections">크로스 연결 포함</Label>
                                <Switch
                                    id="cross-connections"
                                    checked={filters.includeCrossConnections}
                                    onCheckedChange={(checked) => updateBasicFilter('includeCrossConnections', checked)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <Label htmlFor="inactive-connections">비활성 연결 포함</Label>
                                <Switch
                                    id="inactive-connections"
                                    checked={filters.includeInactiveConnections}
                                    onCheckedChange={(checked) => updateBasicFilter('includeInactiveConnections', checked)}
                                />
                            </div>
                        </div>
                    </CollapsibleContent>
                </Collapsible>

                <Separator />

                {/* 프리셋 관리 */}
                <Collapsible open={isPresetsOpen} onOpenChange={setIsPresetsOpen}>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-0">
                            <span className="flex items-center gap-2">
                                <Bookmark className="h-4 w-4" />
                                필터 프리셋
                            </span>
                            {isPresetsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="space-y-3 mt-3">
                        {/* 새 프리셋 저장 */}
                        <div className="flex gap-2">
                            <Input
                                placeholder="프리셋 이름"
                                value={newPresetName}
                                onChange={(e) => setNewPresetName(e.target.value)}
                                className="flex-1"
                            />
                            <Button size="sm" onClick={savePreset}>
                                <Save className="h-3 w-3" />
                            </Button>
                        </div>

                        {/* 저장된 프리셋 목록 */}
                        {presets.length > 0 && (
                            <div className="space-y-2">
                                {presets.map((preset) => (
                                    <div
                                        key={preset.id}
                                        className={`flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-muted/50 ${selectedPreset === preset.id ? 'bg-muted' : ''
                                            }`}
                                        onClick={() => loadPreset(preset)}
                                    >
                                        <div>
                                            <div className="font-medium text-sm">{preset.name}</div>
                                            <div className="text-xs text-muted-foreground">{preset.description}</div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deletePreset(preset.id);
                                            }}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CollapsibleContent>
                </Collapsible>

                <Separator />

                {/* 액션 버튼 */}
                <div className="flex gap-2">
                    <Button variant="outline" onClick={resetFilters} className="flex-1">
                        초기화
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}