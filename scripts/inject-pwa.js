const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../dist/index.html');

if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf-8');

  const pwaTags = `
    <!-- PWA Settings & Offline Support -->
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#0F172A" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Мои Кэшбеки" />
    <link rel="apple-touch-icon" href="/assets/icon.png" />
  `;

  if (!html.includes('rel="manifest"')) {
    html = html.replace('</head>', `${pwaTags}\n</head>`);
    fs.writeFileSync(indexPath, html, 'utf-8');
    console.log('✅ PWA tags successfully injected into dist/index.html');
  }
} else {
  console.log('dist/index.html not found, skipping injection');
}
