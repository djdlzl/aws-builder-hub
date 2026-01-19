import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type {
  ProvisioningFormState,
  ProvisioningInstanceOptions,
  ProvisioningSecurityGroupRule,
  ProvisioningTag,
} from "@/types/provisioning";
import { Loader2 } from "lucide-react";

interface ModulePreviewProps {
  title?: string;
  subtitle?: string;
  state: ProvisioningFormState;
  isLoading?: boolean;
  onTagChange?: (tagKey: string, value: string) => void;
}

const formatBoolean = (value?: boolean | null) =>
  value === null || value === undefined ? "-" : value ? "사용" : "미사용";

const formatSecurityRule = (rule: ProvisioningSecurityGroupRule) => {
  const portRange =
    rule.fromPort !== null && rule.fromPort !== undefined
      ? rule.toPort !== null && rule.toPort !== undefined
        ? `${rule.fromPort}-${rule.toPort}`
        : `${rule.fromPort}`
      : "";

  return [
    rule.direction,
    rule.protocol,
    portRange,
    rule.cidr,
    rule.sourceSecurityGroupId,
    rule.description,
  ]
    .filter((value) => value !== null && value !== undefined && value !== "")
    .join(" / ");
};

const instanceOptionLabels: Array<{
  key: keyof ProvisioningInstanceOptions;
  label: string;
}> = [
  { key: "instanceType", label: "인스턴스 타입" },
  { key: "ebsOptimized", label: "EBS 최적화" },
  { key: "monitoring", label: "모니터링" },
  { key: "tenancy", label: "테넌시" },
  { key: "cpuCredits", label: "CPU 크레딧" },
  { key: "iamInstanceProfileArn", label: "IAM 프로파일" },
  { key: "hibernationEnabled", label: "최대 절전" },
];

const renderDetailSection = (
  title: string,
  content: ReactNode,
  empty?: boolean
) => {
  if (empty) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {content}
    </div>
  );
};

const renderTagList = (
  tags: ProvisioningTag[],
  onTagChange?: (tagKey: string, value: string) => void
) => (
  <div className="space-y-2">
    {tags.map((tag) => {
      const missing = tag.isMandatory && !tag.tagValue?.trim();
      return (
        <div
          key={tag.tagKey}
          className="flex flex-col gap-2 rounded-md border border-border bg-background/60 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{tag.tagKey}</span>
            {tag.isMandatory && (
              <Badge variant="outline" className="text-[10px]">
                필수
              </Badge>
            )}
          </div>
          {onTagChange ? (
            <Input
              value={tag.tagValue ?? ""}
              onChange={(event) => onTagChange(tag.tagKey, event.target.value)}
              placeholder="값 입력"
              className={`h-8 sm:w-56 ${
                missing ? "border-destructive/50 text-destructive" : ""
              }`}
            />
          ) : (
            <span
              className={missing ? "text-destructive" : "text-muted-foreground"}
            >
              {tag.tagValue ?? "-"}
            </span>
          )}
        </div>
      );
    })}
  </div>
);

