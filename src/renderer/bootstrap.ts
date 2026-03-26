export interface RendererBootstrapOptions {
  hasElectron: boolean;
  initElectronShim: () => Promise<void>;
  renderApp: () => void;
  onInitError?: (error: unknown) => void;
}

export async function bootstrapRendererApp(options: RendererBootstrapOptions): Promise<void> {
  if (!options.hasElectron) {
    try {
      await options.initElectronShim();
    } catch (error) {
      options.onInitError?.(error);
    }
  }

  options.renderApp();
}
