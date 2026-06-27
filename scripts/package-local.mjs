import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = join(root, 'dist');
const release = join(root, 'release');
const localDir = join(release, 'local');
const version = '1.1.3';

/**
 * Reads a UTF-8 text file and returns it as a string.
 * The launcher embeds HTML, CSS and JS directly, so all text assets must use the same encoding.
 */
function read(path) {
  return readFileSync(path, 'utf8');
}

/**
 * Finds the current hashed Vite asset inside dist/index.html.
 * Vite changes bundle names on each build, so the local exe cannot hard-code JS or CSS filenames.
 */
function findAsset(pattern) {
  const html = read(join(dist, 'index.html'));
  const match = html.match(pattern);
  if (!match) throw new Error(`无法在 dist/index.html 中定位资源：${pattern}`);
  return match[1].replace(/^\//, '');
}

/**
 * Escapes the delimiter used by the generated C++ raw string literal.
 * This prevents embedded HTML from accidentally terminating the launcher source string.
 */
function escapeRaw(value) {
  return value.replace(/\)JRHTML101"/g, ')JRHTML_ESC"');
}

if (!existsSync(join(dist, 'index.html'))) {
  throw new Error('请先运行 npm run build 生成 dist。');
}

mkdirSync(localDir, { recursive: true });

const jsAsset = findAsset(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
const cssAsset = findAsset(/<link rel="stylesheet" crossorigin href="([^"]+)">/);
const js = read(join(dist, jsAsset));
const css = read(join(dist, cssAsset));
const wasmBase64 = readFileSync(join(root, 'public', 'lcs_scs.wasm')).toString('base64');
const safeJs = js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

let html = read(join(dist, 'index.html'));
html = html
  .replace(/<script type="module" crossorigin src="[^"]+"><\/script>/, '')
  .replace(/<link rel="stylesheet" crossorigin href="[^"]+">/, '')
  .replace(
    '</head>',
    () => `<style>${css}</style>\n<script>window.__LCS_SCS_WASM_BASE64__="${wasmBase64}";</script>\n</head>`,
  )
  .replace('</body>', () => `<script type="module">${safeJs}</script>\n</body>`);

const localHtml = join(localDir, 'index.html');
writeFileSync(localHtml, html, 'utf8');

const launcherSource = `#include <windows.h>
#include <string.h>

const char* kHtml = R"JRHTML101(${escapeRaw(html)})JRHTML101";

/**
 * Builds the temporary index.html path used by the launcher.
 * The executable only writes this one file, then lets the system browser render the app.
 */
static BOOL temp_file_path(wchar_t* path, DWORD capacity) {
    wchar_t temp[MAX_PATH];
    DWORD len = GetTempPathW(MAX_PATH, temp);
    if (len == 0 || len >= MAX_PATH) return FALSE;
    if (lstrlenW(temp) + 32 >= (int)capacity) return FALSE;

    lstrcpyW(path, temp);
    lstrcatW(path, L"LCS_SCS_Visualizer_1_1_3");
    CreateDirectoryW(path, NULL);

    if (lstrlenW(path) + 12 >= (int)capacity) return FALSE;
    lstrcatW(path, L"\\\\index.html");
    return TRUE;
}

/**
 * Writes the embedded web app to the temp path and opens it with the default browser.
 */
int WINAPI WinMain(HINSTANCE, HINSTANCE, LPSTR, int) {
    wchar_t path[MAX_PATH * 2];
    if (!temp_file_path(path, MAX_PATH * 2)) return 1;

    HANDLE file = CreateFileW(path, GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
    if (file == INVALID_HANDLE_VALUE) return 1;

    DWORD written = 0;
    const DWORD size = (DWORD)strlen(kHtml);
    WriteFile(file, kHtml, size, &written, NULL);
    CloseHandle(file);
    ShellExecuteW(NULL, L"open", path, NULL, NULL, SW_SHOWNORMAL);
    return 0;
}
`;

const launcherCpp = join(localDir, 'launcher.cpp');
writeFileSync(launcherCpp, launcherSource, 'utf8');

const zig = join(root, 'tools', 'zig', 'zig.exe');
if (!existsSync(zig)) throw new Error(`未找到 Zig 编译器：${zig}`);

const runId = `${process.pid}-${Date.now()}`;
const tmpBase = process.env.TEMP || process.env.TMP || join(root, '.tmp');
const tmpRoot = join(tmpBase, 'lcs-scs-package-local', runId);
const temp = join(tmpRoot, 'launcher-build');
const zigGlobalCache = join(tmpRoot, 'zig-global-cache');
const zigLocalCache = join(tmpRoot, 'zig-local-cache');
mkdirSync(zigGlobalCache, { recursive: true });
mkdirSync(zigLocalCache, { recursive: true });
mkdirSync(temp, { recursive: true });
const tempCpp = join(temp, 'launcher.cpp');
copyFileSync(launcherCpp, tempCpp);

const exe = join(release, `LCS_SCS_Visualizer_${version}.exe`);
execFileSync(
  zig,
  [
    'c++',
    '-target',
    'x86_64-windows-gnu',
    '-std=c++17',
    '-O2',
    '-fno-exceptions',
    '-fno-rtti',
    '-nostdlib++',
    '-finput-charset=UTF-8',
    '-fexec-charset=UTF-8',
    tempCpp,
    '-lshell32',
    '-o',
    exe,
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      TEMP: temp,
      TMP: temp,
      ZIG_GLOBAL_CACHE_DIR: zigGlobalCache,
      ZIG_LOCAL_CACHE_DIR: zigLocalCache,
    },
  },
);

console.log(`Local single exe built: ${exe}`);
console.log(`Inline HTML copy: ${localHtml}`);
