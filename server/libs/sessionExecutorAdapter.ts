import type { SessionExecutor } from '../../clean-room/spine/modules/sessionOrchestrator';
import { CoworkRunner } from '../../src/main/libs/coworkRunner';

type ImageAttachment = {
  name: string;
  mimeType: string;
  base64Data: string;
};

function normalizeImageAttachments(
  imageAttachments?: ImageAttachment[]
): ImageAttachment[] | undefined {
  if (!Array.isArray(imageAttachments) || imageAttachments.length === 0) {
    return undefined;
  }
  return imageAttachments;
}

export function createSessionExecutorAdapter(
  coworkRunner: CoworkRunner
): SessionExecutor {
  // {BREAKPOINT} LEGACY-SESSION-EXECUTOR-ADAPTER
  // {FLOW} PHASE1-FROZEN-COMPAT-SEAM: 该适配缝仍能把新编排层回退到旧 CoworkRunner，但当前未接入一期主路。
  // {标记} 旧污染活口: 这是新编排层回退到旧 CoworkRunner 的适配缝。
  // {标记} 待评估-可能波及: server/routes/cowork.ts / server/routes/feishuWebhook.ts / server/routes/dingtalkWebhook.ts。
  // {标记} 重构边界-待确认: 若切除该适配器，必须确认 skills / permissions / IM 快路不再依赖 SDK 语义。
  // [SDK-CUT:ADAPTER] Thin seam where orchestrator is still backed by CoworkRunner/SDK instead of a non-SDK executor.
  return {
    async startSession(sessionId, prompt, options = {}) {
      await coworkRunner.startSession(sessionId, prompt, {
        skipInitialUserMessage: options.skipInitialUserMessage,
        skillIds: options.skillIds,
        systemPrompt: options.systemPrompt,
        autoApprove: options.autoApprove,
        workspaceRoot: options.workspaceRoot,
        confirmationMode: options.confirmationMode,
        imageAttachments: normalizeImageAttachments(options.imageAttachments),
      });
    },

    async continueSession(sessionId, prompt, options = {}) {
      await coworkRunner.continueSession(sessionId, prompt, {
        systemPrompt: options.systemPrompt,
        skillIds: options.skillIds,
        autoApprove: options.autoApprove,
        workspaceRoot: options.workspaceRoot,
        confirmationMode: options.confirmationMode,
        imageAttachments: normalizeImageAttachments(options.imageAttachments),
      });
    },

    async runChannelFastTurn(sessionId, prompt, options = {}) {
      await coworkRunner.runChannelFastTurn(sessionId, prompt, {
        systemPrompt: options.systemPrompt,
        autoApprove: options.autoApprove,
        workspaceRoot: options.workspaceRoot,
        confirmationMode: options.confirmationMode,
        imageAttachments: normalizeImageAttachments(options.imageAttachments),
      });
    },

    isSessionActive(sessionId) {
      return coworkRunner.isSessionActive(sessionId);
    },
  };
}
