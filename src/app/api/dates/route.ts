// API route: /api/dates
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

// Use explicit types for file/folder nodes
interface FileNode {
  type: 'file';
  name: string;
  mtime: number;
}
interface FolderNode {
  type: 'folder';
  name: string;
  children: Array<FileNode | FolderNode>;
}

function readDirRecursive(dirPath: string): Array<FileNode | FolderNode> {
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

function hashTree(node: FileNode | FolderNode | Array<FileNode | FolderNode> | null): string {
  if (!node) return '';
  if (Array.isArray(node)) {
    return crypto.createHash('sha1').update(node.map(hashTree).join('')).digest('hex');
  }
  if (node.type === 'file') {
    return crypto.createHash('sha1').update(node.name).digest('hex');
  } else {
    const childHashes = node.children.map(hashTree).join('');
    return crypto.createHash('sha1').update(node.name + childHashes).digest('hex');
  }
}

export async function GET(req: NextRequest) {
  const baseDir = "C:/Users/walker dick/Documents/Coding/proscanfilebrowserfullstack/Files/Recordings";
  let folders: string[] = [];
  try {
    folders = fs.readdirSync(baseDir).filter((f) => fs.statSync(path.join(baseDir, f)).isDirectory());
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: 'Could not read date folders', details: message }, { status: 500 });
  }
  // Get date from query
  const url = req instanceof Request ? new URL(req.url) : null;
  const selectedDate = url ? url.searchParams.get('date') : null;
  // List all files for all folders
  const allFiles: string[] = [];
  for (const date of folders) {
    const dateDir = path.join(baseDir, date);
    try {
      const walk = (dir: string, rel = ''): string[] => {
        const stats = fs.statSync(dir);
        if (stats.isDirectory()) {
          return fs.readdirSync(dir).flatMap(child => walk(path.join(dir, child), rel ? rel + '/' + child : child));
        } else {
          return [rel];
        }
      };
      allFiles.push(...walk(dateDir, date));
    } catch {}
  }
  // If a date is selected, return its file tree
  let tree: Array<FileNode | FolderNode> | null = null;
  let hash: string | null = null;
  let lastUpdated: number | null = null;
  if (selectedDate && folders.includes(selectedDate)) {
    const dateDir = path.join(baseDir, selectedDate);
    try {
      tree = readDirRecursive(dateDir);
      hash = hashTree(tree);
      // Get latest mtime
      const getLatestMtime = (node: FileNode | FolderNode | Array<FileNode | FolderNode> | null): number => {
        if (!node) return 0;
        if (Array.isArray(node)) return node.reduce((max, n) => Math.max(max, getLatestMtime(n)), 0);
        if (node.type === 'file') return node.mtime || 0;
        if (node.type === 'folder' && Array.isArray(node.children)) {
          return node.children.reduce((max: number, child: FileNode | FolderNode) => Math.max(max, getLatestMtime(child)), 0);
        }
        return 0;
      };
      lastUpdated = getLatestMtime(tree);
    } catch {}
  }
  return NextResponse.json({ dates: folders, files: allFiles, tree, hash, lastUpdated });
}
