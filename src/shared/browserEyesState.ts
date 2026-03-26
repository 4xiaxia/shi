export const BROWSER_EYES_CURRENT_PAGE_STORE_KEY = 'browser_eyes_current_page_v1';

export interface BrowserEyesCurrentPageState {
  source: 'embedded-browser';
  url: string;
  title?: string;
  updatedAt: number;
}
