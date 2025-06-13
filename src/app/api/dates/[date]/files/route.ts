// API route: /api/dates/[date]/files
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

type FileNode = {
  type: 'file';
  name: string;
  mtime?: number;
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
      name: path.basename(dirPath),
      mtime: stats.mtimeMs
    };
  }
}

function hashTree(node: FileNode | FolderNode): string {
  if (node.type === 'file') {
    return crypto.createHash('sha1').update(node.name).digest('hex');
  } else {
    const childHashes = node.children.map(hashTree).join('');
    return crypto.createHash('sha1').update(node.name + childHashes).digest('hex');
  }
}

// Simple in-memory key store (for demo; use a DB or env var in production)
const FILE_KEYS: Record<string, string> = {
  // Example: '01-01-25': 'secretkey123',
  // Add more date-folder: key pairs as needed
};

function isAuthorized(date: string, req: NextRequest): boolean {
  // Check for key in query or header
  const url = new URL(req.url);
  const providedKey = url.searchParams.get('key') || req.headers.get('x-access-key');
  const expectedKey = FILE_KEYS[date];
  if (!expectedKey) return false; // No key set for this date
  return providedKey === expectedKey;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isAuthorized(date, req)) {
    return NextResponse.json({ error: 'Unauthorized: missing or invalid key' }, { status: 401 });
  }
  const baseDir = path.join("C:/Users/walker dick/Documents/Coding/proscanfilebrowserfullstack/Files/Recordings", date);
  let result: FileNode | FolderNode | null = null;
  let hash: string | null = null;
  try {
    result = readDirRecursive(baseDir);
    if (result) {
      hash = hashTree(result);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: 'Could not read files', details: message }, { status: 500 });
  }
  // Use the current timestamp as lastUpdated
  const lastUpdated = Date.now();
  return NextResponse.json({ tree: result, hash, lastUpdated });
}
