// API route: /api/dates
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  // Set your absolute folder path here
  const baseDir = "C:/Users/walker dick/Documents/Coding/proscanfilebrowserfullstack/Files/Recordings";
  let folders: string[] = [];
  try {
    folders = fs.readdirSync(baseDir).filter((f) => fs.statSync(path.join(baseDir, f)).isDirectory());
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: 'Could not read date folders', details: message }, { status: 500 });
  }
  return NextResponse.json(folders);
}
