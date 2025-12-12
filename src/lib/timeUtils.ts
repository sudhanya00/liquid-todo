/**
 * Converts a timestamp to a human-readable relative time string
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Relative time string (e.g., "2 hours ago", "yesterday")
 */
export function getRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    // Just now (< 1 minute)
    if (seconds < 60) {
        return "just now";
    }

    // Minutes ago (< 1 hour)
    if (minutes < 60) {
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    }

    // Hours ago (< 24 hours)
    if (hours < 24) {
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }

    // Yesterday
    if (days === 1) {
        const time = new Date(timestamp).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        return `yesterday at ${time}`;
    }

    // Days ago (< 7 days)
    if (days < 7) {
        return `${days} days ago`;
    }

    // Older: show date (e.g., "Jan 15")
    const date = new Date(timestamp);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
}

/**
 * Formats a timestamp to a short relative time for previews
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Short relative time (e.g., "2h ago", "3d ago")
 */
export function getShortRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    const date = new Date(timestamp);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
}
