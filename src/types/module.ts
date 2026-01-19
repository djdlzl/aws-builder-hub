export type ModuleType = "TAG" | "SECURITY_GROUP" | "OPTION";

export interface TagModuleCreator {
  id: number;
  name: string;
  email: string;
}

export interface TagModuleItem {
  key: string;
  value?: string | null;
  isMandatory: boolean;
}

export interface TagModule {
  id: number;
  name: string;
  description?: string | null;
  moduleType: ModuleType;
  createdBy: TagModuleCreator;
  items: TagModuleItem[];
  createdAt: string;
  updatedAt: string;
}

export interface TagModuleItemPayload {
  key: string;
  value?: string | null;
}

export interface TagModulePayload {
  name: string;
  description?: string | null;
  items: TagModuleItemPayload[];
}

export interface MandatoryTagKey {
  id: number;
  tagKey: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMandatoryTagKeyPayload {
  tagKey: string;
  description?: string | null;
}

export interface UpdateMandatoryTagKeyPayload {
  description?: string | null;
  isActive?: boolean | null;
}
