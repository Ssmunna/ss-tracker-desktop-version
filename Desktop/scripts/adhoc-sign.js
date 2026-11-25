// macOS only shows notifications for an app with a valid code signature. Without an Apple
// Developer ID certificate (CSC_LINK) electron-builder skips signing, so sign ad hoc here.
// An ad-hoc signature is free; it makes notifications work but is not a trusted identity
// (Gatekeeper still asks "Open anyway", and macOS cannot auto-update it).
const { execFileSync } = require('node:child_process');
const path = require('node:path');

exports.default = async function adhocSign(context) {
    if (context.electronPlatformName !== 'darwin' || process.env.CSC_LINK) {
        return;
    }

    const app = path.join(
        context.appOutDir,
        `${context.packager.appInfo.productFilename}.app`,
    );

    execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], {
        stdio: 'inherit',
    });
    execFileSync('codesign', ['--verify', '--deep', '--strict', '--verbose=2', app], {
        stdio: 'inherit',
    });
};
