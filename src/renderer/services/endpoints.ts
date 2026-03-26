/**
 * 集中管理所有业务 API 端点。
 * 后续新增的业务接口也应在此文件中配置。
 */

import { resolveBusinessLinks } from './businessLinks';
import { configService } from './config';

const getBusinessLinks = () => {
  const config = configService.getConfig();
  return resolveBusinessLinks(config.app?.testMode === true, config.links ?? {});
};

// 自动更新
export const getUpdateCheckUrl = () => getBusinessLinks().updateCheckUrl;

export const getFallbackDownloadUrl = () => getBusinessLinks().fallbackDownloadUrl;

// Skill 商店
export const getSkillStoreUrl = () => getBusinessLinks().skillStoreUrl;

export const getUserManualUrl = () => getBusinessLinks().userManualUrl;

export const getServiceTermsUrl = () => getBusinessLinks().serviceTermsUrl;
