const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const src = 'C:\\Users\\tathe\\.gemini\\antigravity-ide\\brain\\560b3070-365a-440b-9f02-a9b1df3cc0cb\\jalsaathi_icon_512_1781234323973.png';
const outDir = path.join(__dirname, 'public', 'icons');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

(async () => {
  for (const size of sizes) {
    await sharp(src)
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, `icon-${size}x${size}.png`));
    console.log(`✅ Generated icon-${size}x${size}.png`);
  }

  // Also generate maskable (with safe-zone padding ~10%)
  const padding = Math.round(512 * 0.1);
  await sharp(src)
    .resize(512 - padding * 2, 512 - padding * 2)
    .extend({ top: padding, bottom: padding, left: padding, right: padding, background: { r: 30, g: 58, b: 138, alpha: 1 } })
    .resize(512, 512)
    .png()
    .toFile(path.join(outDir, 'icon-512x512-maskable.png'));
  console.log('✅ Generated icon-512x512-maskable.png');

  // Copy 192 as apple-touch-icon
  await sharp(src).resize(180, 180).png().toFile(path.join(__dirname, 'public', 'apple-touch-icon.png'));
  console.log('✅ Generated apple-touch-icon.png (180x180)');

  // Copy 32 as favicon fallback
  await sharp(src).resize(32, 32).png().toFile(path.join(__dirname, 'public', 'favicon-32x32.png'));
  console.log('✅ Generated favicon-32x32.png');

  console.log('\n🎉 All icons generated!');
})();
