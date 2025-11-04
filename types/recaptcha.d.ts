// Google reCAPTCHA Enterprise type definitions
interface GrecaptchaEnterprise {
  ready(callback: () => void): void;
  execute(siteKey: string, options: { action: string }): Promise<string>;
}

interface Window {
  grecaptcha?: {
    enterprise: GrecaptchaEnterprise;
  };
}
