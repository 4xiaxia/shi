export interface ElectronShimBootstrapOptions<TShim> {
  createShim: () => TShim;
  attachShim: (shim: TShim) => void;
  connectWebSocket: () => Promise<void>;
}

export async function initializeElectronShim<TShim>(
  options: ElectronShimBootstrapOptions<TShim>
): Promise<TShim> {
  const shim = options.createShim();
  options.attachShim(shim);

  void options.connectWebSocket().catch((error) => {
    console.error('[ElectronShimBootstrap] WebSocket connection failed:', error);
  });

  return shim;
}
