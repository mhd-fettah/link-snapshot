function lineStatus(trimmed, seen) {
    if (!trimmed) return 'empty';
    try {
        const url = new URL(trimmed);
        if (!['http:', 'https:'].includes(url.protocol)) return 'invalid';
        if (seen.has(url.href)) return 'duplicate';
        seen.add(url.href);
        return 'valid';
    } catch {
        return 'invalid';
    }
}

function parseUrls(text) {
    const seen = new Set();
    const urls = [];
    const lines = [];
    let duplicatesRemoved = 0;
    let invalidSkipped = 0;

    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        const status = lineStatus(trimmed, seen);
        if (status === 'empty') continue;
        lines.push({ text: trimmed, status });
        if (status === 'valid') urls.push(new URL(trimmed).href);
        else if (status === 'duplicate') duplicatesRemoved++;
        else invalidSkipped++;
    }

    return { urls, lines, duplicatesRemoved, invalidSkipped };
}

module.exports = { parseUrls };
