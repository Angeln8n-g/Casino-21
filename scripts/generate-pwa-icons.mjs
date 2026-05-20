/**
 * PWA Icon Generator for KASINO21
 * 
 * Uses sharp to resize the source icon (512x512 or higher)
 * into all required PWA icon sizes.
 * 
 * Usage: node scripts/generate-pwa-icons.mjs
 */

import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dirname, '..', 'public', 'icons');

// Source: use the current 512x512 icon as base (it has the right design, just wrong sizes)
const sourceIcon = resolve(iconsDir, 'source-icon.png');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  console.log('🎨 Generating PWA icons from source...');
  console.log(`   Source: ${sourceIcon}`);
  
  for (const size of SIZES) {
    const outputPath = resolve(iconsDir, `icon-${size}x${size}.png`);
    
    await sharp(sourceIcon)
      .resize(size, size, {
        fit: 'cover',
        kernel: sharp.kernel.lanczos3, // High quality downscaling
      })
      .png({
        quality: 100,
        compressionLevel: 9, // Max compression
      })
      .toFile(outputPath);
    
    console.log(`   ✓ icon-${size}x${size}.png`);
  }
  
  console.log('\n✅ All PWA icons generated successfully!');
  console.log('   Each icon now has its correct unique dimensions.');
}

generateIcons().catch(err => {
  console.error('❌ Error generating icons:', err.message);
  process.exit(1);
});
