import { BLOCK_STAGE_META } from "@/types/eks-upgrade";
import type { Block, BlockStage, ClusterInstanceDetail } from "@/types/eks-upgrade";

function toVersionLabel(version: string): string {
  const value = version.trim();
  if (value.length === 0) return "v-";
  return value.startsWith("v") ? value : `v${value}`;
}

function tailLines(text: string | null | undefined, count = 10): string {
  if (!text) return "-";
  const lines = text.split(/\r?\n/);
  return lines.slice(-count).join("\n").trim() || "-";
}

function escapeMarkdownCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, "<br/>");
}

function toStageBlocks(blocks: Block[]): Record<BlockStage, Block[]> {
  const grouped: Record<BlockStage, Block[]> = {
    PRE: [],
    UPGRADE: [],
    POST: [],
  };

  blocks.forEach((block) => {
    const stage = block.blockStage ?? "UPGRADE";
    grouped[stage].push(block);
  });

  return grouped;
}

function buildStageTable(stageBlocks: Block[], instance: ClusterInstanceDetail): string[] {
  const rows = stageBlocks
    .map((block) => {
      const state = instance.blockStates.find((item) => item.blockId === block.id);
      const outputTail = tailLines(state?.output, 10);

      return `| ${escapeMarkdownCell(block.title)} | ${escapeMarkdownCell(outputTail)} |`;
    })
    .join("\n");

  return [
    "| 블록 | 실행 로그 (tail -10) |",
    "| :--- | :--- |",
    rows || "| - | - |",
  ];
}

export function generateClusterUpgradeMarkdown(
  sourceVersionValue: string,
  targetVersionValue: string,
  instance: ClusterInstanceDetail,
  blocks: Block[]
): string {
  const sourceVersion = toVersionLabel(sourceVersionValue);
  const targetVersion = toVersionLabel(targetVersionValue);
  const pageTitle = `[${instance.environment}] EKS ${targetVersion} 업그레이드 결과`;
  const stageBlocks = toStageBlocks(blocks);
  const hasKubectlContext = Boolean(instance.kubectlContext);

  return [
    `# ${pageTitle}`,
    "",
    `# 업그레이드 (${sourceVersion} → ${targetVersion})`,
    "",
    "## 1. 목표",
    `- EKS 버전을 ${sourceVersion} → ${targetVersion} 업그레이드 한다.`,
    `- 대상 클러스터: ${instance.clusterName}`,
    "",
    "## 2. 체크리스트",
    "",
    "### 1) 사전 작업",
    hasKubectlContext
      ? `- \`kubectl config use-context ${instance.kubectlContext}\``
      : "- `kubectl context 미설정`",
    ...buildStageTable(stageBlocks.PRE, instance),
    "",
    "### 2) 업그레이드 전개",
    ...buildStageTable(stageBlocks.UPGRADE, instance),
    "",
    "### 3) 사후 작업",
    ...buildStageTable(stageBlocks.POST, instance),
    "",
  ].join("\n");
}
