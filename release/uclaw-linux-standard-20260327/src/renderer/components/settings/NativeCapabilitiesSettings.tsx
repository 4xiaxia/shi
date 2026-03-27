import {
  AGENT_ROLE_LABELS,
  AGENT_ROLE_ORDER,
  type AgentRoleKey,
} from '../../../shared/agentRoleConfig';
import {
  NATIVE_CAPABILITY_LABELS,
  NATIVE_CAPABILITY_ORDER,
  type NativeCapabilitiesConfig,
  type NativeCapabilityId,
} from '../../../shared/nativeCapabilities/config';

interface NativeCapabilitiesSettingsProps {
  value: NativeCapabilitiesConfig;
  onChange: (next: NativeCapabilitiesConfig) => void;
}

export default function NativeCapabilitiesSettings({
  value,
  onChange,
}: NativeCapabilitiesSettingsProps) {
  const updateCapability = (
    capabilityId: NativeCapabilityId,
    updater: (entry: NativeCapabilitiesConfig[NativeCapabilityId]) => NativeCapabilitiesConfig[NativeCapabilityId]
  ) => {
    onChange({
      ...value,
      [capabilityId]: updater(value[capabilityId]),
    });
  };

  const updateRole = (capabilityId: NativeCapabilityId, roleKey: AgentRoleKey, checked: boolean) => {
    updateCapability(capabilityId, (entry) => ({
      ...entry,
      roles: {
        ...entry.roles,
        [roleKey]: checked,
      },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border px-4 py-4 dark:border-claude-darkBorder border-claude-border bg-gradient-to-br from-[#f8efe8] via-white to-[#f6f8fb] dark:from-claude-darkSurface dark:via-claude-darkSurface/90 dark:to-claude-darkSurface/70">
        <div className="text-sm font-medium dark:text-claude-darkText text-claude-text">
          {'原生外挂能力'}
        </div>
        <div className="mt-1 text-xs leading-5 dark:text-claude-darkTextSecondary text-claude-textSecondary">
          {'这里控制外挂式底层能力，不直接破坏主执行链。每个外挂都可以单独开关、调优先级，并按角色决定是否可用。'}
        </div>
      </div>

      <div className="space-y-4">
        {NATIVE_CAPABILITY_ORDER.map((capabilityId) => {
          const entry = value[capabilityId];
          const meta = NATIVE_CAPABILITY_LABELS[capabilityId];
          return (
            <div
              key={capabilityId}
              className="rounded-2xl border px-4 py-4 dark:border-claude-darkBorder border-claude-border dark:bg-claude-darkSurface/40 bg-white/80"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-semibold dark:text-claude-darkText text-claude-text">
                    {meta.title}
                  </div>
                  <div className="text-xs dark:text-claude-darkTextSecondary text-claude-textSecondary">
                    {meta.description}
                  </div>
                  <div className="text-[11px] font-mono dark:text-claude-darkTextSecondary/80 text-claude-textSecondary/80">
                    {capabilityId}
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 text-xs font-medium dark:text-claude-darkText text-claude-text">
                  <input
                    type="checkbox"
                    checked={entry.enabled}
                    onChange={(event) => updateCapability(capabilityId, (current) => ({
                      ...current,
                      enabled: event.target.checked,
                    }))}
                    className="h-4 w-4 rounded border-claude-border dark:border-claude-darkBorder text-claude-accent focus:ring-claude-accent/40"
                  />
                  {'启用外挂'}
                </label>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[180px_1fr]">
                <div>
                  <label className="block text-xs font-medium dark:text-claude-darkText text-claude-text mb-1">
                    {'优先级'}
                  </label>
                  <input
                    type="number"
                    min={-999}
                    max={999}
                    value={entry.priority}
                    onChange={(event) => updateCapability(capabilityId, (current) => ({
                      ...current,
                      priority: Number.isFinite(Number(event.target.value))
                        ? Number(event.target.value)
                        : current.priority,
                    }))}
                    className="block w-full rounded-xl bg-claude-surfaceInset dark:bg-claude-darkSurfaceInset dark:border-claude-darkBorder border-claude-border border focus:border-claude-accent focus:ring-1 focus:ring-claude-accent/30 dark:text-claude-darkText text-claude-text px-3 py-2 text-xs"
                  />
                  <p className="mt-1 text-[11px] dark:text-claude-darkTextSecondary text-claude-textSecondary">
                    {'值越大越先尝试。'}
                  </p>
                </div>

                <div>
                  <div className="block text-xs font-medium dark:text-claude-darkText text-claude-text mb-2">
                    {'按角色启用'}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {AGENT_ROLE_ORDER.map((roleKey) => (
                      <label
                        key={`${capabilityId}-${roleKey}`}
                        className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs dark:border-claude-darkBorder border-claude-border dark:text-claude-darkTextSecondary text-claude-textSecondary"
                      >
                        <input
                          type="checkbox"
                          checked={entry.roles[roleKey]}
                          onChange={(event) => updateRole(capabilityId, roleKey, event.target.checked)}
                          className="h-4 w-4 rounded border-claude-border dark:border-claude-darkBorder text-claude-accent focus:ring-claude-accent/40"
                        />
                        {AGENT_ROLE_LABELS[roleKey]}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
