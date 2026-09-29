const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const imagesRoot = path.join(__dirname, '..', 'src', 'renderer', 'images');
const targets = [
  { name: 'logo.png', width: 1024, height: 1024 },
  { name: 'favicon.png', width: 256, height: 256 },
  { name: 'logo-name.png', width: 480, height: 160 },
];

async function optimize(target) {
  const sourcePath = path.join(imagesRoot, target.name);
  const temporaryPath = `${sourcePath}.${process.pid}.tmp.png`;
  const before = fs.statSync(sourcePath).size;
  const beforeMetadata = await sharp(sourcePath).metadata();
  await sharp(sourcePath)
    .resize({ width: target.width, height: target.height, withoutEnlargement: true, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, effort: 10, palette: true, colours: 128, dither: 0.5 })
    .toFile(temporaryPath);
  fs.renameSync(temporaryPath, sourcePath);
  const after = fs.statSync(sourcePath).size;
  const afterMetadata = await sharp(sourcePath).metadata();
  return {
    name: target.name,
    beforeBytes: before,
    afterBytes: after,
    reductionPercent: Number((((before - after) / before) * 100).toFixed(2)),
    beforeDimensions: `${beforeMetadata.width}x${beforeMetadata.height}`,
    afterDimensions: `${afterMetadata.width}x${afterMetadata.height}`,
  };
}

Promise.all(targets.map(optimize))
  .then(results => process.stdout.write(`${JSON.stringify({ optimizedImages: results }, null, 2)}\n`))
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
