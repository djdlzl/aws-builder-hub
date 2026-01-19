import type {
  ProvisioningAmiConfig,
  ProvisioningFormState,
  ProvisioningInstanceOptions,
  ProvisioningKeypairConfig,
  ProvisioningNetworkConfig,
  ProvisioningNetworkSubnet,
  ProvisioningSecurityGroup,
  ProvisioningSecurityGroupRule,
  ProvisioningTag,
  ProvisioningUserData,
  ProvisioningVolumeItem,
} from "@/types/provisioning";

export type ProvisioningDefaultsSource = {
  tags: ProvisioningTag[];
  securityGroups: ProvisioningSecurityGroup[];
  securityGroupRules: ProvisioningSecurityGroupRule[];
  networkConfig?: ProvisioningNetworkConfig | null;
  networkSubnets: ProvisioningNetworkSubnet[];
  amiConfig?: ProvisioningAmiConfig | null;
  keypairConfig?: ProvisioningKeypairConfig | null;
  userData?: ProvisioningUserData | null;
  instanceOptions?: ProvisioningInstanceOptions | null;
  volumeItems: ProvisioningVolumeItem[];
};

export const emptyProvisioningState: ProvisioningFormState = {
  tags: [],
  securityGroups: [],
  securityGroupRules: [],
  networkConfig: null,
  networkSubnets: [],
  amiConfig: null,
  keypairConfig: null,
  userData: null,
  instanceOptions: null,
  volumeItems: [],
};

export const toProvisioningDefaultsSource = (module: {
  tags: ProvisioningTag[];
  securityGroups: ProvisioningSecurityGroup[];
  securityGroupRules: ProvisioningSecurityGroupRule[];
  networkConfig?: ProvisioningNetworkConfig | null;
  networkSubnets: ProvisioningNetworkSubnet[];
  amiConfig?: ProvisioningAmiConfig | null;
  keypairConfig?: ProvisioningKeypairConfig | null;
  userData?: ProvisioningUserData | null;
  instanceOptions?: ProvisioningInstanceOptions | null;
  volumeItems: ProvisioningVolumeItem[];
}): ProvisioningDefaultsSource => ({
  tags: module.tags ?? [],
  securityGroups: module.securityGroups ?? [],
  securityGroupRules: module.securityGroupRules ?? [],
  networkConfig: module.networkConfig ?? null,
  networkSubnets: module.networkSubnets ?? [],
  amiConfig: module.amiConfig ?? null,
  keypairConfig: module.keypairConfig ?? null,
  userData: module.userData ?? null,
  instanceOptions: module.instanceOptions ?? null,
  volumeItems: module.volumeItems ?? [],
});

const ruleKey = (rule: ProvisioningSecurityGroupRule): string =>
  [
    rule.direction,
    rule.protocol,
    rule.fromPort ?? "",
    rule.toPort ?? "",
    rule.cidr ?? "",
    rule.sourceSecurityGroupId ?? "",
    rule.description ?? "",
  ].join("|");

export const mergeProvisioningDefaults = (
  sources: ProvisioningDefaultsSource[]
): ProvisioningFormState => {
  if (sources.length === 0) {
    return { ...emptyProvisioningState };
  }

  const tagMap = new Map<string, ProvisioningTag>();
  const securityGroupMap = new Map<string, ProvisioningSecurityGroup>();
  const securityGroupRuleMap = new Map<string, ProvisioningSecurityGroupRule>();
  const subnetMap = new Map<string, ProvisioningNetworkSubnet>();
  const volumeMap = new Map<string, ProvisioningVolumeItem>();

  let networkConfig: ProvisioningNetworkConfig | null = null;
  let amiConfig: ProvisioningAmiConfig | null = null;
  let keypairConfig: ProvisioningKeypairConfig | null = null;
  let userData: ProvisioningUserData | null = null;
  let instanceOptions: ProvisioningInstanceOptions | null = null;

  sources.forEach((source) => {
    source.tags.forEach((tag) => {
      const existing = tagMap.get(tag.tagKey);
      tagMap.set(tag.tagKey, {
        ...tag,
        tagValue: tag.tagValue ?? existing?.tagValue ?? null,
        isMandatory: existing?.isMandatory || tag.isMandatory,
      });
    });

    source.securityGroups.forEach((group) => {
      securityGroupMap.set(group.securityGroupId, { ...group });
    });

    source.securityGroupRules.forEach((rule) => {
      securityGroupRuleMap.set(ruleKey(rule), { ...rule });
    });

    source.networkSubnets.forEach((subnet) => {
      subnetMap.set(subnet.subnetId, { ...subnet });
    });

    source.volumeItems.forEach((volume) => {
      volumeMap.set(volume.deviceName, { ...volume });
    });

    if (source.networkConfig) {
      networkConfig = { ...source.networkConfig };
    }
    if (source.amiConfig) {
      amiConfig = { ...source.amiConfig };
    }
    if (source.keypairConfig) {
      keypairConfig = { ...source.keypairConfig };
    }
    if (source.userData) {
      userData = { ...source.userData };
    }
    if (source.instanceOptions) {
      instanceOptions = { ...source.instanceOptions };
    }
  });

  return {
    tags: Array.from(tagMap.values()).sort((a, b) =>
      a.tagKey.localeCompare(b.tagKey)
    ),
    securityGroups: Array.from(securityGroupMap.values()).sort(
      (a, b) => a.sortOrder - b.sortOrder
    ),
    securityGroupRules: Array.from(securityGroupRuleMap.values()).sort(
      (a, b) => a.sortOrder - b.sortOrder
    ),
    networkConfig,
    networkSubnets: Array.from(subnetMap.values()).sort(
      (a, b) => a.sortOrder - b.sortOrder
    ),
    amiConfig,
    keypairConfig,
    userData,
    instanceOptions,
    volumeItems: Array.from(volumeMap.values()).sort(
      (a, b) => a.sortOrder - b.sortOrder
    ),
  };
};
