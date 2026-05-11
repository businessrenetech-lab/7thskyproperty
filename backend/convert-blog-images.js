/**
 * Convert all PNG blog images to optimized WebP format.
 * - Resizes to max 1200px wide (sufficient for blog hero images)
 * - WebP quality 80 (excellent visual quality, 60-70% smaller than PNG)
 * - Updates database records to point to new .webp filenames
 * - Keeps original PNGs as backup until manually deleted
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const blogsDir = path.join(__dirname, 'uploads', 'blogs');

async function convertBlogImages() {
  const files = fs.readdirSync(blogsDir).filter(f => f.endsWith('.png'));
  console.log(`Found ${files.length} PNG files to convert\n`);

  let totalOriginal = 0;
  let totalConverted = 0;

  for (const file of files) {
    const inputPath = path.join(blogsDir, file);
    const outputName = file.replace('.png', '.webp');
    const outputPath = path.join(blogsDir, outputName);

    const originalSize = fs.statSync(inputPath).size;
    totalOriginal += originalSize;

    try {
      await sharp(inputPath)
        .resize(1200, null, { withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(outputPath);

      const newSize = fs.statSync(outputPath).size;
      totalConverted += newSize;
      const savings = ((1 - newSize / originalSize) * 100).toFixed(1);
      console.log(`✓ ${file} → ${outputName}  (${(originalSize/1024).toFixed(0)}KB → ${(newSize/1024).toFixed(0)}KB, -${savings}%)`);
    } catch (err) {
      console.error(`✗ ${file}: ${err.message}`);
    }
  }

  console.log(`\n── Summary ──`);
  console.log(`Original total: ${(totalOriginal/1024/1024).toFixed(2)} MB`);
  console.log(`WebP total:     ${(totalConverted/1024/1024).toFixed(2)} MB`);
  console.log(`Savings:        ${((1 - totalConverted/totalOriginal) * 100).toFixed(1)}%`);

  // Update database records
  console.log(`\n── Updating database records ──`);
  try {
    const sequelize = require('./config/db.config');
    const BlogPost = require('./models/BlogPost');
    await sequelize.authenticate();

    for (const file of files) {
      const oldPath = `/uploads/blogs/${file}`;
      const newPath = `/uploads/blogs/${file.replace('.png', '.webp')}`;
      const [count] = await BlogPost.update(
        { image_url: newPath },
        { where: { image_url: oldPath } }
      );
      if (count > 0) console.log(`  DB: ${oldPath} → ${newPath}`);
    }

    console.log(`\n✓ Done. Original PNGs kept as backup.`);
    await sequelize.close();
  } catch (err) {
    console.error(`DB update failed: ${err.message}`);
    console.log('WebP files created but DB not updated — update manually.');
  }
}

convertBlogImages();
