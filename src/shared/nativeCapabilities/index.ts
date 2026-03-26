import { nativeImaAddon } from './imaAddon';
import {
  isNativeCapabilityEnabledForRole,
  resolveNativeCapabilitiesConfigFromAppConfig,
  sortNativeCapabilityIdsByPriority,
  type NativeCapabilityId,
} from './config';
export type {
  NativeCapabilityAddon,
  NativeCapabilityRuntimeContext,
  NativeCapabilityDirectTurnParams,
  NativeCapabilitySdkToolFactory,
} from './types';
import type {
  NativeCapabilityAddon,
  NativeCapabilityRuntimeContext,
  NativeCapabilityDirectTurnParams,
  NativeCapabilitySdkToolFactory,
} from './types';
import { nativeBrowserEyesAddon } from './browserEyesAddon';

const NATIVE_CAPABILITY_ADDONS: NativeCapabilityAddon[] = [
  nativeImaAddon,
  nativeBrowserEyesAddon,
];

export function listNativeCapabilityAddons(): NativeCapabilityAddon[] {
  return [...NATIVE_CAPABILITY_ADDONS];
}

function listEnabledNativeCapabilityAddons(context: NativeCapabilityRuntimeContext): NativeCapabilityAddon[] {
  const config = resolveNativeCapabilitiesConfigFromAppConfig(context.appConfig);
  const addonsById = new Map(
    NATIVE_CAPABILITY_ADDONS.map((addon) => [addon.id as NativeCapabilityId, addon])
  );

  const sortedIds = sortNativeCapabilityIdsByPriority(
    config,
    Array.from(addonsById.keys())
  );

  return sortedIds
    .filter((id) => isNativeCapabilityEnabledForRole(config, id, context.roleKey))
    .map((id) => addonsById.get(id))
    .filter((addon): addon is NativeCapabilityAddon => Boolean(addon))
    .filter((addon) => addon.isAvailable?.(context) ?? true);
}

export function buildNativeCapabilitySystemPrompts(context: NativeCapabilityRuntimeContext): string[] {
  return listEnabledNativeCapabilityAddons(context)
    .map((addon) => addon.getSystemPrompt?.(context))
    .filter((prompt): prompt is string => Boolean(prompt?.trim()));
}

export function createNativeCapabilitySdkTools(
  toolFactory: NativeCapabilitySdkToolFactory,
  context: NativeCapabilityRuntimeContext
): any[] {
  return listEnabledNativeCapabilityAddons(context)
    .flatMap((addon) => addon.createSdkTools?.(toolFactory, context) ?? []);
}

export async function tryHandleNativeCapabilityDirectTurn(
  params: NativeCapabilityDirectTurnParams,
  context: NativeCapabilityRuntimeContext
): Promise<boolean> {
  for (const addon of listEnabledNativeCapabilityAddons(context)) {
    if (!addon.tryHandleDirectTurn) {
      continue;
    }

    const handled = await addon.tryHandleDirectTurn(params, context);
    if (handled) {
      return true;
    }
  }

  return false;
}
