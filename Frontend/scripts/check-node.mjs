// Vite 8 needs Node 20.19+ (or 22.12+). Fail early with a clear message.
const [major, minor] = process.versions.node.split('.').map(Number);
const ok = (major === 20 && minor >= 19) || major > 22 || (major === 22 && minor >= 12);

if (!ok) {
    console.error(
        `\nNode ${process.versions.node} is too old for this project (needs 20.19+ or 22.12+).\n` +
            'Run:  source ~/.nvm/nvm.sh && nvm use     (reads .nvmrc, Node 22)\n',
    );
    process.exit(1);
}
