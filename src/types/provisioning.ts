export type ProvisioningModuleType =
  | "TAG"
  | "SECURITY_GROUP"
  | "NETWORK"
  | "AMI"
  | "KEYPAIR"
  | "VOLUME"
  | "USER_DATA"
  | "INSTANCE_OPTION"
  | "OPTION";

export type InstanceTemplateType = "INSTANCE" | "LAMBDA" | "VPC";

export interface TemplateCreatorResponse {
  id: number;
  name: string;
  email: string;
}

export interface ProvisioningTag {
  tagKey: string;
  tagValue?: string | null;
  isMandatory: boolean;
}

export interface ProvisioningSecurityGroup {
  securityGroupId: string;
  sortOrder: number;
}

export interface ProvisioningSecurityGroupRule {
  direction: string;
  protocol: string;
  fromPort?: number | null;
  toPort?: number | null;
  cidr?: string | null;
  sourceSecurityGroupId?: string | null;
  description?: string | null;
  sortOrder: number;
}

export interface ProvisioningNetworkConfig {
  vpcId: string;
  assignPublicIp: boolean;
}

export interface ProvisioningNetworkSubnet {
  subnetId: string;
  sortOrder: number;
}

export interface ProvisioningAmiConfig {
  amiId: string;
  architecture?: string | null;
}

export interface ProvisioningKeypairConfig {
  keypairName: string;
}

export interface ProvisioningUserData {
  content: string;
  contentType: string;
  isBase64: boolean;
}

export interface ProvisioningInstanceOptions {
  instanceType: string;
  ebsOptimized?: boolean | null;
  monitoring?: boolean | null;
  tenancy?: string | null;
  cpuCredits?: string | null;
  iamInstanceProfileArn?: string | null;
  hibernationEnabled?: boolean | null;
}

export interface ProvisioningVolumeItem {
  deviceName: string;
  volumeType: string;
  sizeGb: number;
  iops?: number | null;
  throughput?: number | null;
  encrypted: boolean;
  kmsKeyId?: string | null;
  deleteOnTermination: boolean;
  isRoot: boolean;
  sortOrder: number;
}

export interface ModuleDetailResponse {
  id: number;
  moduleType: ProvisioningModuleType;
  name: string;
  description?: string | null;
  isActive: boolean;
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
}

export interface InstanceTemplateModuleResponse {
  id: number;
  moduleId: number;
  moduleType: ProvisioningModuleType;
  name: string;
  sortOrder: number;
}

export interface InstanceTemplateResponse {
  id: number;
  name: string;
  description?: string | null;
  templateType: InstanceTemplateType;
  mandatoryTagKeys: string[];
  isActive: boolean;
  createdBy: TemplateCreatorResponse;
  modules: InstanceTemplateModuleResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplateModuleDefaultResponse {
  id: number;
  moduleId: number;
  moduleType: ProvisioningModuleType;
  name: string;
  sortOrder: number;
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
}

export interface TemplateDefaultResponse {
  id: number;
  name: string;
  description?: string | null;
  templateType: InstanceTemplateType;
  mandatoryTagKeys: string[];
  isActive: boolean;
  createdBy: TemplateCreatorResponse;
  modules: TemplateModuleDefaultResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface InstanceTemplateModulePayload {
  moduleId: number;
  sortOrder?: number;
}

export interface CreateInstanceTemplatePayload {
  name: string;
  description?: string | null;
  templateType: InstanceTemplateType;
  mandatoryTagKeys: string[];
  modules: InstanceTemplateModulePayload[];
}

export interface ProvisioningFormState {
  tags: ProvisioningTag[];
  securityGroups: ProvisioningSecurityGroup[];
  securityGroupRules: ProvisioningSecurityGroupRule[];
  networkConfig: ProvisioningNetworkConfig | null;
  networkSubnets: ProvisioningNetworkSubnet[];
  amiConfig: ProvisioningAmiConfig | null;
  keypairConfig: ProvisioningKeypairConfig | null;
  userData: ProvisioningUserData | null;
  instanceOptions: ProvisioningInstanceOptions | null;
  volumeItems: ProvisioningVolumeItem[];
}
