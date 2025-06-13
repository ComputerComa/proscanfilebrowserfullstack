// API route: /api/dates/files
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type FileNode = {
  type: 'file';
  name: string;
};
type FolderNode = {
  type: 'folder';
  name: string;
  children: Array<FileNode | FolderNode>;
};

function readDirRecursive(dirPath: string): FileNode | FolderNode {
  const stats = fs.statSync(dirPath);
  if (stats.isDirectory()) {
    const children = fs.readdirSync(dirPath);
    return {
      type: 'folder',
      name: path.basename(dirPath),
      children: children.map((child) => readDirRecursive(path.join(dirPath, child)))
    };
  } else {
    return {
      type: 'file',
      name: path.basename(dirPath)
    };
  }
}

export async function GET() {
  // Set your absolute folder path here
  const baseDir = "C:/Users/walker dick/Documents/Coding/proscanfilebrowserfullstack/Files/Recordings";
  let result: FileNode | FolderNode | null = null;
  try {
    result = readDirRecursive(baseDir);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: 'Could not read files', details: message }, { status: 500 });
  }
  return NextResponse.json(result);
}
