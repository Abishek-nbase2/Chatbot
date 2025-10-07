import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
// __dirname is not defined in ESM. Derive it from import.meta.url so
// the built ESM file (in dist-electron) can locate the preload script.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
function createWindow() {
    const win = new BrowserWindow({
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });
    win.loadURL('http://localhost:5173');
}
app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
