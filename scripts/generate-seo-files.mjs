import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const publicDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../public');
const configuredUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  process.env.VERCEL_URL;

let robots = 'User-agent: *\nAllow: /\n';

if (configuredUrl) {
  const siteUrl = new URL(
    configuredUrl.startsWith('http') ? configuredUrl : `https://${configuredUrl}`,
  ).origin;
  const sitemapUrl = new URL('/sitemap.xml', siteUrl).href;

  await writeFile(
    resolve(publicDirectory, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${siteUrl}/</loc>\n  </url>\n</urlset>\n`,
  );
  robots += `Sitemap: ${sitemapUrl}\n`;
} else {
  console.warn(
    'No site URL configured; sitemap.xml will not be generated. Set NEXT_PUBLIC_SITE_URL for canonical SEO URLs.',
  );
}

await writeFile(resolve(publicDirectory, 'robots.txt'), robots);
