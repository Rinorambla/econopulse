import { NextResponse } from 'next/server';

export async function GET() {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://econopulse.com/en</loc>
    <xhtml:link rel="alternate" hreflang="it" href="https://econopulse.com/it"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://econopulse.com/en"/>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://econopulse.com/it</loc>
    <xhtml:link rel="alternate" hreflang="en" href="https://econopulse.com/en"/>
    <xhtml:link rel="alternate" hreflang="it" href="https://econopulse.com/it"/>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://econopulse.com/en/dashboard</loc>
    <xhtml:link rel="alternate" hreflang="it" href="https://econopulse.com/it/dashboard"/>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://econopulse.com/it/dashboard</loc>
    <xhtml:link rel="alternate" hreflang="en" href="https://econopulse.com/en/dashboard"/>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://econopulse.com/en/ai-portfolio</loc>
    <xhtml:link rel="alternate" hreflang="it" href="https://econopulse.com/it/ai-portfolio"/>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://econopulse.com/it/ai-portfolio</loc>
    <xhtml:link rel="alternate" hreflang="en" href="https://econopulse.com/en/ai-portfolio"/>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://econopulse.com/en/ai-pulse</loc>
    <xhtml:link rel="alternate" hreflang="it" href="https://econopulse.com/it/ai-pulse"/>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://econopulse.com/it/ai-pulse</loc>
    <xhtml:link rel="alternate" hreflang="en" href="https://econopulse.com/en/ai-pulse"/>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://econopulse.com/en/pricing</loc>
    <xhtml:link rel="alternate" hreflang="it" href="https://econopulse.com/it/pricing"/>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://econopulse.com/it/pricing</loc>
    <xhtml:link rel="alternate" hreflang="en" href="https://econopulse.com/en/pricing"/>
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
