const sharp = require('sharp');

class ImageConverter {
  async convert(inputPath, outputPath, targetFormat) {
    const instance = sharp(inputPath);

    switch (targetFormat) {
      case 'jpg':
      case 'jpeg':
        await instance.jpeg({ quality: 90 }).toFile(outputPath);
        break;
      case 'png':
        await instance.png({ compressionLevel: 8 }).toFile(outputPath);
        break;
      case 'webp':
        await instance.webp({ quality: 85 }).toFile(outputPath);
        break;
      case 'avif':
        await instance.avif({ quality: 80 }).toFile(outputPath);
        break;
      case 'tiff':
        await instance.tiff().toFile(outputPath);
        break;
      case 'bmp':
        await instance.bmp().toFile(outputPath);
        break;
      case 'gif':
        await instance.gif().toFile(outputPath);
        break;
      default:
        throw new Error(`Unsupported image format: ${targetFormat}`);
    }
  }
}

module.exports = new ImageConverter();
