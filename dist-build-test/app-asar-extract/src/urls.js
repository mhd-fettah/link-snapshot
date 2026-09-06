function parseUrls(text) {
    const seen = new Set();
    const urls = [];
    let duplicatesRemoved = 0;
    let invalidSkipped = 0;

    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
            const url = new URL(trimmed);
            if (!['http:', 'https:'].includes(url.protocol)) {
                invalidSkipped++;
                continue;
            }
            const key = url.href;
            if (seen.has(key)) {
                duplicatesRemoved++;
                continue;
            }
            seen.add(key);
            urls.push(key);
        } catch {
            invalidSkipped++;
        }
    }

    return { urls, duplicatesRemoved, invalidSkipped };
}

module.exports = { parseUrls };
