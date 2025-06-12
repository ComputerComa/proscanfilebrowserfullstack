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

export default function Home() {
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [isMounted, setIsMounted] = React.useState(false);
  const [enabledDates, setEnabledDates] = React.useState<string[]>([]);
  const [fileTree, setFileTree] = React.useState<any>(null);
  // Media player state
  const [selectedFileUrl, setSelectedFileUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsMounted(true);
    // Fetch enabled dates from the API
    fetch("/api/dates")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setEnabledDates(data);
        }
      })
      .catch((err) => console.error("Failed to fetch enabled dates:", err));
  }, []);

  // Fetch file tree when a date is selected
  React.useEffect(() => {
    if (selectedDate) {
      const formatted = formatDate(selectedDate);
      fetch(`/api/dates/${formatted}`)
        .then((res) => res.json())
        .then((data) => {
          setFileTree(data);
        })
        .catch((err) => console.error("Failed to fetch file tree:", err));
    } else {
      setFileTree(null);
    }
  }, [selectedDate]);

  // Helper to format a JS Date to MM-DD-YY (using UTC to avoid timezone issues)
  const formatDate = (date: Date) => {
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const year = String(date.getUTCFullYear()).slice(-2);
    return `${month}-${day}-${year}`;
  };

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
  const sortChildren = (children: any[]) => {
    if (!Array.isArray(children)) return children;
    return [...children].sort((a, b) => {
      if (sortOption === 'name-asc') return a.name.localeCompare(b.name);
      if (sortOption === 'name-desc') return b.name.localeCompare(a.name);
      if (sortOption === 'mtime-asc') return (a.mtime ?? 0) - (b.mtime ?? 0);
      if (sortOption === 'mtime-desc') return (b.mtime ?? 0) - (a.mtime ?? 0);
      return 0;
    });
  };

  // Recursive function to render the tree
  const renderTree = (node: any, parentPath = "") => {
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
          {Array.isArray(node.children) && sortChildren(node.children).map((child: any) => renderTree(child, currentPath))}
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

  // Auto refresh interval in seconds (configurable)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = React.useState(true);
  const [autoRefreshInterval, setAutoRefreshInterval] = React.useState(60); // default 60s

  React.useEffect(() => {
    if (autoRefreshEnabled && !selectedFileUrl) {
      const interval = setInterval(() => {
        window.location.reload();
      }, autoRefreshInterval * 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [selectedFileUrl, autoRefreshEnabled, autoRefreshInterval]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 gap-8">
      {isMounted && enabledDates.length > 0 && (
        <ThemeProvider theme={darkTheme}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <div className="flex flex-row items-start gap-8 w-full max-w-5xl">
              <Paper elevation={6} sx={{ p: 2, mb: 0 }}>
                {/* Auto-refresh controls (always visible, now above date picker) */}
                <div className="flex flex-row items-center mb-4 gap-2">
                  <label className="text-sm text-gray-300 flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={autoRefreshEnabled}
                      onChange={e => setAutoRefreshEnabled(e.target.checked)}
                      className="accent-indigo-500"
                    />
                    Auto-refresh
                  </label>
                  <span className="text-xs text-gray-400">Interval:</span>
                  <select
                    value={autoRefreshInterval}
                    onChange={e => setAutoRefreshInterval(Number(e.target.value))}
                    className="bg-gray-800 text-gray-100 rounded px-2 py-1 border border-gray-700 text-xs"
                    disabled={!autoRefreshEnabled}
                  >
                    <option value={10}>10 seconds</option>
                    <option value={30}>30 seconds</option>
                    <option value={60}>1 minute</option>
                    <option value={120}>2 minutes</option>
                    <option value={300}>5 minutes</option>
                    <option value={600}>10 minutes</option>
                  </select>
                </div>
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
              </Paper>
              {fileTree && (
                <Paper elevation={6} sx={{ p: 2, width: 400, maxHeight: 500, overflow: 'auto' }}>
                  <div className="flex flex-row items-center mb-2 gap-2">
                    <span className="text-sm text-gray-300">Sort by:</span>
                    <select
                      className="bg-gray-800 text-gray-100 rounded px-2 py-1 border border-gray-700"
                      value={sortOption}
                      onChange={e => setSortOption(e.target.value as any)}
                    >
                      <option value="name-asc">Name (A-Z)</option>
                      <option value="name-desc">Name (Z-A)</option>
                      <option value="mtime-asc">Modified (Oldest)</option>
                      <option value="mtime-desc">Modified (Newest)</option>
                    </select>
                  </div>
                  <SimpleTreeView>
                    {Array.isArray(fileTree)
                      ? fileTree.map((node: any) => renderTree(node))
                      : renderTree(fileTree)}
                  </SimpleTreeView>
                  {selectedFileUrl && (
                    <div className="mt-4">
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
                </Paper>
              )}
            </div>
          </LocalizationProvider>
        </ThemeProvider>
      )}
    </main>
  );
}
