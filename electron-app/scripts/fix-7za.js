#!/usr/bin/env node
/**
 * fix-7za.js — Workaround for environments (e.g., Accenture/BeyondTrust)
 * where the 7za.exe bundled with 7zip-bin@5.2.0 (v21.07) is flagged as
 * "Vulnerable Application" and blocked.
 *
 * What this does, only on Windows:
 *   1. Downloads 7-Zip "extra" (standalone 7za.exe v26.01) from 7-zip.org
 *      if no newer system 7z is present.
 *   2. Replaces node_modules/7zip-bin/win/{x64,ia32}/7za.exe with v26.01.
 *   3. Compiles a tiny C# wrapper (via .NET Framework csc.exe) that
 *      swallows exit code 2 when the ONLY errors emitted by 7za are
 *      "Cannot create symbolic link" entries. electron-builder needs this
 *      because winCodeSign-2.6.0.7z ships macOS dylib symlinks that cannot
 *      be created on Windows without admin/dev-mode.
 *   4. Installs the wrapper as 7za.exe, original moved to 7za-real.exe.
 *
 * Safe to run multiple times. Noop on non-Windows.
 */
'use strict'

const fs    = require('fs')
const path  = require('path')
const os    = require('os')
const { execFileSync } = require('child_process')

if (process.platform !== 'win32') {
  console.log('[fix-7za] Skipping (not Windows).')
  process.exit(0)
}

const repoRoot   = path.resolve(__dirname, '..', '..')
const sevenBin   = path.join(repoRoot, 'node_modules', '7zip-bin', 'win')
const archDirs   = ['x64', 'ia32', 'arm64'].filter(a => fs.existsSync(path.join(sevenBin, a)))

if (archDirs.length === 0) {
  console.log('[fix-7za] 7zip-bin not installed; nothing to do.')
  process.exit(0)
}

const log = (...a) => console.log('[fix-7za]', ...a)

function getFileVersion(file) {
  try {
    const psOut = execFileSync('powershell.exe',
      ['-NoProfile','-Command',`(Get-Item '${file}').VersionInfo.FileVersion`],
      { encoding: 'utf8' }).trim()
    return psOut
  } catch { return '' }
}

// ── Step 1: refresh 7za-real.exe if version is the vulnerable 21.x ──────────
const tmpDir = path.join(os.tmpdir(), 'onyria-7za-fix')
fs.mkdirSync(tmpDir, { recursive: true })

function needsRefresh() {
  for (const arch of archDirs) {
    const f = path.join(sevenBin, arch, '7za.exe')
    if (!fs.existsSync(f)) continue
    const v = getFileVersion(f)
    if (/^21\./.test(v) || /^20\./.test(v) || /^19\./.test(v) || /^18\./.test(v)) {
      log(`Detected vulnerable 7za.exe ${v} at ${f}`)
      return true
    }
  }
  return false
}

function downloadAndExtractNew7za() {
  // Use system 7-Zip if available to extract, else fall back to 7zr.exe
  const sys7z = ['C:\\Program Files\\7-Zip\\7z.exe', 'C:\\Program Files (x86)\\7-Zip\\7z.exe'].find(fs.existsSync)
  if (!sys7z) {
    log('System 7-Zip not found. Install 7-Zip first (winget install 7zip.7zip) and re-run.')
    process.exit(1)
  }
  const url = 'https://www.7-zip.org/a/7z2601-extra.7z'
  const archive = path.join(tmpDir, '7z-extra.7z')
  log('Downloading', url)
  execFileSync('powershell.exe',
    ['-NoProfile','-Command',`Invoke-WebRequest -Uri '${url}' -OutFile '${archive}' -UseBasicParsing`],
    { stdio: 'inherit' })
  log('Extracting with', sys7z)
  const extractDir = path.join(tmpDir, 'extracted')
  fs.rmSync(extractDir, { recursive: true, force: true })
  execFileSync(sys7z, ['x', archive, `-o${extractDir}`, '-y'], { stdio: 'inherit' })
  return extractDir
}

if (needsRefresh()) {
  const extracted = downloadAndExtractNew7za()
  for (const arch of archDirs) {
    const src = path.join(extracted, arch === 'arm64' ? 'arm64\\7za.exe' : '7za.exe')
    if (!fs.existsSync(src)) { log('missing source for', arch); continue }
    const dst = path.join(sevenBin, arch, '7za.exe')
    fs.copyFileSync(src, dst)
    log('Replaced', dst, 'with', getFileVersion(dst))
  }
}

// ── Step 2: compile the symlink-tolerant wrapper ─────────────────────────────
const wrapperSrc = path.join(__dirname, '..', '7za-wrapper.cs')
if (!fs.existsSync(wrapperSrc)) {
  log('FATAL: wrapper source missing at', wrapperSrc)
  process.exit(1)
}

function findCsc() {
  const root = 'C:\\Windows\\Microsoft.NET\\Framework'
  if (!fs.existsSync(root)) return null
  const versions = fs.readdirSync(root).filter(d => d.startsWith('v')).sort().reverse()
  for (const v of versions) {
    const csc = path.join(root, v, 'csc.exe')
    if (fs.existsSync(csc)) return csc
  }
  return null
}

const csc = findCsc()
if (!csc) {
  log('FATAL: .NET Framework csc.exe not found. .NET Framework 4.x is required.')
  process.exit(1)
}

const wrapperExe = path.join(__dirname, '..', '7za-wrapper.exe')
if (!fs.existsSync(wrapperExe) ||
    fs.statSync(wrapperSrc).mtimeMs > fs.statSync(wrapperExe).mtimeMs) {
  log('Compiling wrapper:', wrapperExe)
  execFileSync(csc,
    ['/nologo','/optimize+','/target:exe','/platform:anycpu',`/out:${wrapperExe}`, wrapperSrc],
    { stdio: 'inherit' })
}

// ── Step 3: install wrapper as 7za.exe in each arch ──────────────────────────
for (const arch of archDirs) {
  const dir  = path.join(sevenBin, arch)
  const real = path.join(dir, '7za-real.exe')
  const live = path.join(dir, '7za.exe')

  // If 7za.exe is already our wrapper (small + no FileVersion), skip
  const stat = fs.statSync(live)
  if (stat.size < 50 * 1024) {
    log(`${arch}: wrapper already installed, refreshing copy`)
  } else {
    if (fs.existsSync(real)) fs.unlinkSync(real)
    fs.renameSync(live, real)
  }
  fs.copyFileSync(wrapperExe, live)
  log(`${arch}: installed wrapper -> 7za.exe (real binary at 7za-real.exe)`)
}

log('Done. electron-builder should now extract winCodeSign successfully.')
