// Guards the style guide rules: tokens only (no raw hex), light only (no dark:).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../src', import.meta.url).pathname;
const allowedHexFiles = new Set(['styles/globals.css', 'api/schema.d.ts']);
const rules = [
    {
        name: 'raw hex colour (use a theme token)',
        pattern: /#[0-9a-fA-F]{3,8}\b(?![\w-])/g,
        hexOnly: true,
    },
    { name: 'dark: variant (light only)', pattern: /(?<![\w-])dark:/g },
];

function walk(dir) {
    return readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry);

        return statSync(path).isDirectory() ? walk(path) : [path];
    });
}

let failures = 0;

for (const file of walk(root)) {
    if (!/\.(tsx?|css)$/.test(file)) continue;
    const rel = relative(root, file);
    const text = readFileSync(file, 'utf8');

    for (const rule of rules) {
        if (rule.hexOnly && allowedHexFiles.has(rel)) continue;
        // Skip Tailwind arbitrary refs such as bg-[#fff] only when they are tokens; all hex fails.
        const matches = text.match(rule.pattern);
        if (matches) {
            failures += matches.length;
            console.error(
                `${rel}: ${rule.name}: ${[...new Set(matches)].join(', ')}`,
            );
        }
    }
}

if (failures > 0) {
    console.error(`\nStyle check failed (${failures}).`);
    process.exit(1);
}
console.log('Style check passed.');
