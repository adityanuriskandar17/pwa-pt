const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Create icon PNG dengan gradient background
async function createIcon(size) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#9333ea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.35}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">FTL</text>
    </svg>
  `;

  const publicDir = path.join(__dirname, '..', 'public');
  const outputPath = path.join(publicDir, `icon-${size}x${size}.png`);

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(outputPath);

  console.log(`✓ Created icon-${size}x${size}.png`);
}

async function generateIcons() {
  try {
    console.log('Generating PWA icons...');
    await createIcon(192);
    await createIcon(512);
    console.log('✓ All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();

