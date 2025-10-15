import { NextResponse } from 'next/server';

export async function GET() {
  const base = 'https://econopulse.ai'
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${base}/en</loc>
    <xhtml:link rel="alternate" hreflang="it" href="${base}/it"/>
    <xhtml:link rel="alternate" hreflang="en" href="${base}/en"/>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${base}/it</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${base}/en"/>
    <xhtml:link rel="alternate" hreflang="it" href="${base}/it"/>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${base}/en/dashboard</loc>
    <xhtml:link rel="alternate" hreflang="it" href="${base}/it/dashboard"/>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${base}/it/dashboard</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${base}/en/dashboard"/>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${base}/en/ai-portfolio</loc>
    <xhtml:link rel="alternate" hreflang="it" href="${base}/it/ai-portfolio"/>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${base}/it/ai-portfolio</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${base}/en/ai-portfolio"/>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${base}/en/ai-pulse</loc>
    <xhtml:link rel="alternate" hreflang="it" href="${base}/it/ai-pulse"/>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${base}/it/ai-pulse</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${base}/en/ai-pulse"/>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${base}/en/pricing</loc>
    <xhtml:link rel="alternate" hreflang="it" href="${base}/it/pricing"/>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${base}/it/pricing</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${base}/en/pricing"/>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