export function ModulePreview({
  title = "프로비저닝 옵션",
  subtitle,
  state,
  isLoading,
  onTagChange,
}: ModulePreviewProps) {
  const hasTags = state.tags.length > 0;
  const hasSecurityGroups = state.securityGroups.length > 0;
  const hasSecurityGroupRules = state.securityGroupRules.length > 0;
  const hasNetworkConfig = Boolean(state.networkConfig);
  const hasNetworkSubnets = state.networkSubnets.length > 0;
  const hasAmi = Boolean(state.amiConfig);
  const hasKeypair = Boolean(state.keypairConfig);
  const hasUserData = Boolean(state.userData);
  const hasInstanceOptions = Boolean(state.instanceOptions);
  const hasVolumes = state.volumeItems.length > 0;
  const hasAny =
    hasTags ||
    hasSecurityGroups ||
    hasSecurityGroupRules ||
    hasNetworkConfig ||
    hasNetworkSubnets ||
    hasAmi ||
    hasKeypair ||
    hasUserData ||
    hasInstanceOptions ||
    hasVolumes;
  const missingMandatoryTags = state.tags.filter(
    (tag) => tag.isMandatory && !tag.tagValue?.trim()
  ).length;

  return (
    <div className="rounded-lg border border-border bg-secondary/50 p-4 space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          불러오는 중...
        </div>
      ) : !hasAny ? (
        <p className="text-sm text-muted-foreground">
          적용된 기본값이 없습니다.
        </p>
      ) : (
        <div className="space-y-4">
          {missingMandatoryTags > 0 && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              필수 태그 값이 비어 있습니다.
            </div>
          )}

          {renderDetailSection(
            "태그",
            renderTagList(state.tags, onTagChange),
            !hasTags
          )}

          {renderDetailSection(
            "보안 그룹",
            <div className="space-y-2">
              {state.securityGroups.map((group) => (
                <div
                  key={group.securityGroupId}
                  className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-foreground">
                    {group.securityGroupId}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    우선순위 {group.sortOrder}
                  </span>
                </div>
              ))}
            </div>,
            !hasSecurityGroups
          )}

          {renderDetailSection(
            "보안 그룹 규칙",
            <div className="space-y-2">
              {state.securityGroupRules.map((rule, index) => (
                <div
                  key={`${rule.direction}-${rule.protocol}-${index}`}
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm text-muted-foreground"
                >
                  {formatSecurityRule(rule)}
                </div>
              ))}
            </div>,
            !hasSecurityGroupRules
          )}

          {renderDetailSection(
            "네트워크",
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2">
                <span className="text-muted-foreground">VPC</span>
                <span className="font-medium text-foreground">
                  {state.networkConfig?.vpcId ?? "-"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2">
                <span className="text-muted-foreground">퍼블릭 IP</span>
                <span className="font-medium text-foreground">
                  {formatBoolean(state.networkConfig?.assignPublicIp)}
                </span>
              </div>
            </div>,
            !hasNetworkConfig
          )}

          {renderDetailSection(
            "서브넷",
            <div className="space-y-2">
              {state.networkSubnets.map((subnet) => (
                <div
                  key={subnet.subnetId}
                  className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-foreground">
                    {subnet.subnetId}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    우선순위 {subnet.sortOrder}
                  </span>
                </div>
              ))}
            </div>,
            !hasNetworkSubnets
          )}

          {renderDetailSection(
            "AMI",
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2">
                <span className="text-muted-foreground">AMI ID</span>
                <span className="font-medium text-foreground">
                  {state.amiConfig?.amiId ?? "-"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2">
                <span className="text-muted-foreground">아키텍처</span>
                <span className="font-medium text-foreground">
                  {state.amiConfig?.architecture ?? "-"}
                </span>
              </div>
            </div>,
            !hasAmi
          )}

          {renderDetailSection(
            "키페어",
            <div className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2 text-sm">
              <span className="text-muted-foreground">키페어</span>
              <span className="font-medium text-foreground">
                {state.keypairConfig?.keypairName ?? "-"}
              </span>
            </div>,
            !hasKeypair
          )}

          {renderDetailSection(
            "유저 데이터",
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2 text-sm">
                <span className="text-muted-foreground">타입</span>
                <span className="font-medium text-foreground">
                  {state.userData?.contentType ?? "-"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Base64</span>
                <span className="font-medium text-foreground">
                  {formatBoolean(state.userData?.isBase64)}
                </span>
              </div>
              <pre className="max-h-40 overflow-auto rounded-md border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap">
                {state.userData?.content || "-"}
              </pre>
            </div>,
            !hasUserData
          )}

          {renderDetailSection(
            "인스턴스 옵션",
            <div className="space-y-2">
              {instanceOptionLabels
                .map(({ key, label }) => {
                  const value = state.instanceOptions?.[key];
                  if (value === undefined || value === null || value === "") {
                    return null;
                  }
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                    >
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-foreground">
                        {typeof value === "boolean"
                          ? formatBoolean(value)
                          : value}
                      </span>
                    </div>
                  );
                })
                .filter(Boolean)}
            </div>,
            !hasInstanceOptions
          )}

          {renderDetailSection(
            "볼륨",
            <div className="space-y-2">
              {state.volumeItems.map((volume) => (
                <div
                  key={volume.deviceName}
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">
                      {volume.deviceName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {volume.sizeGb}GB · {volume.volumeType}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>IOPS: {volume.iops ?? "-"}</span>
                    <span>Throughput: {volume.throughput ?? "-"}</span>
                    <span>암호화: {formatBoolean(volume.encrypted)}</span>
                    <span>루트: {formatBoolean(volume.isRoot)}</span>
                  </div>
                </div>
              ))}
            </div>,
            !hasVolumes
          )}
        </div>
      )}
    </div>
  );
}
