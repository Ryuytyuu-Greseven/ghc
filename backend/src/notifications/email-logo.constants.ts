import { readFileSync } from 'fs';
import { join } from 'path';

export const EMAIL_LOGO_PLACEHOLDER = '__GHC_EMAIL_LOGO_SRC__';

export const DEFAULT_LOGO_URL =
  'https://storage.googleapis.com/ghcai-medsynai/logoghc.png';

/** Public HTTPS logo URL for email HTML — never localhost or data: URIs (Gmail blocks both). */
export function getEmailLogoUrl(): string {
  const configured = process.env.LOGO_URL?.trim();
  if (configured?.startsWith('https://')) {
    return configured;
  }

  const apiBase = process.env.API_BASE_URL?.trim().replace(/\/$/, '');
  if (apiBase?.startsWith('https://')) {
    return `${apiBase}/public/logo-email.png`;
  }

  return DEFAULT_LOGO_URL;
}

export function injectEmailLogo(html: string): string {
  const logoUrl = getEmailLogoUrl();
  return html.replaceAll(EMAIL_LOGO_PLACEHOLDER, logoUrl);
}

/** Bundled logo bytes for backend static serving. */
export function getBundledLogoPath(): string {
  return join(__dirname, 'assets', 'logo-email.png');
}

export function readBundledLogo(): Buffer {
  return readFileSync(getBundledLogoPath());
}
