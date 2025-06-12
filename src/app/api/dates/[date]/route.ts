// API route: /api/dates/[date]
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function readDirRecursive(dirPath: string): any[] {
  const stats = fs.statSync(dirPath);
  if (!stats.isDirectory()) return [];
  const children = fs.readdirSync(dirPath);
  return children.map((child) => {
    const childPath = path.join(dirPath, child);
    const childStats = fs.statSync(childPath);
    if (childStats.isDirectory()) {
      return {
        type: 'folder',
        name: path.basename(childPath),
        children: readDirRecursive(childPath)
      };
    } else {
      return {
        type: 'file',
        name: path.basename(childPath),
        mtime: childStats.mtimeMs
      };
    }
  });
}

export async function GET(req: NextRequest, { params }: { params: { date: string } }) {
  const { date } = params;
  const baseDir = path.join("C:/Users/walker dick/Documents/Coding/proscanfilebrowserfullstack/Files/Recordings", date);
  let result: any = [];
  try {
    result = readDirRecursive(baseDir);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: 'Could not read files', details: message }, { status: 500 });
  }
  return NextResponse.json(result);
}