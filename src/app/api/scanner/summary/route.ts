import { NextResponse } from 'next/server';

// Helper to fetch and parse the remote scanner page
async function fetchScannerSummary() {
  const res = await fetch('https://scanner.synapselabs.xyz/?all');
  const text = await res.text();
  // Extract key fields from the raw text
  const get = (label: string) => {
    // Use multiline and case-insensitive flags, and anchor to start of line for robustness
    const match = text.match(new RegExp('^' + label + '\\s*=\\s*(.*)$', 'mi'));
    if (!match) return '';
    // Remove any HTML tags if present
    return match[1].replace(/<[^>]*>/g, '').trim();
  };
  return {
    channelName: get('Scanner Channel Name'),
    currentListeners: get('Current Listeners'),
    peakListeners: get('Peak Listeners'),
    metadata: get('Metadata'),
  };
}

export async function GET() {
  try {
    const summary = await fetchScannerSummary();
    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch scanner data' }, { status: 500 });
  }
}
