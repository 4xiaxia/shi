export interface BusinessLinksConfig {
  updateCheckUrl?: string;
  fallbackDownloadUrl?: string;
  skillStoreUrl?: string;
  userManualUrl?: string;
  serviceTermsUrl?: string;
}

export interface ResolvedBusinessLinks {
  updateCheckUrl: string;
  fallbackDownloadUrl: string;
  skillStoreUrl: string;
  userManualUrl: string;
  serviceTermsUrl: string;
}

const PROD_LINKS: ResolvedBusinessLinks = {
  updateCheckUrl: 'https://api-overmind.youdao.com/openapi/get/luna/hardware/lobsterai/prod/update',
  fallbackDownloadUrl: 'https://lobsterai.youdao.com/#/download-list',
  skillStoreUrl: 'https://api-overmind.youdao.com/openapi/get/luna/hardware/lobsterai/prod/skill-store',
  userManualUrl: 'https://pan.baidu.com/s/1CazlJ0tmww0lYHHDH42FoQ?pwd=6666',
  serviceTermsUrl: '',
};

const TEST_LINKS: ResolvedBusinessLinks = {
  updateCheckUrl: 'https://api-overmind.youdao.com/openapi/get/luna/hardware/lobsterai/test/update',
  fallbackDownloadUrl: 'https://lobsterai.inner.youdao.com/#/download-list',
  skillStoreUrl: 'https://api-overmind.youdao.com/openapi/get/luna/hardware/lobsterai/test/skill-store',
  userManualUrl: 'https://pan.baidu.com/s/1CazlJ0tmww0lYHHDH42FoQ?pwd=6666',
  serviceTermsUrl: '',
};

const normalizeUrl = (value: unknown): string => (
  typeof value === 'string' ? value.trim() : ''
);

export const resolveBusinessLinks = (
  testMode: boolean,
  overrides: BusinessLinksConfig = {}
): ResolvedBusinessLinks => {
  const defaults = testMode ? TEST_LINKS : PROD_LINKS;

  return {
    updateCheckUrl: normalizeUrl(overrides.updateCheckUrl) || defaults.updateCheckUrl,
    fallbackDownloadUrl: normalizeUrl(overrides.fallbackDownloadUrl) || defaults.fallbackDownloadUrl,
    skillStoreUrl: normalizeUrl(overrides.skillStoreUrl) || defaults.skillStoreUrl,
    userManualUrl: normalizeUrl(overrides.userManualUrl) || defaults.userManualUrl,
    serviceTermsUrl: normalizeUrl(overrides.serviceTermsUrl) || defaults.serviceTermsUrl,
  };
};
