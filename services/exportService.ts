import { VinylRecord, DiscogsCollectionItem } from '../types';

// Minimal ZIP builder — produces a valid ZIP without external dependencies
// Uses the standard "stored" method (no compression) which is simplest and
// perfectly acceptable for collections of small JSON/CSV + already-compressed JPEGs.

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function textEncode(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function toLittleEndian16(v: number): Uint8Array {
  return new Uint8Array([v & 0xff, (v >> 8) & 0xff]);
}

function toLittleEndian32(v: number): Uint8Array {
  return new Uint8Array([v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff]);
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

function buildZip(entries: ZipEntry[]): Blob {
  const parts: Uint8Array[] = [];
  const centralDir: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = textEncode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    // Local file header
    const localHeader = new Uint8Array([
      0x50, 0x4b, 0x03, 0x04, // signature
      0x14, 0x00,             // version needed (2.0)
      0x00, 0x00,             // flags
      0x00, 0x00,             // compression (stored)
      0x00, 0x00,             // mod time
      0x00, 0x00,             // mod date
      ...toLittleEndian32(crc),
      ...toLittleEndian32(size),
      ...toLittleEndian32(size),
      ...toLittleEndian16(nameBytes.length),
      0x00, 0x00,             // extra field length
    ]);

    parts.push(localHeader);
    parts.push(nameBytes);
    parts.push(entry.data);

    // Central directory entry
    const cdEntry = new Uint8Array([
      0x50, 0x4b, 0x01, 0x02,
      0x14, 0x00,             // version made by
      0x14, 0x00,             // version needed
      0x00, 0x00,             // flags
      0x00, 0x00,             // compression
      0x00, 0x00,             // mod time
      0x00, 0x00,             // mod date
      ...toLittleEndian32(crc),
      ...toLittleEndian32(size),
      ...toLittleEndian32(size),
      ...toLittleEndian16(nameBytes.length),
      0x00, 0x00,             // extra field length
      0x00, 0x00,             // file comment length
      0x00, 0x00,             // disk number start
      0x00, 0x00,             // internal file attrs
      0x00, 0x00, 0x00, 0x00, // external file attrs
      ...toLittleEndian32(offset),
    ]);
    centralDir.push(cdEntry);
    centralDir.push(nameBytes);

    offset += localHeader.length + nameBytes.length + entry.data.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const cd of centralDir) {
    parts.push(cd);
    cdSize += cd.length;
  }

  // End of central directory
  const eocd = new Uint8Array([
    0x50, 0x4b, 0x05, 0x06,
    0x00, 0x00,             // disk number
    0x00, 0x00,             // disk with CD
    ...toLittleEndian16(entries.length),
    ...toLittleEndian16(entries.length),
    ...toLittleEndian32(cdSize),
    ...toLittleEndian32(cdOffset),
    0x00, 0x00,             // comment length
  ]);
  parts.push(eocd);

  return new Blob(parts as BlobPart[], { type: 'application/zip' });
}

function recordToCsvRow(r: VinylRecord): string {
  const escape = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
  return [
    escape(r.artist),
    escape(r.title),
    escape(r.year),
    escape(r.label),
    escape(r.catalogNumber),
    escape(r.country || ''),
    escape(r.format || ''),
    escape(r.condition || ''),
    escape(r.estimatedPrice),
    escape(r.discogsUrl),
    r.discogsReleaseId?.toString() || '',
    escape(r.description),
    new Date(r.dateAdded).toISOString(),
  ].join(',');
}

function discogsToCsvRow(item: DiscogsCollectionItem): string {
  const escape = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
  const info = item.basic_information;
  return [
    escape(info.artists?.map(a => a.name).join('; ') || ''),
    escape(info.title),
    info.year?.toString() || '',
    escape(info.labels?.map(l => l.name).join('; ') || ''),
    escape(info.labels?.[0]?.catno || ''),
    '""',
    escape(info.formats?.map(f => f.name).join('; ') || ''),
    '""',
    '""',
    escape(`https://www.discogs.com/release/${info.id}`),
    info.id?.toString() || '',
    '""',
    item.date_added || '',
  ].join(',');
}

const CSV_HEADER = 'Artist,Title,Year,Label,Catalog Number,Country,Format,Condition,Estimated Price,Discogs URL,Discogs Release ID,Notes,Date Added';

async function fetchImageAsBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\- ]/g, '_').substring(0, 80);
}

export async function exportCollectionAsZip(
  localRecords: VinylRecord[],
  discogsItems: DiscogsCollectionItem[],
  onProgress?: (pct: number) => void,
): Promise<void> {
  const entries: ZipEntry[] = [];
  const totalImages = localRecords.reduce((n, r) => n + r.images.length, 0);
  let imagesDone = 0;

  // CSV file
  const csvRows = [CSV_HEADER];
  for (const r of localRecords) csvRows.push(recordToCsvRow(r));
  for (const d of discogsItems) csvRows.push(discogsToCsvRow(d));
  entries.push({ name: 'collection.csv', data: textEncode(csvRows.join('\n')) });

  // JSON file
  entries.push({
    name: 'collection.json',
    data: textEncode(JSON.stringify({ localRecords, discogsItems }, null, 2)),
  });

  // Download and include images from local records
  for (const record of localRecords) {
    const folder = sanitizeFilename(`${record.artist} - ${record.title}`);
    for (let i = 0; i < record.images.length; i++) {
      const url = record.images[i];
      const bytes = await fetchImageAsBytes(url);
      if (bytes) {
        const ext = url.includes('.png') ? 'png' : 'jpg';
        entries.push({ name: `images/${folder}/${i + 1}.${ext}`, data: bytes });
      }
      imagesDone++;
      onProgress?.(Math.round((imagesDone / totalImages) * 100));
    }
  }

  const blob = buildZip(entries);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `vinyl-collection-${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
