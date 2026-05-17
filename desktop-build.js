import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tempDir = path.join(__dirname, 'dist-desktop-temp');
const outDir = path.join(__dirname, 'dist-desktop');

console.log('[DESKTOP BUILD] Starting ultra-clean desktop compilation...');

try {
    // 1. Run Vite build
    console.log('[DESKTOP BUILD] Compiling Vite frontend...');
    execSync('cmd.exe /c npm run build', { stdio: 'inherit' });

    // 2. Clean and create temporary folder
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir);

    // 3. Copy required assets
    console.log('[DESKTOP BUILD] Copying distribution assets...');
    fs.cpSync(path.join(__dirname, 'dist'), path.join(tempDir, 'dist'), { recursive: true });
    fs.copyFileSync(path.join(__dirname, 'desktop-main.js'), path.join(tempDir, 'desktop-main.js'));
    fs.copyFileSync(path.join(__dirname, 'desktop-preload.js'), path.join(tempDir, 'desktop-preload.js'));

    // 4. Create a lightweight package.json containing only runtime requirements
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    const cleanPkg = {
        name: pkg.name,
        version: pkg.version,
        main: 'desktop-main.js',
        type: 'commonjs', // CommonJS for runtime compatibility inside packaged Electron
        dependencies: {}  // Zero devDependencies or source-level dependencies required!
    };
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(cleanPkg, null, 2));

    // 5. Run Electron Packager on the clean temp folder
    console.log('[DESKTOP BUILD] Packaging standalone borderless application...');
    if (fs.existsSync(outDir)) {
        fs.rmSync(outDir, { recursive: true, force: true });
    }

    execSync(`npx electron-packager "${tempDir}" fatale --platform=win32 --arch=x64 --out="${outDir}" --overwrite`, { stdio: 'inherit' });

    // 6. Clean up temp folder
    console.log('[DESKTOP BUILD] Cleaning up build workspace...');
    fs.rmSync(tempDir, { recursive: true, force: true });

    console.log('[DESKTOP BUILD] Standalone executable compiled successfully in dist-desktop/fatale-win32-x64!');
} catch (error) {
    console.error('[DESKTOP BUILD] CRITICAL BUILD ERROR:', error);
    process.exit(1);
}
