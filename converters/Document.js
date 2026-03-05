const fs       = require('fs');
const path     = require('path');
const mammoth  = require('mammoth');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

class DocumentConverter {
  async convert(inputPath, outputPath, targetFormat) {
    const inputExt = path.extname(inputPath).toLowerCase().replace('.', '');

    if (inputExt === 'docx') {
      await this._fromDocx(inputPath, outputPath, targetFormat);
    } else if (inputExt === 'pdf') {
      await this._fromPdf(inputPath, outputPath, targetFormat);
    } else if (inputExt === 'txt' || inputExt === 'html' || inputExt === 'htm') {
      await this._fromText(inputPath, outputPath, targetFormat, inputExt);
    } else {
      throw new Error(`Unsupported document input: .${inputExt}`);
    }
  }

  async _fromDocx(inputPath, outputPath, targetFormat) {
    switch (targetFormat) {
      case 'txt': {
        const result = await mammoth.extractRawText({ path: inputPath });
        fs.writeFileSync(outputPath, result.value, 'utf8');
        break;
      }
      case 'html': {
        const result = await mammoth.convertToHtml({ path: inputPath });
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${result.value}</body></html>`;
        fs.writeFileSync(outputPath, html, 'utf8');
        break;
      }
      case 'pdf': {
        const result  = await mammoth.extractRawText({ path: inputPath });
        await this._textToPdf(result.value, outputPath);
        break;
      }
      default:
        throw new Error(`Cannot convert DOCX to .${targetFormat}`);
    }
  }

  async _fromPdf(inputPath, outputPath, targetFormat) {
    switch (targetFormat) {
      case 'txt': {
        const bytes  = fs.readFileSync(inputPath);
        const pdfDoc = await PDFDocument.load(bytes);
        const pages  = pdfDoc.getPages();
        const lines  = pages.map((_, i) => `[Page ${i + 1}]`).join('\n');
        fs.writeFileSync(outputPath, lines, 'utf8');
        break;
      }
      case 'pdf': {
        fs.copyFileSync(inputPath, outputPath);
        break;
      }
      default:
        throw new Error(`Cannot convert PDF to .${targetFormat}`);
    }
  }

  async _fromText(inputPath, outputPath, targetFormat, inputExt) {
    const content = fs.readFileSync(inputPath, 'utf8');

    switch (targetFormat) {
      case 'txt': {
        const plain = content.replace(/<[^>]+>/g, '');
        fs.writeFileSync(outputPath, plain, 'utf8');
        break;
      }
      case 'html': {
        if (inputExt === 'html' || inputExt === 'htm') {
          fs.copyFileSync(inputPath, outputPath);
        } else {
          const escaped = content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
          const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><pre>${escaped}</pre></body></html>`;
          fs.writeFileSync(outputPath, html, 'utf8');
        }
        break;
      }
      case 'pdf': {
        const plain = content.replace(/<[^>]+>/g, '');
        await this._textToPdf(plain, outputPath);
        break;
      }
      default:
        throw new Error(`Cannot convert .${inputExt} to .${targetFormat}`);
    }
  }

  async _textToPdf(text, outputPath) {
    const pdfDoc  = await PDFDocument.create();
    const font    = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize  = 11;
    const margin    = 50;
    const lineHeight = fontSize * 1.4;

    const lines = [];
    text.split('\n').forEach(line => {
      if (line.trim() === '') { lines.push(''); return; }
      const words = line.split(' ');
      let current = '';
      words.forEach(word => {
        const test = current ? current + ' ' + word : word;
        const w    = font.widthOfTextAtSize(test, fontSize);
        if (w > 595 - margin * 2 && current) {
          lines.push(current);
          current = word;
        } else {
          current = test;
        }
      });
      if (current) lines.push(current);
    });

    const pageHeight  = 842;
    const usableHeight = pageHeight - margin * 2;
    const linesPerPage = Math.floor(usableHeight / lineHeight);

    for (let i = 0; i < lines.length; i += linesPerPage) {
      const page  = pdfDoc.addPage([595, pageHeight]);
      const chunk = lines.slice(i, i + linesPerPage);
      chunk.forEach((line, idx) => {
        page.drawText(line, {
          x:    margin,
          y:    pageHeight - margin - idx * lineHeight,
          size: fontSize,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
      });
    }

    const bytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, bytes);
  }
}

module.exports = new DocumentConverter();
