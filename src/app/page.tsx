"use client";

import * as React from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { StaticDatePicker } from "@mui/x-date-pickers/StaticDatePicker";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Paper } from "@mui/material";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { TreeItem } from "@mui/x-tree-view/TreeItem";
import FolderIcon from "@mui/icons-material/Folder";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import { Chip } from "@mui/material";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

// Types for file/folder tree
export type FileNode = {
  type: 'file';
  name: string;
  mtime?: number;
};
export type FolderNode = {
  type: 'folder';
  name: string;
  children: Array<FileNode | FolderNode>;
};

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#18181b",
      paper: "#232336",
    },
    primary: {
      main: "#6366f1",
    },
    secondary: {
      main: "#f472b6",
    },
    text: {
      primary: "#f1f5f9",
      secondary: "#c7d2fe",
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          background: "rgba(35,35,54,0.7)",
          backdropFilter: "blur(8px)",
          borderRadius: "1rem",
        },
      },
    },
  },
});

function HomePage() {
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [isMounted, setIsMounted] = React.useState(false);
  const [enabledDates, setEnabledDates] = React.useState<string[]>([]);
  const [fileTree, setFileTree] = React.useState<FileNode | FolderNode | Array<FileNode | FolderNode> | null>(null);
  const [treeHash, setTreeHash] = React.useState<string | null>(null);
  // Media player state
  const [selectedFileUrl, setSelectedFileUrl] = React.useState<string | null>(null);
  // New state for tracking new files
  const [hasNewFiles, setHasNewFiles] = React.useState(false);
  // Header state for current date/time
  const [now, setNow] = React.useState(new Date());
  // Section: Remote Scanner Data
  const [scannerData, setScannerData] = React.useState<{ channelName?: string, currentListeners?: number, peakListeners?: number, metadata?: string } | null>(null);
  // Last updated state for archival data
  const [lastUpdated, setLastUpdated] = React.useState<number | null>(null);
  const searchParams = useSearchParams();
  const DEFAULT_KEY = "public";
  const keyFromQuery = searchParams.get("key") || DEFAULT_KEY;

  React.useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    setIsMounted(true);
    // Fetch enabled dates, all files, and file tree for selected date from the new API
    const key = keyFromQuery;
    const date = selectedDate ? `&date=${encodeURIComponent(formatDate(selectedDate))}` : '';
    fetch(`/api/dates?key=${encodeURIComponent(key)}${date}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.dates)) setEnabledDates(data.dates);
        if (data && data.tree) setFileTree(data.tree);
        else setFileTree(null);
        if (data && data.hash) setTreeHash(data.hash);
        else setTreeHash(null);
        if (data && typeof data.lastUpdated === 'number') setLastUpdated(data.lastUpdated);
        else setLastUpdated(null);
      })
      .catch((err) => console.error("Failed to fetch dates/files/tree:", err));
  }, [keyFromQuery, selectedDate]);

  // Called when the date changes in the picker
  const handleDateChange = (newDate: Date | null) => {
    setSelectedDate(newDate);
    if (newDate) {
      const formatted = formatDate(newDate);
      console.log("Selected date:", formatted);
    } else {
      console.log("Selected date:", null);
    }
  };

  // Sorting state for the file tree
  const [sortOption, setSortOption] = React.useState<'name-asc' | 'name-desc' | 'mtime-asc' | 'mtime-desc'>('name-asc');

  // Helper to sort children
  const sortChildren = (children: Array<FileNode | FolderNode>) => {
    if (!Array.isArray(children)) return children;
    return [...children].sort((a, b) => {
      if (sortOption === 'name-asc') return a.name.localeCompare(b.name);
      if (sortOption === 'name-desc') return b.name.localeCompare(a.name);
      if (sortOption === 'mtime-asc') return ((a as FileNode).mtime ?? 0) - ((b as FileNode).mtime ?? 0);
      if (sortOption === 'mtime-desc') return ((b as FileNode).mtime ?? 0) - ((a as FileNode).mtime ?? 0);
      return 0;
    });
  };

  // Recursive function to render the tree
  const renderTree = (node: FileNode | FolderNode, parentPath = "") => {
    if (!node) return null;
    // If the root is an array, parentPath will be "" and node.name is the first folder/file
    // For the root, parentPath should be the selected date (if set)
    let effectiveParentPath = parentPath;
    if (!parentPath && selectedDate) {
      // Use formatted date as the root folder
      effectiveParentPath = formatDate(selectedDate);
    }
    const currentPath = effectiveParentPath ? `${effectiveParentPath}/${node.name}` : node.name;
    if (node.type === "folder") {
      return (
        <TreeItem key={currentPath} itemId={currentPath} label={<><FolderIcon sx={{mr:1}}/>{node.name}</>}>
          {Array.isArray(node.children) && sortChildren(node.children).map((child) => renderTree(child, currentPath))}
        </TreeItem>
      );
    }
    // File node: add onClick to play and a download button
    return (
      <TreeItem
        key={currentPath}
        itemId={currentPath}
        label={
          <span className="flex items-center gap-2">
            <span
              className="cursor-pointer hover:text-indigo-400"
              onClick={() => {
                setSelectedFileUrl(`/api/media/file?path=${encodeURIComponent(currentPath)}`);
              }}
            >
              <InsertDriveFileIcon sx={{mr:1}}/>{node.name}
            </span>
            <a
              href={`/api/media/file?path=${encodeURIComponent(currentPath)}&download=1`}
              download
              className="ml-2 text-xs text-blue-400 hover:text-pink-400 underline cursor-pointer"
              title={`Download ${node.name}`}
              onClick={e => e.stopPropagation()}
            >
              Download
            </a>
          </span>
        }
      />
    );
  };

  // Handler for clicking the chip to update the tree (now just refetches the unified endpoint)
  const handleUpdateTree = () => {
    const key = keyFromQuery;
    const date = selectedDate ? `&date=${encodeURIComponent(formatDate(selectedDate))}` : '';
    fetch(`/api/dates?key=${encodeURIComponent(key)}${date}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.dates)) setEnabledDates(data.dates);
        if (data && data.tree) setFileTree(data.tree);
        else setFileTree(null);
        if (data && data.hash) setTreeHash(data.hash);
        else setTreeHash(null);
        if (data && typeof data.lastUpdated === 'number') setLastUpdated(data.lastUpdated);
        else setLastUpdated(null);
        setHasNewFiles(false);
      })
      .catch((err) => console.error("Failed to fetch dates/files/tree:", err));
  };

  React.useEffect(() => {
    async function fetchScannerData() {
      try {
        const res = await fetch('/api/scanner/summary');
        if (res.ok) {
          const data = await res.json();
          setScannerData(data);
        }
      } catch {
        // ignore
      }
    }
    fetchScannerData();
    const interval = setInterval(fetchScannerData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  // Helper to format a JS Date to MM-DD-YY (using UTC to avoid timezone issues)
  const formatDate = (date: Date) => {
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const year = String(date.getUTCFullYear()).slice(-2);
    return `${month}-${day}-${year}`;
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 gap-8">
      {/* Header with current date and time */}
      <header className="w-full flex justify-center mb-4">
        <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-pink-500 shadow-lg px-8 py-4 flex flex-col items-center" style={{ minWidth: 400 }}>
          <span className="text-2xl font-bold text-white tracking-wide mb-1">ProScan File Browser</span>
          <span className="text-lg text-white/90 font-mono">
            {now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {" "}
            {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </header>
      {/* Remote Scanner Data Section */}
      <section className="w-full flex justify-center mb-2">
        <div className="rounded-lg bg-gray-900/80 shadow px-6 py-3 flex flex-col items-center" style={{ minWidth: 400, maxWidth: 600 }}>
          <span className="text-lg font-semibold text-indigo-200 mb-1">Live Scanner Status</span>
          {scannerData ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-200 w-full">
              <span className="font-semibold">Channel Name:</span><span>{scannerData.channelName}</span>
              <span className="font-semibold">Current Listeners:</span><span>{scannerData.currentListeners}</span>
              <span className="font-semibold">Peak Listeners:</span><span>{scannerData.peakListeners}</span>
              <span className="font-semibold">Metadata:</span><span>{scannerData.metadata}</span>
            </div>
          ) : (
            <span className="text-gray-400 text-sm">Loading scanner data...</span>
          )}
        </div>
      </section>
      {isMounted && enabledDates.length > 0 && (
        <ThemeProvider theme={darkTheme}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Paper elevation={6} sx={{ p: 0, width: 820, height: 520, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', borderRadius: '1.5rem', overflow: 'hidden' }}>
              {/* Archival Data Header */}
              <div className="flex flex-row items-center justify-between px-8 py-3 border-b border-gray-800 bg-gray-950/80">
                <span className="text-xl font-semibold text-indigo-200 tracking-wide">Archival Data</span>
                <span className="text-xs text-gray-400 font-mono">
                  Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', flex: 1, alignItems: 'stretch', justifyContent: 'center' }}>
                {/* Left: Date picker */}
                <div style={{ width: 400, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', background: 'rgba(35,35,54,0.85)', borderRight: '1px solid #333' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px 24px 24px' }}>
                    <StaticDatePicker
                      displayStaticWrapperAs="desktop"
                      value={selectedDate}
                      onChange={handleDateChange}
                      shouldDisableDate={(date) => {
                        const formatted = formatDate(date);
                        return !enabledDates.includes(formatted);
                      }}
                      sx={{
                        "& .MuiPickersDay-root": {
                          color: "#f1f5f9",
                          "&.Mui-selected": {
                            backgroundColor: "#6366f1",
                            color: "#fff",
                          },
                          "&:hover": {
                            backgroundColor: "#f472b6",
                            color: "#fff",
                          },
                        },
                      }}
                      slotProps={{
                        actionBar: { actions: [] },
                      }}
                    />
                  </div>
                </div>
                {/* Right: File tree and audio player */}
                <div style={{ width: 420, height: '100%', display: 'flex', flexDirection: 'column', background: 'rgba(35,35,54,0.85)' }}>
                  <div className="flex flex-row items-center mb-2 gap-2 p-4 pb-0">
                    <span className="text-sm text-gray-300">Sort by:</span>
                    <select
                      className="bg-gray-800 text-gray-100 rounded px-2 py-1 border border-gray-700"
                      value={sortOption}
                      onChange={e => setSortOption(e.target.value as 'name-asc' | 'name-desc' | 'mtime-asc' | 'mtime-desc')}
                    >
                      <option value="name-asc">Name (A-Z)</option>
                      <option value="name-desc">Name (Z-A)</option>
                      <option value="mtime-asc">Modified (Oldest)</option>
                      <option value="mtime-desc">Modified (Newest)</option>
                    </select>
                    {hasNewFiles && (
                      <Chip
                        label="New files! Click to update"
                        color="secondary"
                        size="small"
                        onClick={handleUpdateTree}
                        sx={{ ml: 2, cursor: 'pointer', fontWeight: 600 }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 0 24px' }}>
                    <SimpleTreeView>
                      {Array.isArray(fileTree)
                        ? fileTree.map((node) => renderTree(node))
                        : fileTree && fileTree.type === 'folder' && Array.isArray(fileTree.children)
                          ? fileTree.children.map((node) => renderTree(node))
                          : fileTree && renderTree(fileTree)}
                    </SimpleTreeView>
                  </div>
                  {selectedFileUrl && (
                    <div className="mt-4 px-6 pb-4">
                      <audio
                        controls
                        autoPlay
                        src={selectedFileUrl}
                        style={{ width: '100%' }}
                        onEnded={() => setSelectedFileUrl(null)}
                      >
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}
                </div>
              </div>
            </Paper>
          </LocalizationProvider>
        </ThemeProvider>
      )}
      {/* Hash display */}
      {treeHash && (
        <div style={{ position: 'fixed', bottom: 8, right: 12, fontSize: '0.7rem', color: '#888', opacity: 0.7, pointerEvents: 'none', zIndex: 1000 }}>
          Hash: {treeHash}
        </div>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <Suspense>
      <HomePage />
    </Suspense>
  );
}
