export function getSiteUrl(): string | undefined {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configuredUrl) return undefined;

  return new URL(configuredUrl).origin;
}
