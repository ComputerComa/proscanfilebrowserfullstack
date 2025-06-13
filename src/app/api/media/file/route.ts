// API route: /api/media/file?path=relative/path/to/file
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const url = new URL(req.url!);
  const filePath = url.searchParams.get('path');
  if (!filePath) {
    return NextResponse.json({ error: 'Missing file path' }, { status: 400 });
  }
  // Only allow access within the Recordings directory
  const baseDir = path.resolve("C:/Users/walker dick/Documents/Coding/proscanfilebrowserfullstack/Files/Recordings");
  const absPath = path.resolve(baseDir, filePath);
  if (!absPath.startsWith(baseDir)) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
  }
  if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
  const fileName = path.basename(absPath);
  const fileStream = fs.createReadStream(absPath);
  const headers = new Headers();
  headers.set('Content-Type', 'audio/mpeg'); // You may want to detect MIME type
  if (url.searchParams.get('download') === '1') {
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
  }
  // Use ReadableStream as the type for fileStream, cast to unknown first
  return new NextResponse(fileStream as unknown as ReadableStream, { headers });
}
