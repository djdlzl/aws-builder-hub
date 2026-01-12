import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";

interface SSMTerminalProps {
  instanceId: string;
  instanceName: string;
  onClose?: () => void;
}

export function SSMTerminal({
  instanceId,
  instanceName,
  onClose,
}: SSMTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js
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

    // Fit terminal to container
    setTimeout(() => {
      fitAddon.fit();
    }, 0);

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener("resize", handleResize);

    // Simulate SSM connection
    simulateSSMConnection(term, instanceId, instanceName);

    return () => {
      window.removeEventListener("resize", handleResize);
      term.dispose();
    };
  }, [instanceId, instanceName]);

  const simulateSSMConnection = (
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

    setTimeout(() => {
      term.writeln("\x1b[32m✓ Session established successfully!\x1b[0m");
      term.writeln("");
      setIsConnecting(false);
      setIsConnected(true);

      // Simulate shell prompt
      term.writeln(
        "\x1b[90m─────────────────────────────────────────────────────────────\x1b[0m"
      );
      term.writeln("");
      term.write(`\x1b[1;32msh-4.2$\x1b[0m `);

      // Handle user input
      let currentLine = "";
      term.onKey(({ key, domEvent }) => {
        const code = key.charCodeAt(0);

        if (domEvent.key === "Enter") {
          term.writeln("");
          handleCommand(term, currentLine.trim());
          currentLine = "";
          term.write(`\x1b[1;32msh-4.2$\x1b[0m `);
        } else if (domEvent.key === "Backspace") {
          if (currentLine.length > 0) {
            currentLine = currentLine.slice(0, -1);
            term.write("\b \b");
          }
        } else if (code >= 32 && code <= 126) {
          currentLine += key;
          term.write(key);
        }
      });
    }, 1500);
  };

  const handleCommand = (term: Terminal, cmd: string) => {
    if (!cmd) return;

    switch (cmd.toLowerCase()) {
      case "whoami":
        term.writeln("ssm-user");
        break;
      case "hostname":
        term.writeln(`ip-10-0-1-100.ap-northeast-2.compute.internal`);
        break;
      case "pwd":
        term.writeln("/home/ssm-user");
        break;
      case "ls":
        term.writeln(
          "\x1b[1;34mapp\x1b[0m  \x1b[1;34mlogs\x1b[0m  \x1b[1;34mscripts\x1b[0m"
        );
        break;
      case "ls -la":
        term.writeln("total 12");
        term.writeln(
          "drwxr-xr-x 5 ssm-user ssm-user 4096 Jan 12 10:00 \x1b[1;34m.\x1b[0m"
        );
        term.writeln(
          "drwxr-xr-x 3 root     root     4096 Jan 12 09:00 \x1b[1;34m..\x1b[0m"
        );
        term.writeln(
          "drwxr-xr-x 2 ssm-user ssm-user 4096 Jan 12 10:00 \x1b[1;34mapp\x1b[0m"
        );
        term.writeln(
          "drwxr-xr-x 2 ssm-user ssm-user 4096 Jan 12 10:00 \x1b[1;34mlogs\x1b[0m"
        );
        term.writeln(
          "drwxr-xr-x 2 ssm-user ssm-user 4096 Jan 12 10:00 \x1b[1;34mscripts\x1b[0m"
        );
        break;
      case "uname -a":
        term.writeln(
          "Linux ip-10-0-1-100.ap-northeast-2.compute.internal 5.10.178-162.673.amzn2.x86_64 #1 SMP Thu Apr 27 00:00:00 UTC 2023 x86_64 x86_64 x86_64 GNU/Linux"
        );
        break;
      case "uptime":
        term.writeln(
          " 10:30:15 up 45 days,  3:21,  1 user,  load average: 0.08, 0.05, 0.01"
        );
        break;
      case "free -h":
        term.writeln(
          "              total        used        free      shared  buff/cache   available"
        );
        term.writeln(
          "Mem:          3.8Gi       1.2Gi       1.5Gi        12Mi       1.1Gi       2.4Gi"
        );
        term.writeln("Swap:            0B          0B          0B");
        break;
      case "df -h":
        term.writeln("Filesystem      Size  Used Avail Use% Mounted on");
        term.writeln("/dev/xvda1       20G  8.5G   12G  43% /");
        term.writeln("tmpfs           1.9G     0  1.9G   0% /dev/shm");
        break;
      case "date":
        term.writeln(new Date().toString());
        break;
      case "clear":
        term.clear();
        break;
      case "exit":
        term.writeln("");
        term.writeln("\x1b[33mExiting session...\x1b[0m");
        setTimeout(() => {
          term.writeln("\x1b[32mSession terminated.\x1b[0m");
          setIsConnected(false);
          if (onClose) onClose();
        }, 500);
        break;
      case "help":
        term.writeln("\x1b[1;33mDemo Commands:\x1b[0m");
        term.writeln("  whoami, hostname, pwd, ls, ls -la, uname -a");
        term.writeln("  uptime, free -h, df -h, date, clear, exit, help");
        term.writeln("");
        term.writeln(
          "\x1b[90mNote: This is a demo terminal. Real SSM connection requires backend integration.\x1b[0m"
        );
        break;
      default:
        term.writeln(`\x1b[31m-bash: ${cmd}: command not found\x1b[0m`);
        term.writeln("\x1b[90mType 'help' for available demo commands\x1b[0m");
    }
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

      {/* Terminal Container */}
      <div
        ref={terminalRef}
        className="flex-1 p-2"
        style={{ backgroundColor: "#1a1a2e" }}
      />
    </div>
  );
}
