/**
 * 네트워크 토폴로지 프론트엔드 통합 테스트
 * 전체 사용자 워크플로우와 시스템 통합을 검증합니다.
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import NetworkTopology from "../../../pages/NetworkTopology";
import { NetworkTopologyProvider } from "@/hooks/use-network-topology";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NodeType } from "@/types/network-topology";

// Mock API 응답
const mockTopologyData = {
  nodes: [
    {
      id: "account-1",
      type: "ACCOUNT",
      label: "Test Account",
      metadata: { accountId: "account-1", accountName: "Test Account" },
      position: { x: 100, y: 100 },
      parent: null,
    },
    {
      id: "region-1",
      type: "REGION",
      label: "us-east-1",
      metadata: { regionName: "us-east-1", accountId: "account-1" },
      position: { x: 150, y: 150 },
      parent: "account-1",
    },
    {
      id: "vpc-1",
      type: "VPC",
      label: "vpc-12345 (10.0.0.0/16)",
      metadata: { vpcId: "vpc-12345", cidrBlock: "10.0.0.0/16" },
      position: { x: 200, y: 200 },
      parent: "region-1",
    },
  ],
  edges: [
    {
      id: "edge-1",
      source: "vpc-1",
      target: "vpc-2",
      type: "VPC_PEERING",
      metadata: { state: "active", bandwidth: 1000 },
    },
  ],
  hierarchy: {
    accounts: {
      "account-1": {
        accountId: "account-1",
        accountName: "Test Account",
        regions: {
          "us-east-1": {
            regionName: "us-east-1",
            vpcs: {
              "vpc-12345": {
                vpcId: "vpc-12345",
                cidrBlock: "10.0.0.0/16",
                subnets: {
                  "subnet-1": {
                    subnetId: "subnet-1",
                    cidrBlock: "10.0.1.0/24",
                    availabilityZone: "us-east-1a",
                    isPublic: true,
                  },
                },
                gateways: {
                  "igw-1": {
                    gatewayId: "igw-1",
                    gatewayType: "IGW",
                    state: "attached",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  lastUpdated: new Date().toISOString(),
  cacheStatus: "HIT",
};

const mockCacheStatus = {
  isDataAvailable: true,
  lastUpdated: new Date().toISOString(),
  nextScheduledUpdate: new Date(Date.now() + 3600000).toISOString(),
  isUpdateInProgress: false,
  cacheHitRate: 0.85,
};

// API 모킹
const mockFetch = vi.fn();
global.fetch = mockFetch;

// D3.js 모킹
vi.mock("d3", () => ({
  select: vi.fn(() => ({
    selectAll: vi.fn(() => ({
      remove: vi.fn(),
      data: vi.fn(() => ({
        enter: vi.fn(() => ({
          append: vi.fn(() => ({
            attr: vi.fn(() => ({ attr: vi.fn() })),
            style: vi.fn(() => ({ style: vi.fn() })),
            text: vi.fn(),
            on: vi.fn(),
          })),
        })),
      })),
    })),
    attr: vi.fn(() => ({ attr: vi.fn() })),
    append: vi.fn(() => ({
      attr: vi.fn(() => ({ attr: vi.fn() })),
      append: vi.fn(() => ({
        attr: vi.fn(() => ({ attr: vi.fn() })),
      })),
    })),
    call: vi.fn(),
  })),
  zoom: vi.fn(() => ({
    scaleExtent: vi.fn(() => ({
      on: vi.fn(() => ({ on: vi.fn() })),
    })),
  })),
  zoomIdentity: {
    translate: vi.fn(() => ({
      scale: vi.fn(),
    })),
  },
}));

// WebSocket 모킹
class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState: number = MockWebSocket.CONNECTING;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event("open"));
    }, 100);
  }

  send(_data: string) {
    // 메시지 전송 시뮬레이션
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent("close"));
  }
}

global.WebSocket = MockWebSocket as unknown as typeof WebSocket;

describe("Network Topology Integration Tests", () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    user = userEvent.setup();

    // 기본 API 응답 설정
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/v1/network/topology")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: mockTopologyData,
            }),
        });
      }
      if (url.includes("/api/v1/network/cache-status")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: mockCacheStatus,
            }),
        });
      }
      if (url.includes("/api/v1/network/refresh")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: { message: "새로 고침이 시작되었습니다." },
            }),
        });
      }
      return Promise.reject(new Error("Unknown endpoint"));
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <NetworkTopologyProvider>{component}</NetworkTopologyProvider>
      </QueryClientProvider>,
    );
  };

  describe("Complete User Workflows", () => {
    it("첫 방문 사용자 워크플로우 테스트", async () => {
      // Given: 첫 방문 사용자
      renderWithProviders(<NetworkTopology />);

      // When: 페이지 로드
      expect(screen.getByText("전역 네트워크 토폴로지")).toBeInTheDocument();

      // Then: 로딩 상태 표시
      expect(screen.getByText(/로딩 중/)).toBeInTheDocument();

      // 데이터 로드 완료 대기
      await waitFor(() => {
        expect(
          screen.getByText("네트워크 토폴로지 시각화"),
        ).toBeInTheDocument();
      });

      // 토폴로지 통계 확인
      expect(screen.getByText("3")).toBeInTheDocument(); // 노드 수
      expect(screen.getByText("1")).toBeInTheDocument(); // 엣지 수
      expect(screen.getByText("1")).toBeInTheDocument(); // 계정 수

      console.log("첫 방문 사용자 워크플로우 완료");
    });

    it("데이터 새로 고침 워크플로우 테스트", async () => {
      // Given: 기존 데이터가 있는 상태
      renderWithProviders(<NetworkTopology />);

      await waitFor(() => {
        expect(
          screen.getByText("네트워크 토폴로지 시각화"),
        ).toBeInTheDocument();
      });

      // When: 새로 고침 버튼 클릭
      const refreshButton = screen.getByRole("button", { name: /새로 고침/ });
      await user.click(refreshButton);

      // Then: 새로 고침 진행 상태 표시
      await waitFor(() => {
        expect(screen.getByText(/새로 고침 시작/)).toBeInTheDocument();
      });

      console.log("데이터 새로 고침 워크플로우 완료");
    });

    it("오류 발생 및 복구 워크플로우 테스트", async () => {
      // Given: API 오류 상황 설정
      mockFetch.mockImplementationOnce(() =>
        Promise.reject(new Error("Network error")),
      );

      renderWithProviders(<NetworkTopology />);

      // When: 오류 발생
      await waitFor(() => {
        expect(screen.getByText(/오류 발생/)).toBeInTheDocument();
      });

      // Then: 오류 메시지 표시 확인
      expect(screen.getByText(/Network error/)).toBeInTheDocument();

      // 다시 시도 버튼 클릭
      const retryButton = screen.getByRole("button", { name: /다시 시도/ });

      // API 정상화
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/v1/network/topology")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                data: mockTopologyData,
              }),
          });
        }
        return Promise.reject(new Error("Unknown endpoint"));
      });

      await user.click(retryButton);

      // 복구 확인
      await waitFor(() => {
        expect(
          screen.getByText("네트워크 토폴로지 시각화"),
        ).toBeInTheDocument();
      });

      console.log("오류 발생 및 복구 워크플로우 완료");
    });
  });

  describe("Real-time Features", () => {
    it("실시간 동기화 진행률 표시 테스트", async () => {
      // Given: 동기화 진행 중 상태 모킹
      const mockSyncProgress = {
        isInProgress: true,
        currentStep: "AWS 계정 정보 수집",
        totalSteps: 5,
        completedSteps: 2,
        estimatedTimeRemaining: 120,
        message: "AWS 리소스를 수집하고 있습니다.",
        progress: 0.4,
      };

      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/v1/network/sync-progress")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                data: mockSyncProgress,
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: null }),
        });
      });

      renderWithProviders(<NetworkTopology />);

      // When: 동기화 진행 상태 확인
      await waitFor(() => {
        expect(screen.getByText("AWS 계정 정보 수집")).toBeInTheDocument();
      });

      // Then: 진행률 표시 확인
      expect(screen.getByText("(2/5)")).toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toBeInTheDocument();

      console.log("실시간 동기화 진행률 표시 테스트 완료");
    });

    it("WebSocket 연결 상태 모니터링 테스트", async () => {
      renderWithProviders(<NetworkTopology />);

      await waitFor(() => {
        expect(screen.getByText("전역 네트워크 토폴로지")).toBeInTheDocument();
      });

      // WebSocket 연결 상태 확인 (연결됨 상태)
      expect(screen.getByText(/연결됨/)).toBeInTheDocument();

      console.log("WebSocket 연결 상태 모니터링 테스트 완료");
    });
  });

  describe("Performance and Optimization", () => {
    it("대용량 데이터 성능 최적화 테스트", async () => {
      // Given: 대용량 데이터셋
      const largeDataset = {
        ...mockTopologyData,
        nodes: Array.from({ length: 600 }, (_, i) => ({
          id: `node-${i}`,
          type: "SUBNET",
          label: `Subnet ${i}`,
          metadata: { subnetId: `subnet-${i}` },
          position: { x: i * 10, y: i * 10 },
          parent: "vpc-1",
        })),
        edges: Array.from({ length: 1200 }, (_, i) => ({
          id: `edge-${i}`,
          source: `node-${i % 600}`,
          target: `node-${(i + 1) % 600}`,
          type: "ROUTE",
          metadata: { state: "active" },
        })),
      };

      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/v1/network/topology")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                data: largeDataset,
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: null }),
        });
      });

      const startTime = performance.now();

      // When: 대용량 데이터 렌더링
      renderWithProviders(<NetworkTopology />);

      await waitFor(
        () => {
          expect(screen.getByText("600")).toBeInTheDocument(); // 노드 수
        },
        { timeout: 10000 },
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Then: 성능 기준 검증
      expect(renderTime).toBeLessThan(10000); // 10초 이내

      // 성능 경고 표시 확인
      expect(screen.getByText(/성능 경고/)).toBeInTheDocument();

      console.log(`대용량 데이터 렌더링 시간: ${renderTime.toFixed(2)}ms`);
    });

    it("메모리 사용량 모니터링 테스트", async () => {
      // Given: 메모리 집약적인 데이터
      const memoryIntensiveData = {
        ...mockTopologyData,
        nodes: Array.from({ length: 100 }, (_, i) => ({
          id: `node-${i}`,
          type: "SUBNET",
          label: `Subnet ${i}`,
          metadata: {
            subnetId: `subnet-${i}`,
            // 큰 메타데이터 객체
            largeData: Array.from({ length: 1000 }, (_, j) => `data-${j}`).join(
              ",",
            ),
          },
          position: { x: i * 10, y: i * 10 },
          parent: "vpc-1",
        })),
      };

      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/v1/network/topology")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                data: memoryIntensiveData,
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: null }),
        });
      });

      // When: 메모리 집약적 데이터 렌더링
      const { unmount } = renderWithProviders(<NetworkTopology />);

      await waitFor(() => {
        expect(screen.getByText("100")).toBeInTheDocument();
      });

      // Then: 메모리 경고 확인 (성능 경고에 포함)
      await waitFor(() => {
        expect(screen.getByText(/성능 경고/)).toBeInTheDocument();
      });

      // 컴포넌트 언마운트로 메모리 정리
      unmount();

      console.log("메모리 사용량 모니터링 테스트 완료");
    });
  });

  describe("Cross-browser Compatibility", () => {
    it("다양한 브라우저 환경 시뮬레이션 테스트", async () => {
      // Given: 다양한 브라우저 환경 시뮬레이션
      const browserEnvironments = [
        {
          userAgent: "Chrome/91.0.4472.124",
          features: { webgl: true, svg: true },
        },
        { userAgent: "Firefox/89.0", features: { webgl: true, svg: true } },
        { userAgent: "Safari/14.1.1", features: { webgl: false, svg: true } },
        { userAgent: "Edge/91.0.864.59", features: { webgl: true, svg: true } },
      ];

      for (const env of browserEnvironments) {
        // 브라우저 환경 설정
        Object.defineProperty(navigator, "userAgent", {
          value: env.userAgent,
          configurable: true,
        });

        // When: 컴포넌트 렌더링
        const { unmount } = renderWithProviders(<NetworkTopology />);

        // Then: 정상 렌더링 확인
        await waitFor(() => {
          expect(
            screen.getByText("전역 네트워크 토폴로지"),
          ).toBeInTheDocument();
        });

        unmount();
      }

      console.log("크로스 브라우저 호환성 테스트 완료");
    });
  });

  describe("Accessibility", () => {
    it("접근성 기능 테스트", async () => {
      renderWithProviders(<NetworkTopology />);

      await waitFor(() => {
        expect(
          screen.getByText("네트워크 토폴로지 시각화"),
        ).toBeInTheDocument();
      });

      // 키보드 네비게이션 테스트
      const refreshButton = screen.getByRole("button", { name: /새로 고침/ });
      refreshButton.focus();
      expect(document.activeElement).toBe(refreshButton);

      // ARIA 레이블 확인
      const svg = screen.getByRole("img", { hidden: true });
      expect(svg).toBeInTheDocument();

      // 스크린 리더 지원 확인
      expect(screen.getByText("전역 네트워크 토폴로지")).toHaveAttribute(
        "role",
        "heading",
      );

      console.log("접근성 기능 테스트 완료");
    });
  });

  describe("Error Boundaries and Recovery", () => {
    it("시각화 오류 경계 테스트", async () => {
      // Given: 오류를 발생시키는 데이터
      const corruptedData = {
        ...mockTopologyData,
        nodes: [{ id: "invalid", type: "INVALID_TYPE" as NodeType }],
      };

      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/v1/network/topology")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                data: corruptedData,
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: null }),
        });
      });

      // When: 오류 발생 상황
      renderWithProviders(<NetworkTopology />);

      // Then: 오류 경계 동작 확인
      await waitFor(() => {
        expect(screen.getByText(/시각화 오류/)).toBeInTheDocument();
      });

      // 복구 옵션 확인
      expect(
        screen.getByRole("button", { name: /다시 시도/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /성능 최적화 모드/ }),
      ).toBeInTheDocument();

      console.log("시각화 오류 경계 테스트 완료");
    });
  });

  describe("Data Consistency", () => {
    it("데이터 일관성 검증 테스트", async () => {
      renderWithProviders(<NetworkTopology />);

      await waitFor(() => {
        expect(
          screen.getByText("네트워크 토폴로지 시각화"),
        ).toBeInTheDocument();
      });

      // 통계 데이터 일관성 확인
      const nodeCount = screen.getByText("3"); // 노드 수
      const edgeCount = screen.getByText("1"); // 엣지 수
      const accountCount = screen.getByText("1"); // 계정 수

      expect(nodeCount).toBeInTheDocument();
      expect(edgeCount).toBeInTheDocument();
      expect(accountCount).toBeInTheDocument();

      // 캐시 상태와 데이터 일관성 확인
      expect(screen.getByText(/캐시됨/)).toBeInTheDocument();

      console.log("데이터 일관성 검증 테스트 완료");
    });
  });
});

// 테스트 유틸리티 함수들

function createMockTopologyData(nodeCount: number, edgeCount: number) {
  return {
    nodes: Array.from({ length: nodeCount }, (_, i) => ({
      id: `node-${i}`,
      type: "SUBNET",
      label: `Node ${i}`,
      metadata: { index: i },
      position: { x: i * 10, y: i * 10 },
      parent: null,
    })),
    edges: Array.from({ length: edgeCount }, (_, i) => ({
      id: `edge-${i}`,
      source: `node-${i % nodeCount}`,
      target: `node-${(i + 1) % nodeCount}`,
      type: "ROUTE",
      metadata: { state: "active" },
    })),
    hierarchy: { accounts: {} },
    lastUpdated: new Date().toISOString(),
    cacheStatus: "HIT",
  };
}

function simulateNetworkDelay(ms: number = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
