const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');

// Converter (file)
const ImageConverter = require('./converters/ImageConverter');
const Document = require('./converters/Document');
const Media = require('./converters/Media');

// Create main window
function createWindow() {
    const win = new BrowserWindow({
        width: 860,
        height: 620,
        minWidth:  720,
        minHeight: 500,
        frame: false, // for HTML
        transparent: false,
        backgroundColor: '#0a0a0f',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true, // Isolation Context
            nodeIntegration: false // Node.js blocked for renderer
        },
        icon: path.join(__dirname, 'assets', 'favicon.ico')
    });

    // UI
    win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    // Open DevTools (only develop)
    if (process.env.NODE_ENV === 'development') {
        win.webContents.openDevTools();
    }

    return win;
}

// Start Application
app.whenReady().then(() => {
    const win = createWindow();

    // MacOS
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Close Application
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC - renderer
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Pick file for convert',
    properties: ['openFile'],
    filters: [
      { name: 'Photo',    extensions: ['jpg','jpeg','png','webp','avif','tiff','bmp','gif'] },
      { name: 'Documents',  extensions: ['pdf','docx','txt','html'] },
      { name: 'Audio',      extensions: ['mp3','wav','flac','aac','ogg','m4a'] },
      { name: 'Video',      extensions: ['mp4','avi','mkv','mov','webm','wmv'] },
      { name: 'All File', extensions: ['*'] },
    ],
  });

  if (canceled || filePaths.length === 0) return null;

  const filePath = filePaths[0];

  // Back basic info file
  return {
    path: filePath,
    name: path.basename(filePath),
    ext:  path.extname(filePath).toLowerCase().replace('.', ''),
    size: fs.statSync(filePath).size,
  };
});

// IPC - open
ipcMain.handle('dialog:saveFile', async (_, { defaultName, ext }) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Uložit převedený soubor',
    defaultPath: defaultName,
    filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
  });

  if (canceled) return null;
  return filePath;
});

// IPC - converter
ipcMain.handle('file:convert', async (_, { inputPath, outputPath, targetFormat }) => {
  const inputExt = path.extname(inputPath).toLowerCase().replace('.', '');

  try {
    // Determine file type and select converter

    if (isImage(inputExt)) {
      // Convert image using sharp
      await ImageConverter.convert(inputPath, outputPath, targetFormat);

    } else if (isDocument(inputExt)) {
      // Convert document
      await Document.convert(inputPath, outputPath, targetFormat);

    } else if (isMedia(inputExt)) {
      // Convert audio or video using FFmpeg
      await Media.convert(inputPath, outputPath, targetFormat);

    } else {
      throw new Error(`Unsupported input file format: .${inputExt}`);
    }

    return { success: true, outputPath };

} catch (err) {
    // Return the error back to the renderer
    return { success: false, error: err.message };
}
});

// IPC - open folder
ipcMain.handle('shell:showInFolder', async (_, filePath) => {
  shell.showItemInFolder(filePath);
});

// IPC - window
ipcMain.on('window:minimize', () => {
  BrowserWindow.getFocusedWindow()?.minimize();
});

ipcMain.on('window:maximize', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return;
  win.isMaximized() ? win.unmaximize() : win.maximize();
});

ipcMain.on('window:close', () => {
  BrowserWindow.getFocusedWindow()?.close();
});

// Helper function
function isImage(ext) {
  return ['jpg','jpeg','png','webp','avif','tiff','tif','bmp','gif'].includes(ext);
}

/** Returns true if the extension is a document format */
function isDocument(ext) {
  return ['pdf','docx','txt','html','htm'].includes(ext);
}

/** Returns true if the extension is an audio or video format */
function isMedia(ext) {
  return ['mp3','wav','flac','aac','ogg','m4a','mp4','avi','mkv','mov','webm','wmv'].includes(ext);
}