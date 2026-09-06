const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const root = path.join(__dirname, '..');
const outTemp = path.join(os.tmpdir(), 'linksnap-dist');
const outFinal = path.join(root, 'dist');

function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const from = path.join(src, entry.name);
        const to = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(from, to);
        } else {
            fs.copyFileSync(from, to);
        }
    }
}

for (const dir of [outTemp]) {
    fs.rmSync(dir, { recursive: true, force: true });
}

execSync(`npx electron-builder --win --config.directories.output="${outTemp}"`, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
});

try {
    fs.rmSync(outFinal, { recursive: true, force: true });
} catch {
    console.warn('Could not remove dist; overwriting files instead.');
}

copyDir(outTemp, outFinal);
fs.rmSync(outTemp, { recursive: true, force: true });

console.log(`Build output: ${outFinal}`);
