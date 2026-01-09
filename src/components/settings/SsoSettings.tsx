import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Shield,
  Plus,
  Trash2,
  TestTube,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { API_CONFIG, buildApiUrl } from "@/config/api";
import { useToast } from "@/hooks/use-toast";

interface SsoConfig {
  id: number;
  provider: string;
  protocol: string;
  enabled: boolean;
  clientId: string | null;
  issuerUri: string | null;
  authorizationUri: string | null;
  tokenUri: string | null;
  userInfoUri: string | null;
  jwksUri: string | null;
  entityId: string | null;
  ssoUrl: string | null;
  hasCertificate: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SsoFormData {
  provider: string;
  protocol: string;
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  issuerUri: string;
  authorizationUri: string;
  tokenUri: string;
  userInfoUri: string;
  jwksUri: string;
  entityId: string;
  ssoUrl: string;
  certificate: string;
}

const initialFormData: SsoFormData = {
  provider: "OKTA",
  protocol: "OIDC",
  enabled: false,
  clientId: "",
  clientSecret: "",
  issuerUri: "",
  authorizationUri: "",
  tokenUri: "",
  userInfoUri: "",
  jwksUri: "",
  entityId: "",
  ssoUrl: "",
  certificate: "",
};

export default function SsoSettings() {
  const [configs, setConfigs] = useState<SsoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<SsoFormData>(initialFormData);
  const { toast } = useToast();

  const getAuthToken = () => localStorage.getItem("auth_token");

  const fetchConfigs = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SSO.CONFIGS}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setConfigs(data);
      }
    } catch (error) {
      console.error("Failed to fetch SSO configs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = getAuthToken();
      const url = editingId
        ? buildApiUrl(API_CONFIG.ENDPOINTS.SSO.CONFIG, {
            id: String(editingId),
          })
        : `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SSO.CONFIGS}`;

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "성공",
          description: editingId
            ? "SSO 설정이 업데이트되었습니다."
            : "SSO 설정이 생성되었습니다.",
        });
        setShowForm(false);
        setEditingId(null);
        setFormData(initialFormData);
        fetchConfigs();
      } else {
        throw new Error("Failed to save SSO config");
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "SSO 설정 저장에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (id: number) => {
    setTesting(id);
    try {
      const token = getAuthToken();
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.SSO.TEST, { id: String(id) }),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();
      toast({
        title: result.success ? "연결 성공" : "연결 실패",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "오류",
        description: "연결 테스트에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setTesting(null);
    }
  };

  const handleToggle = async (id: number, enabled: boolean) => {
    try {
      const token = getAuthToken();
      const endpoint = enabled
        ? API_CONFIG.ENDPOINTS.SSO.ENABLE
        : API_CONFIG.ENDPOINTS.SSO.DISABLE;

      const response = await fetch(buildApiUrl(endpoint, { id: String(id) }), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast({
          title: "성공",
          description: enabled
            ? "SSO가 활성화되었습니다."
            : "SSO가 비활성화되었습니다.",
        });
        fetchConfigs();
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "SSO 상태 변경에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      const token = getAuthToken();
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.SSO.CONFIG, { id: String(id) }),
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        toast({
          title: "성공",
          description: "SSO 설정이 삭제되었습니다.",
        });
        fetchConfigs();
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "삭제에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (config: SsoConfig) => {
    setEditingId(config.id);
    setFormData({
      provider: config.provider,
      protocol: config.protocol,
      enabled: config.enabled,
      clientId: config.clientId || "",
      clientSecret: "",
      issuerUri: config.issuerUri || "",
      authorizationUri: config.authorizationUri || "",
      tokenUri: config.tokenUri || "",
      userInfoUri: config.userInfoUri || "",
      jwksUri: config.jwksUri || "",
      entityId: config.entityId || "",
      ssoUrl: config.ssoUrl || "",
      certificate: "",
    });
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5" />
            SSO / IdP 설정
          </h3>
          <p className="text-sm text-muted-foreground">
            외부 ID 제공자(Okta, Azure AD 등)를 통한 Single Sign-On을
            설정합니다.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            SSO 추가
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "SSO 설정 수정" : "새 SSO 설정"}</CardTitle>
            <CardDescription>
              OIDC 또는 SAML 프로토콜을 사용하여 외부 IdP를 연결합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select
                    value={formData.provider}
                    onValueChange={(value) =>
                      setFormData({ ...formData, provider: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OKTA">Okta</SelectItem>
                      <SelectItem value="AZURE_AD">Azure AD</SelectItem>
                      <SelectItem value="GOOGLE">Google</SelectItem>
                      <SelectItem value="CUSTOM">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Protocol</Label>
                  <Select
                    value={formData.protocol}
                    onValueChange={(value) =>
                      setFormData({ ...formData, protocol: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OIDC">
                        OIDC (OpenID Connect)
                      </SelectItem>
                      <SelectItem value="SAML">SAML 2.0</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.protocol === "OIDC" && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-medium">OIDC 설정</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Client ID *</Label>
                      <Input
                        value={formData.clientId}
                        onChange={(e) =>
                          setFormData({ ...formData, clientId: e.target.value })
                        }
                        placeholder="0oa1234567890abcdef"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Secret *</Label>
                      <Input
                        type="password"
                        value={formData.clientSecret}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            clientSecret: e.target.value,
                          })
                        }
                        placeholder={
                          editingId ? "(변경하지 않으려면 비워두세요)" : ""
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Issuer URI *</Label>
                    <Input
                      value={formData.issuerUri}
                      onChange={(e) =>
                        setFormData({ ...formData, issuerUri: e.target.value })
                      }
                      placeholder="https://your-domain.okta.com/oauth2/default"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Authorization URI (선택)</Label>
                      <Input
                        value={formData.authorizationUri}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            authorizationUri: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Token URI (선택)</Label>
                      <Input
                        value={formData.tokenUri}
                        onChange={(e) =>
                          setFormData({ ...formData, tokenUri: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.protocol === "SAML" && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-medium">SAML 설정</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Entity ID *</Label>
                      <Input
                        value={formData.entityId}
                        onChange={(e) =>
                          setFormData({ ...formData, entityId: e.target.value })
                        }
                        placeholder="http://www.okta.com/exk1234567890"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SSO URL *</Label>
                      <Input
                        value={formData.ssoUrl}
                        onChange={(e) =>
                          setFormData({ ...formData, ssoUrl: e.target.value })
                        }
                        placeholder="https://your-domain.okta.com/app/.../sso/saml"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>X.509 Certificate *</Label>
                    <Textarea
                      value={formData.certificate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          certificate: e.target.value,
                        })
                      }
                      placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                      rows={5}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingId ? "수정" : "저장"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData(initialFormData);
                  }}
                >
                  취소
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {configs.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>설정된 SSO가 없습니다.</p>
            <p className="text-sm">
              위의 "SSO 추가" 버튼을 클릭하여 설정을 시작하세요.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {configs.map((config) => (
            <Card key={config.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{config.provider}</span>
                        <Badge variant="outline">{config.protocol}</Badge>
                        {config.enabled ? (
                          <Badge className="bg-green-500">활성</Badge>
                        ) : (
                          <Badge variant="secondary">비활성</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {config.issuerUri || config.ssoUrl || "설정된 URL 없음"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={config.enabled}
                      onCheckedChange={(checked) =>
                        handleToggle(config.id, checked)
                      }
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest(config.id)}
                      disabled={testing === config.id}
                    >
                      {testing === config.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(config)}
                    >
                      수정
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(config.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
