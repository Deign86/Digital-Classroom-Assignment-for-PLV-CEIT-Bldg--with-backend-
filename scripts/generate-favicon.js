import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateFavicon() {
  const inputPath = join(__dirname, '../public/system-logo.webp');
  const outputPath = join(__dirname, '../public/favicon.ico');

  try {
    console.log('Converting system-logo.webp to favicon.ico...');
    
    // Convert webp to png with 32x32 size (standard favicon size)
    const pngBuffer = await sharp(inputPath)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toBuffer();

    // For .ico format, we'll create a 32x32 PNG and rename it
    // Modern browsers accept PNG data in .ico files
    await sharp(pngBuffer)
      .toFile(outputPath);

    console.log('✓ Favicon generated successfully at public/favicon.ico');
  } catch (error) {
    console.error('Error generating favicon:', error);
    process.exit(1);
  }
}

generateFavicon();
