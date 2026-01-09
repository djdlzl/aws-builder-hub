import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { User, UserRole, AuthState } from "@/types/auth";
import { API_CONFIG, buildApiUrl } from "@/config/api";

interface AuthContextType extends AuthState {
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithOkta: () => void;
  logout: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage key for auth token
const AUTH_TOKEN_KEY = "cloudforge_auth_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);

      if (!token) {
        setAuthState({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      try {
        const response = await fetch(
          buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.ME),
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const user = await response.json();
          setAuthState({ user, isAuthenticated: true, isLoading: false });
        } else {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        // For demo purposes, if backend is not available, allow mock login
        setAuthState({ user: null, isAuthenticated: false, isLoading: false });
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch(
          buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.LOGIN),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username: email, password }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const result = data.result || data;
          const token = result.accessToken || result.token;
          const user = result.user;

          localStorage.setItem(AUTH_TOKEN_KEY, token);
          localStorage.setItem("access_token", token);
          localStorage.setItem("user_role", user.role);

          setAuthState({
            user: {
              id: String(user.id),
              email: user.email,
              name: user.name,
              role: user.role === "ADMIN" ? "admin" : "developer",
            },
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true };
        } else {
          const error = await response.json();
          return {
            success: false,
            error: error.message || "로그인에 실패했습니다.",
          };
        }
      } catch (error) {
        console.error("Login failed:", error);
        // Demo mode: allow mock login when backend is unavailable
        if (email === "admin@cloudforge.io" && password === "password") {
          const mockUser: User = {
            id: "1",
            email: "admin@cloudforge.io",
            name: "Admin User",
            role: "admin",
          };
          localStorage.setItem(AUTH_TOKEN_KEY, "mock-token-admin");
          setAuthState({
            user: mockUser,
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true };
        } else if (email === "dev@cloudforge.io" && password === "password") {
          const mockUser: User = {
            id: "2",
            email: "dev@cloudforge.io",
            name: "Developer User",
            role: "developer",
          };
          localStorage.setItem(AUTH_TOKEN_KEY, "mock-token-dev");
          setAuthState({
            user: mockUser,
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true };
        }
        return { success: false, error: "백엔드 서버에 연결할 수 없습니다." };
      }
    },
    []
  );

  const loginWithOkta = useCallback(() => {
    // Redirect to Okta login via backend
    window.location.href = buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.OKTA_LOGIN);
  }, []);

  const logout = useCallback(async () => {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (token) {
        await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.LOGOUT), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout API call failed:", error);
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_role");
      setAuthState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  const hasRole = useCallback(
    (role: UserRole): boolean => {
      return authState.user?.role === role;
    },
    [authState.user]
  );

  const isAdmin = authState.user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        loginWithOkta,
        logout,
        hasRole,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
