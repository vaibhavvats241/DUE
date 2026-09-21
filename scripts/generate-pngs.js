import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, getPixel) {
  // width, height: ints
  // getPixel(x, y): [r, g, b, a]
  const bytesPerPixel = 4;
  const rowBytes = width * bytesPerPixel + 1; // 1 byte filter per line
  const rawData = Buffer.alloc(rowBytes * height);

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowBytes;
    rawData[rowStart] = 0; // Filter type 0: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      const pixelStart = rowStart + 1 + x * bytesPerPixel;
      rawData[pixelStart] = r;
      rawData[pixelStart + 1] = g;
      rawData[pixelStart + 2] = b;
      rawData[pixelStart + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: 6 (RGBA)
  ihdrData[10] = 0; // Compression method
  ihdrData[11] = 0; // Filter method
  ihdrData[12] = 0; // Interlace method
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT chunk
  const idatChunk = makeChunk('IDAT', deflated);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    crc = crc ^ byte;
    for (let j = 0; j < 8; j++) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function renderDueIcon(size, isMaskable = false) {
  const bgR1 = 30, bgG1 = 58, bgB1 = 138; // #1E3A8A
  const bgR2 = 37, bgG2 = 99, bgB2 = 235; // #2563EB
  const cornerRadius = isMaskable ? 0 : size * 0.22;

  return createPNG(size, size, (x, y) => {
    // Check rounded corner for non-maskable
    if (!isMaskable) {
      const distCorner = (cx, cy) => Math.hypot(x - cx, y - cy);
      if (x < cornerRadius && y < cornerRadius && distCorner(cornerRadius, cornerRadius) > cornerRadius) return [0, 0, 0, 0];
      if (x > size - cornerRadius && y < cornerRadius && distCorner(size - cornerRadius, cornerRadius) > cornerRadius) return [0, 0, 0, 0];
      if (x < cornerRadius && y > size - cornerRadius && distCorner(cornerRadius, size - cornerRadius) > cornerRadius) return [0, 0, 0, 0];
      if (x > size - cornerRadius && y > size - cornerRadius && distCorner(size - cornerRadius, size - cornerRadius) > cornerRadius) return [0, 0, 0, 0];
    }

    const t = (x + y) / (2 * size);
    const bgR = Math.round(bgR1 + t * (bgR2 - bgR1));
    const bgG = Math.round(bgG1 + t * (bgG2 - bgG1));
    const bgB = Math.round(bgB1 + t * (bgB2 - bgB1));

    // Inner White card region
    const cardX1 = size * 0.24;
    const cardX2 = size * 0.76;
    const cardY1 = size * 0.22;
    const cardY2 = size * 0.78;

    if (x >= cardX1 && x <= cardX2 && y >= cardY1 && y <= cardY2) {
      // Inner card header bar
      if (y < cardY1 + size * 0.12) {
        return [241, 245, 249, 255]; // slate-100
      }
      // Green bottom pill
      if (y > cardY2 - size * 0.12 && x > size * 0.32 && x < size * 0.68) {
        return [16, 185, 129, 255]; // emerald-500
      }
      // Center Rupee symbol approximation pattern
      const cx = size * 0.5;
      const cy = size * 0.48;
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);
      // Horizontal bars of rupee
      if (Math.abs(y - (cy - size * 0.08)) < size * 0.018 && dx < size * 0.14) {
        return [30, 58, 138, 255];
      }
      if (Math.abs(y - (cy - size * 0.03)) < size * 0.018 && dx < size * 0.12) {
        return [30, 58, 138, 255];
      }
      // Vertical stem
      if (Math.abs(x - (cx - size * 0.05)) < size * 0.018 && y >= cy - size * 0.08 && y <= cy + size * 0.14) {
        return [30, 58, 138, 255];
      }
      // Upper loop
      if (x >= cx - size * 0.05 && x <= cx + size * 0.08 && y >= cy - size * 0.08 && y <= cy + size * 0.04) {
        const loopDist = Math.hypot(x - (cx - size * 0.02), y - (cy - size * 0.02));
        if (loopDist > size * 0.04 && loopDist < size * 0.075) {
          return [30, 58, 138, 255];
        }
      }
      // Diagonal leg
      if (x >= cx - size * 0.04 && x <= cx + size * 0.09 && y >= cy + size * 0.02 && y <= cy + size * 0.14) {
        if (Math.abs((x - (cx - size * 0.04)) - (y - (cy + size * 0.02))) < size * 0.025) {
          return [30, 58, 138, 255];
        }
      }

      return [255, 255, 255, 255];
    }

    return [bgR, bgG, bgB, 255];
  });
}

fs.writeFileSync('public/pwa-192x192.png', renderDueIcon(192, false));
fs.writeFileSync('public/pwa-512x512.png', renderDueIcon(512, false));
fs.writeFileSync('public/pwa-maskable-512x512.png', renderDueIcon(512, true));
fs.writeFileSync('public/apple-touch-icon.png', renderDueIcon(180, false));
console.log('Successfully generated all PWA PNG icons.');
