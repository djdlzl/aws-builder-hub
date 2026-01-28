/**
 * 네트워크 노드 상세 정보 패널
 * 선택된 노드의 상세 정보와 메타데이터를 표시합니다.
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Server,
  Globe,
  Network,
  Database,
  Shield,
  MapPin,
  Clock,
  Info,
  ExternalLink,
  Copy,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { NodeData } from "@/types/network-topology";
import { NodeType } from "@/types/network-topology";

interface NodeDetailsPanelProps {
  node: NodeData | null;
  onClose: () => void;
  className?: string;
}

export function NodeDetailsPanel({
  node,
  onClose,
  className = "",
}: NodeDetailsPanelProps) {
  const { toast } = useToast();

  if (!node) {
    return null;
  }

  // 노드 타입별 아이콘
  const getNodeIcon = (type: NodeType) => {
    switch (type) {
      case NodeType.ACCOUNT:
        return <Shield className="h-5 w-5" />;
      case NodeType.REGION:
        return <Globe className="h-5 w-5" />;
      case NodeType.VPC:
        return <Network className="h-5 w-5" />;
      case NodeType.SUBNET:
        return <Database className="h-5 w-5" />;
      case NodeType.IGW:
        return <ExternalLink className="h-5 w-5" />;
      case NodeType.NAT:
        return <Server className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  // 노드 타입별 색상
  const getNodeTypeColor = (type: NodeType) => {
    switch (type) {
      case NodeType.ACCOUNT:
        return "bg-blue-100 text-blue-800";
      case NodeType.REGION:
        return "bg-emerald-100 text-emerald-800";
      case NodeType.VPC:
        return "bg-violet-100 text-violet-800";
      case NodeType.SUBNET:
        return "bg-amber-100 text-amber-800";
      case NodeType.IGW:
        return "bg-red-100 text-red-800";
      case NodeType.NAT:
        return "bg-cyan-100 text-cyan-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // 클립보드에 복사
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({
          title: "복사 완료",
          description: `${label}이(가) 클립보드에 복사되었습니다.`,
        });
      })
      .catch(() => {
        toast({
          title: "복사 실패",
          description: "클립보드 복사에 실패했습니다.",
          variant: "destructive",
        });
      });
  };

  // 메타데이터 렌더링
  const renderMetadataValue = (key: string, value: any) => {
    if (typeof value === "boolean") {
      return (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "예" : "아니오"}
        </Badge>
      );
    }

    if (typeof value === "object" && value !== null) {
      return (
        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }

    if (typeof value === "string" && value.length > 50) {
      return (
        <div className="space-y-1">
          <p className="text-sm break-all">{value}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(value, key)}
            className="h-6 px-2"
          >
            <Copy className="h-3 w-3 mr-1" />
            복사
          </Button>
        </div>
      );
    }

    return <span className="text-sm">{String(value)}</span>;
  };

  // 주요 정보 추출
  const getMainInfo = () => {
    const info: Array<{ label: string; value: any; key: string }> = [];

    switch (node.type) {
      case NodeType.ACCOUNT:
        if (node.metadata.accountName)
          info.push({
            label: "계정명",
            value: node.metadata.accountName,
            key: "accountName",
          });
        if (node.metadata.accountId)
          info.push({
            label: "계정 ID",
            value: node.metadata.accountId,
            key: "accountId",
          });
        break;

      case NodeType.REGION:
        if (node.metadata.regionName)
          info.push({
            label: "리전명",
            value: node.metadata.regionName,
            key: "regionName",
          });
        if (node.metadata.availabilityZones)
          info.push({
            label: "가용 영역",
            value: node.metadata.availabilityZones.join(", "),
            key: "availabilityZones",
          });
        break;

      case NodeType.VPC:
        if (node.metadata.vpcId)
          info.push({
            label: "VPC ID",
            value: node.metadata.vpcId,
            key: "vpcId",
          });
        if (node.metadata.cidrBlock)
          info.push({
            label: "CIDR 블록",
            value: node.metadata.cidrBlock,
            key: "cidrBlock",
          });
        if (node.metadata.state)
          info.push({
            label: "상태",
            value: node.metadata.state,
            key: "state",
          });
        break;

      case NodeType.SUBNET:
        if (node.metadata.subnetId)
          info.push({
            label: "서브넷 ID",
            value: node.metadata.subnetId,
            key: "subnetId",
          });
        if (node.metadata.cidrBlock)
          info.push({
            label: "CIDR 블록",
            value: node.metadata.cidrBlock,
            key: "cidrBlock",
          });
        if (node.metadata.availabilityZone)
          info.push({
            label: "가용 영역",
            value: node.metadata.availabilityZone,
            key: "availabilityZone",
          });
        if (node.metadata.isPublic !== undefined)
          info.push({
            label: "퍼블릭 서브넷",
            value: node.metadata.isPublic,
            key: "isPublic",
          });
        break;

      case NodeType.IGW:
      case NodeType.NAT:
        if (node.metadata.gatewayId)
          info.push({
            label: "게이트웨이 ID",
            value: node.metadata.gatewayId,
            key: "gatewayId",
          });
        if (node.metadata.state)
          info.push({
            label: "상태",
            value: node.metadata.state,
            key: "state",
          });
        if (node.metadata.attachments)
          info.push({
            label: "연결",
            value: node.metadata.attachments.join(", "),
            key: "attachments",
          });
        break;
    }

    return info;
  };

  const mainInfo = getMainInfo();
  const otherMetadata = Object.entries(node.metadata).filter(
    ([key]) =>
      !mainInfo.some((info) => info.key === key) &&
      key !== "id" &&
      key !== "label",
  );

  return (
    <Card className={`w-96 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {getNodeIcon(node.type)}
            노드 상세 정보
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 기본 정보 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge className={getNodeTypeColor(node.type)}>{node.type}</Badge>
          </div>

          <div>
            <h3 className="font-semibold text-lg break-all">{node.label}</h3>
            <p className="text-sm text-muted-foreground break-all">{node.id}</p>
          </div>
        </div>

        <Separator />

        {/* 주요 정보 */}
        {mainInfo.length > 0 && (
          <>
            <div className="space-y-3">
              <h4 className="font-medium text-sm">주요 정보</h4>
              {mainInfo.map((info) => (
                <div key={info.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      {info.label}
                    </span>
                    {typeof info.value === "string" &&
                      info.value.length > 20 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(info.value, info.label)
                          }
                          className="h-6 px-2"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                  </div>
                  <div>{renderMetadataValue(info.key, info.value)}</div>
                </div>
              ))}
            </div>
            <Separator />
          </>
        )}

        {/* 위치 정보 */}
        {node.position && (
          <>
            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                위치 정보
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">X: </span>
                  <span>{Math.round(node.position.x)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Y: </span>
                  <span>{Math.round(node.position.y)}</span>
                </div>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* 추가 메타데이터 */}
        {otherMetadata.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">추가 정보</h4>
            {otherMetadata.map(([key, value]) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                  {typeof value === "string" && value.length > 20 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(value, key)}
                      className="h-6 px-2"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div>{renderMetadataValue(key, value)}</div>
              </div>
            ))}
          </div>
        )}

        {/* 타임스탬프 */}
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            마지막 업데이트: {new Date().toLocaleString("ko-KR")}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
