const DEFAULT_ORIGIN = 'https://educonect.alwaysdata.net';

export const API_ORIGIN: string = import.meta.env.VITE_API_ORIGIN || DEFAULT_ORIGIN;
export const ASSETS_ORIGIN: string = import.meta.env.VITE_ASSETS_ORIGIN || API_ORIGIN;

function withLeadingSlash(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

export function apiUrl(path: string): string {
  return new URL(withLeadingSlash(path), API_ORIGIN).toString();
}

export function assetUrl(path: string | null): string {
  if (!path) return '';
  if (path.startsWith('http') || path.includes('alwaysdata.net')) {
    return path.replace(/^https?:\/\/?/, (match) => match.includes('://') ? match : match.replace('//', '://'));
  }
  return new URL(withLeadingSlash(path), ASSETS_ORIGIN).toString();
}

