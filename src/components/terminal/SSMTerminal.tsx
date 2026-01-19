import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { API_CONFIG, buildApiUrl, buildWsUrl } from "../../config/api";

interface SSMTerminalProps {
  instanceId: string;
  instanceName: string;
  onClose?: () => void;
}

interface SsmSessionResponse {
  result: {
    sessionId: string;
    wsUrl: string;
  };
}

export function SSMTerminal({
  instanceId,
  instanceName,
  onClose,
}: SSMTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthToken = useCallback(() => {
    return localStorage.getItem("access_token");
  }, []);

  const terminateSession = useCallback(async () => {
    if (sessionIdRef.current) {
      try {
        const token = getAuthToken();
        await fetch(
          buildApiUrl(API_CONFIG.ENDPOINTS.SSM.TERMINATE_SESSION, {
            sessionId: sessionIdRef.current,
          }),
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } catch (e) {
        console.error("Failed to terminate session:", e);
      }
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, [getAuthToken]);

  const encodeInputPayload = (input: string): string | null => {
    try {
      const bytes = new TextEncoder().encode(input);
      return encodeBase64(bytes);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("SSM input encode failed", {
        timestamp: new Date().toISOString(),
        env: import.meta.env.MODE,
        sessionId: sessionIdRef.current,
        instanceId,
        length: input.length,
        error: errorMessage,
      });
      return null;
    }
  };

  const encodeBase64 = (bytes: Uint8Array): string => {
    const alphabet =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let output = "";
    let i = 0;

    for (; i + 2 < bytes.length; i += 3) {
      const triple = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
      output += alphabet[(triple >> 18) & 0x3f];
      output += alphabet[(triple >> 12) & 0x3f];
      output += alphabet[(triple >> 6) & 0x3f];
      output += alphabet[triple & 0x3f];
    }

    const remaining = bytes.length - i;
    if (remaining === 1) {
      const triple = bytes[i] << 16;
      output += alphabet[(triple >> 18) & 0x3f];
      output += alphabet[(triple >> 12) & 0x3f];
      output += "==";
    } else if (remaining === 2) {
      const triple = (bytes[i] << 16) | (bytes[i + 1] << 8);
      output += alphabet[(triple >> 18) & 0x3f];
      output += alphabet[(triple >> 12) & 0x3f];
      output += alphabet[(triple >> 6) & 0x3f];
      output += "=";
    }

    return output;
  };

  useEffect(() => {
    if (!terminalRef.current) return;

    // Cleanup previous session if exists
    const cleanup = async () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (sessionIdRef.current) {
        try {
          const token = getAuthToken();
          await fetch(
            buildApiUrl(API_CONFIG.ENDPOINTS.SSM.TERMINATE_SESSION, {
              sessionId: sessionIdRef.current,
            }),
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
        } catch (e) {
          console.error("Failed to terminate previous session:", e);
        }
        sessionIdRef.current = null;
      }
    };
    cleanup();

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: "#1a1a2e",
        foreground: "#eee",
        cursor: "#f8f8f2",
        cursorAccent: "#1a1a2e",
        selectionBackground: "#44475a",
        black: "#21222c",
        red: "#ff5555",
        green: "#50fa7b",
        yellow: "#f1fa8c",
        blue: "#bd93f9",
        magenta: "#ff79c6",
        cyan: "#8be9fd",
        white: "#f8f8f2",
        brightBlack: "#6272a4",
        brightRed: "#ff6e6e",
        brightGreen: "#69ff94",
        brightYellow: "#ffffa5",
        brightBlue: "#d6acff",
        brightMagenta: "#ff92df",
        brightCyan: "#a4ffff",
        brightWhite: "#ffffff",
      },
      rows: 24,
      cols: 80,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(terminalRef.current);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    setTimeout(() => {
      fitAddon.fit();
    }, 0);

    const handleResize = () => {
      fitAddon.fit();
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const resizeMessage = JSON.stringify({
          Type: "size",
          Cols: term.cols,
          Rows: term.rows,
        });
        wsRef.current.send(resizeMessage);
      }
    };
    window.addEventListener("resize", handleResize);

    connectToSSM(term, instanceId, instanceName);

    return () => {
      window.removeEventListener("resize", handleResize);
      terminateSession();
      term.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId, instanceName]);

  const connectToSSM = async (
    term: Terminal,
    instId: string,
    instName: string
  ) => {
    term.writeln(
      "\x1b[1;34m╔════════════════════════════════════════════════════════════╗\x1b[0m"
    );
    term.writeln(
      "\x1b[1;34m║\x1b[0m          \x1b[1;33mAWS Systems Manager Session Manager\x1b[0m              \x1b[1;34m║\x1b[0m"
    );
    term.writeln(
      "\x1b[1;34m╚════════════════════════════════════════════════════════════╝\x1b[0m"
    );
    term.writeln("");
    term.writeln(
      `\x1b[36mConnecting to instance: \x1b[1;37m${instName}\x1b[0m`
    );
    term.writeln(`\x1b[36mInstance ID: \x1b[1;37m${instId}\x1b[0m`);
    term.writeln("");
    term.writeln("\x1b[33m⏳ Establishing session...\x1b[0m");

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("인증 토큰이 없습니다. 다시 로그인해주세요.");
      }

      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.SSM.CREATE_SESSION),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ instanceId: instId }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`세션 생성 실패: ${response.status} - ${errorText}`);
      }

      const data: SsmSessionResponse = await response.json();
      sessionIdRef.current = data.result.sessionId;

      const wsUrl = buildWsUrl(`/ws/ssm/${data.result.sessionId}`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // 연결 성공 시 별도 메시지 없이 즉시 준비
      };

      ws.onmessage = async (event) => {
        const data = event.data;

        // Handle binary messages
        if (data instanceof Blob) {
          try {
            const arrayBuffer = await data.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            term.write(uint8Array);

            if (!isConnected) {
              setIsConnecting(false);
              setIsConnected(true);
            }
          } catch (err) {
            console.error("Failed to process binary SSM message", err);
          }
          return;
        }

        // Handle text messages (JSON)
        if (typeof data === "string") {
          try {
            const message = JSON.parse(data);
            const type = message.Type || message.MessageType;

            if (
              (type === "output_stream_data" || message.PayloadType === 1) &&
              message.Payload
            ) {
              const decoded = atob(message.Payload);
              term.write(decoded);
            } else if (type === "control" || type === "handshake") {
              // ignore control/handshake messages
            }

            if (!isConnected) {
              setIsConnecting(false);
              setIsConnected(true);
            }
          } catch (err) {
            console.error("Failed to process SSM message", err);
          }
        }
      };

      ws.onerror = (event) => {
        console.error("WebSocket error:", event);
        term.writeln("\x1b[31m✗ WebSocket 연결 오류\x1b[0m");
        setError("WebSocket 연결 오류가 발생했습니다.");
      };

      ws.onclose = (event) => {
        term.writeln("");
        term.writeln(
          `\x1b[33m세션이 종료되었습니다. (code: ${event.code})\x1b[0m`
        );
        setIsConnected(false);
        setIsConnecting(false);
      };

      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          const payload = encodeInputPayload(data);
          if (!payload) {
            return;
          }
          const inputMessage = JSON.stringify({
            Type: "input_stream_data",
            Payload: payload,
          });
          ws.send(inputMessage);
        }
      });

      setIsConnecting(false);
      setIsConnected(true);
      term.writeln("\x1b[32m✓ Session established successfully!\x1b[0m");
      term.writeln("");
      term.writeln(
        "\x1b[90m─────────────────────────────────────────────────────────────\x1b[0m"
      );
      term.writeln("");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "알 수 없는 오류";
      term.writeln(`\x1b[31m✗ 연결 실패: ${errorMessage}\x1b[0m`);
      setError(errorMessage);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    terminateSession();
    setIsConnected(false);
    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              isConnected
                ? "bg-success animate-pulse"
                : isConnecting
                ? "bg-warning animate-pulse"
                : "bg-destructive"
            }`}
          />
          <span className="text-sm font-medium text-foreground">
            {instanceName}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            ({instanceId})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isConnecting && (
            <span className="text-xs text-muted-foreground">연결 중...</span>
          )}
          {isConnected && <span className="text-xs text-success">연결됨</span>}
          {onClose && (
            <button
              onClick={onClose}
              className="ml-2 text-muted-foreground hover:text-foreground transition-colors text-sm px-2 py-1 rounded hover:bg-muted"
            >
              ✕ 닫기
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20">
          <span className="text-xs text-destructive">{error}</span>
        </div>
      )}

      {/* Terminal Container */}
      <div
        ref={terminalRef}
        className="flex-1 p-2 h-full"
        style={{ backgroundColor: "#1a1a2e" }}
      />
    </div>
  );
}
