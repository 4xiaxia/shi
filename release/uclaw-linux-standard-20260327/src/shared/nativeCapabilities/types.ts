import type { AgentRoleKey, AppConfigLike } from '../agentRoleConfig';
import type { BrowserEyesCurrentPageState } from '../browserEyesState';

export type NativeCapabilitySdkToolFactory = (
  name: string,
  description: string,
  schema: Record<string, unknown>,
  handler: (args: any) => Promise<any>
) => any;

export type NativeCapabilityRuntimeContext = {
  roleKey: AgentRoleKey;
  appConfig?: AppConfigLike | null;
  readCurrentBrowserPage?: () => BrowserEyesCurrentPageState | null;
};

export type NativeCapabilityDirectTurnParams = {
  prompt: string;
  emitResult: (text: string, metadata?: Record<string, unknown>) => void;
};

export type NativeCapabilityAddon = {
  id: string;
  title: string;
  description: string;
  isAvailable?: (context: NativeCapabilityRuntimeContext) => boolean;
  getSystemPrompt?: (context: NativeCapabilityRuntimeContext) => string | null;
  createSdkTools?: (toolFactory: NativeCapabilitySdkToolFactory, context: NativeCapabilityRuntimeContext) => any[];
  tryHandleDirectTurn?: (
    params: NativeCapabilityDirectTurnParams,
    context: NativeCapabilityRuntimeContext
  ) => Promise<boolean>;
};
