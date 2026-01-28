/**
 * 네트워크 토폴로지 상태 관리 Hook
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
} from "react";
import { useAuth } from "@/hooks/use-auth";
import type {
  NetworkTopologyState,
  NetworkTopologyActions,
  NetworkTopologyData,
  CacheStatusInfo,
  SyncProgress,
} from "@/types/network-topology";
import {
  getNetworkTopology,
  getCacheStatus,
  getSyncProgress,
  refreshNetworkTopology,
  handleApiError,
  withRetry,
} from "@/lib/api/network-topology";

// 액션 타입 정의
type NetworkTopologyAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_REFRESHING"; payload: boolean }
  | { type: "SET_TOPOLOGY_DATA"; payload: NetworkTopologyData | null }
  | { type: "SET_CACHE_STATUS"; payload: CacheStatusInfo | null }
  | { type: "SET_SYNC_PROGRESS"; payload: SyncProgress | null }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "CLEAR_ERROR" };

// 초기 상태
const initialState: NetworkTopologyState = {
  topologyData: null,
  cacheStatus: null,
  syncProgress: null,
  isLoading: false,
  isRefreshing: false,
  error: null,
};

// 리듀서 함수
function networkTopologyReducer(
  state: NetworkTopologyState,
  action: NetworkTopologyAction,
): NetworkTopologyState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_REFRESHING":
      return { ...state, isRefreshing: action.payload };
    case "SET_TOPOLOGY_DATA":
      return { ...state, topologyData: action.payload };
    case "SET_CACHE_STATUS":
      return { ...state, cacheStatus: action.payload };
    case "SET_SYNC_PROGRESS":
      return { ...state, syncProgress: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
}

// 컨텍스트 생성
const NetworkTopologyContext = createContext<
  (NetworkTopologyState & NetworkTopologyActions) | undefined
>(undefined);

// Provider 컴포넌트
interface NetworkTopologyProviderProps {
  children: React.ReactNode;
}

export function NetworkTopologyProvider({
  children,
}: NetworkTopologyProviderProps) {
  const [state, dispatch] = useReducer(networkTopologyReducer, initialState);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // 토폴로지 데이터 조회
  const fetchTopologyData = useCallback(async () => {
    try {
      dispatch({ type: "CLEAR_ERROR" });
      const response = await withRetry(() => getNetworkTopology());

      if (response.success && response.data) {
        dispatch({ type: "SET_TOPOLOGY_DATA", payload: response.data });
      } else {
        dispatch({ type: "SET_TOPOLOGY_DATA", payload: null });
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      dispatch({ type: "SET_ERROR", payload: errorMessage });
      console.error("Failed to fetch topology data:", error);
    }
  }, []);

  // 캐시 상태 조회
  const fetchCacheStatus = useCallback(async () => {
    try {
      const response = await withRetry(() => getCacheStatus());

      if (response.success && response.data) {
        dispatch({ type: "SET_CACHE_STATUS", payload: response.data });
      } else {
        dispatch({ type: "SET_CACHE_STATUS", payload: null });
      }
    } catch (error) {
      console.error("Failed to fetch cache status:", error);
      // 캐시 상태 조회 실패는 사용자에게 오류로 표시하지 않음
    }
  }, []);

  // 동기화 진행 상태 조회
  const fetchSyncProgress = useCallback(async () => {
    try {
      const response = await withRetry(() => getSyncProgress());

      if (response.success) {
        dispatch({ type: "SET_SYNC_PROGRESS", payload: response.data ?? null });
      } else {
        dispatch({ type: "SET_SYNC_PROGRESS", payload: null });
      }
    } catch (error) {
      console.error("Failed to fetch sync progress:", error);
      // 동기화 상태 조회 실패는 사용자에게 오류로 표시하지 않음
    }
  }, []);

  // 데이터 새로 고침
  const refreshData = useCallback(async () => {
    try {
      dispatch({ type: "SET_REFRESHING", payload: true });
      dispatch({ type: "CLEAR_ERROR" });

      const response = await refreshNetworkTopology();

      if (!response.success || !response.data?.success) {
        dispatch({
          type: "SET_ERROR",
          payload:
            response.data?.message ||
            response.message ||
            "새로 고침을 시작할 수 없습니다.",
        });
        return;
      }

      await Promise.all([
        fetchTopologyData(),
        fetchCacheStatus(),
        fetchSyncProgress(),
      ]);
    } catch (error) {
      const errorMessage = handleApiError(error);
      dispatch({ type: "SET_ERROR", payload: errorMessage });
      dispatch({ type: "SET_REFRESHING", payload: false });
      console.error("Failed to refresh data:", error);
    } finally {
      dispatch({ type: "SET_REFRESHING", payload: false });
    }
  }, [fetchTopologyData, fetchCacheStatus, fetchSyncProgress]);

  // 오류 클리어
  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  // 초기 데이터 로딩 (state 기반 중복 방지)
  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (authLoading || !isAuthenticated || !token) {
      dispatch({ type: "SET_LOADING", payload: false });
      return;
    }

    // 이미 로딩 중이거나 인증 실패 상태면 추가 요청 방지
    const isAuthError =
      state.error &&
      (state.error.includes("401") ||
        state.error.includes("로그인이 필요합니다."));

    if (state.isLoading || isAuthError) {
      return;
    }

    const loadInitialData = async () => {
      dispatch({ type: "SET_LOADING", payload: true });

      await Promise.all([
        fetchTopologyData(),
        fetchCacheStatus(),
        fetchSyncProgress(),
      ]);

      dispatch({ type: "SET_LOADING", payload: false });
    };

    loadInitialData();
  }, [
    authLoading,
    isAuthenticated,
    // state 변경에 따른 재실행 방지를 위해 제거
    // state.isLoading,
    // state.error,
    fetchTopologyData,
    fetchCacheStatus,
    fetchSyncProgress,
  ]);

  const value = {
    ...state,
    fetchTopologyData,
    fetchCacheStatus,
    fetchSyncProgress,
    refreshData,
    clearError,
  };

  return (
    <NetworkTopologyContext.Provider value={value}>
      {children}
    </NetworkTopologyContext.Provider>
  );
}

// Hook
export function useNetworkTopology() {
  const context = useContext(NetworkTopologyContext);
  if (context === undefined) {
    throw new Error(
      "useNetworkTopology must be used within a NetworkTopologyProvider",
    );
  }
  return context;
}
