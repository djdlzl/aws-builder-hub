import { useState, useEffect } from "react";

interface EC2Instance {
  id: string;
  name: string;
  type: string;
  status: "running" | "stopped" | "pending" | "terminated";
  publicIp: string;
  privateIp: string;
  az: string;
  accountName?: string;
  region?: string;
}

export default function EC2() {
  const [instances, setInstances] = useState<EC2Instance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccounts, setHasAccounts] = useState(false);

  useEffect(() => {
    const fetchInstances = async () => {
      // Check if admin_demo user is logged in
      const isDemoAdmin =
        localStorage.getItem("cloudforge_auth_token") ===
        "mock-token-admin-demo";

      if (isDemoAdmin) {
        // Load dummy EC2 instances for admin_demo
        const dummyInstances: EC2Instance[] = [
          {
            id: "i-1234567890abcdef0",
            name: "demo-web-server-01",
            type: "t3.medium",
            status: "running",
            publicIp: "54.180.1.100",
            privateIp: "10.0.1.100",
            az: "ap-northeast-2c",
            accountName: "Demo Production Account",
            region: "ap-northeast-2",
          },
        ];

        setInstances(dummyInstances);
        setHasAccounts(true);
        setIsLoading(false);
        return;
      }

      // For non-demo users, check if they have accounts
      const token = localStorage.getItem("cloudforge_auth_token");
      if (!token) {
        setHasAccounts(false);
        setIsLoading(false);
        return;
      }

      setHasAccounts(false);
      setIsLoading(false);
    };

    fetchInstances();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!hasAccounts) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">EC2 인스턴스</h1>
          <p className="text-gray-600 mt-1">가상 서버 인스턴스를 관리합니다</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <div className="h-16 w-16 mx-auto mb-4 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            연결된 AWS 계정이 없습니다
          </h2>
          <p className="text-gray-600">AWS 계정을 먼저 연결해주세요.</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-green-100 text-green-800";
      case "stopped":
        return "bg-gray-100 text-gray-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "terminated":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "running":
        return "실행중";
      case "stopped":
        return "중지됨";
      case "pending":
        return "대기중";
      case "terminated":
        return "종료됨";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">EC2 인스턴스</h1>
          <p className="text-gray-600 mt-1">가상 서버 인스턴스를 관리합니다</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center">
          <svg
            className="h-4 w-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          인스턴스 생성
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="인스턴스 검색..."
            className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        <select className="border border-gray-300 rounded-md px-3 py-2">
          <option value="all">전체</option>
          <option value="running">실행중</option>
          <option value="stopped">중지됨</option>
        </select>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                인스턴스
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                유형
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                퍼블릭 IP
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                프라이빗 IP
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                가용영역
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                액션
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {instances.map((instance) => (
              <tr
                key={instance.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-orange-100 flex items-center justify-center">
                      <svg
                        className="h-4 w-4 text-orange-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {instance.name}
                      </p>
                      <code className="text-xs font-mono text-gray-500">
                        {instance.id}
                      </code>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-mono border border-gray-200">
                    {instance.type}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(
                      instance.status
                    )}`}
                  >
                    {getStatusLabel(instance.status)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <code className="text-sm font-mono text-gray-900">
                    {instance.publicIp}
                  </code>
                </td>
                <td className="px-4 py-4">
                  <code className="text-sm font-mono text-gray-500">
                    {instance.privateIp}
                  </code>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-gray-500">{instance.az}</span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-1">
                    {instance.status === "stopped" ? (
                      <button className="p-1 text-green-600 hover:text-green-800">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </button>
                    ) : (
                      <button className="p-1 text-yellow-600 hover:text-yellow-800">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 10h6v4H9z"
                          />
                        </svg>
                      </button>
                    )}
                    <button className="p-1 text-gray-600 hover:text-gray-800">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </button>
                    <button className="p-1 text-gray-600 hover:text-gray-800">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                        />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
