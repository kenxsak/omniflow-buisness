const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const toIco = require('to-ico');

const LOGO_SOURCE = path.join(__dirname, '..', 'attached_assets', 'Omni Flow Logo_1761637954461.png');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');

async function updateLogos() {
  try {
    console.log('🎨 Starting logo update process...');
    
    // Ensure icons directory exists
    if (!fs.existsSync(ICONS_DIR)) {
      fs.mkdirSync(ICONS_DIR, { recursive: true });
    }

    // Read the source logo
    const logoBuffer = fs.readFileSync(LOGO_SOURCE);
    
    // 1. Copy original logo to public/logo.png (optimized)
    console.log('📋 Creating main logo (logo.png)...');
    await sharp(logoBuffer)
      .resize(512, 512, { 
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(path.join(PUBLIC_DIR, 'logo.png'));
    console.log('✅ Main logo created');

    // 2. Generate PWA icon 192x192
    console.log('📱 Creating PWA icon 192x192...');
    await sharp(logoBuffer)
      .resize(192, 192, { 
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(path.join(ICONS_DIR, 'icon-192x192.png'));
    console.log('✅ PWA icon 192x192 created');

    // 3. Generate PWA icon 512x512
    console.log('📱 Creating PWA icon 512x512...');
    await sharp(logoBuffer)
      .resize(512, 512, { 
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(path.join(ICONS_DIR, 'icon-512x512.png'));
    console.log('✅ PWA icon 512x512 created');

    // 4. Generate favicon (proper ICO format with multiple sizes)
    console.log('🔖 Creating favicon...');
    
    // Generate PNGs in multiple sizes for the ICO
    const favicon16 = await sharp(logoBuffer)
      .resize(16, 16, { 
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();
    
    const favicon32 = await sharp(logoBuffer)
      .resize(32, 32, { 
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();
    
    const favicon48 = await sharp(logoBuffer)
      .resize(48, 48, { 
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();
    
    // Create proper ICO file with multiple sizes
    const icoBuffer = await toIco([favicon16, favicon32, favicon48]);
    fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer);
    console.log('✅ Favicon created (proper ICO format with 16x16, 32x32, 48x48)');

    // 5. Generate Apple Touch Icon (180x180)
    console.log('🍎 Creating Apple Touch Icon...');
    await sharp(logoBuffer)
      .resize(180, 180, { 
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
    console.log('✅ Apple Touch Icon created');

    console.log('\n🎉 All logos updated successfully!');
    console.log('\n📍 Updated files:');
    console.log('  - public/logo.png');
    console.log('  - public/favicon.ico');
    console.log('  - public/apple-touch-icon.png');
    console.log('  - public/icons/icon-192x192.png');
    console.log('  - public/icons/icon-512x512.png');

  } catch (error) {
    console.error('❌ Error updating logos:', error);
    process.exit(1);
  }
}

updateLogos();
