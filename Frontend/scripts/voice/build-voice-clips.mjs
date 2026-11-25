#!/usr/bin/env node
// Pre-renders every line the mascot can say into tiny mp3 clips (Kokoro-82M, on your machine/server).
// The browser/Electron app then only PLAYS clips: no model, no WASM, ~10 KB per line.
//
//   node scripts/voice/build-voice-clips.mjs                       # everything in mascot-voice.config.json
//   node scripts/voice/build-voice-clips.mjs --names "Karim,Ayesha" # add new employees (incremental)
//   node scripts/voice/build-voice-clips.mjs --names-file users.json # ["Rahim", ...] or [{ "name": "Rahim" }, ...]
//
// Output: public/mascot/voice/{greet,msg,notif}/*.mp3 + manifest.json. Unchanged lines are skipped.
// Needs: node 18+, ffmpeg on PATH (falls back to .wav without it).
import * as ort from 'onnxruntime-web';
import { phonemize } from 'phonemizer';
import { readFile, writeFile, mkdir, access, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { KokoroLite } from './kokoro-lite.js';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'public/mascot/voice');
const MODEL_DIR = path.join(ROOT, '.voice-model');
const HF = 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main';
const MODEL_SHA256 = 'fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478';

const exists = (p) => access(p).then(() => true, () => false);
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const TITLES = new Set(['md', 'mr', 'mrs', 'ms', 'dr', 'engr', 'eng', 'sk']);
/** "Md. Sabbir Hossain" -> "Sabbir". Same rule as src/features/mascot/names.ts. */
export function firstName(full = '') {
  const words = full.replace(/\(.*?\)/g, ' ').split(/[\s.]+/).filter(Boolean);
  return words.find((w) => !TITLES.has(w.toLowerCase()) && w.length > 1) ?? words[0] ?? '';
}
export const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function fetchTo(url, dest, sha) {
  if (await exists(dest)) return;
  console.log('↓', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (sha && createHash('sha256').update(buf).digest('hex') !== sha) throw new Error('checksum mismatch: ' + url);
  await writeFile(dest, buf);
}

function hasFfmpeg() { try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return true; } catch { return false; } }

function wav(pcm, sr) {
  const n = pcm.length, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(pcm[i] * 32767))), 44 + i * 2);
  return b;
}

/** trim leading/trailing silence so clips feel snappy */
function trim(pcm, sr, thr = 0.01) {
  let a = 0, z = pcm.length - 1;
  while (a < z && Math.abs(pcm[a]) < thr) a++;
  while (z > a && Math.abs(pcm[z]) < thr) z--;
  const pad = Math.round(sr * 0.04);
  return pcm.slice(Math.max(0, a - pad), Math.min(pcm.length, z + pad));
}

async function main() {
  const cfg = JSON.parse(await readFile(path.join(ROOT, 'mascot-voice.config.json'), 'utf8'));
  const manifestPath = path.join(OUT, 'manifest.json');
  const old = (await exists(manifestPath)) ? JSON.parse(await readFile(manifestPath, 'utf8')) : { text: {} };
  let names = [...cfg.names, ...(old.names || [])]; // keep people added earlier with --names
  if (arg('--names')) names.push(...arg('--names').split(',').map((s) => s.trim()).filter(Boolean));
  if (arg('--names-file')) {
    const list = JSON.parse(await readFile(arg('--names-file'), 'utf8'));
    names.push(...list.map((x) => (typeof x === 'string' ? x : x.name)).filter(Boolean));
  }
  // the mascot says first names only, so full names collapse to one clip per first name
  names = [...new Map(names.map(firstName).filter(Boolean).map((n) => (n === n.toUpperCase() ? n[0] + n.slice(1).toLowerCase() : n)).map((n) => [slug(n), n])).values()];

  // ---- the lines to render: { file, text }
  const jobs = [];
  cfg.greetings.forEach((t, i) => jobs.push({ file: `greet/${i}`, text: t }));
  jobs.push({ file: 'msg/_generic', text: cfg.messageGeneric });
  for (const n of names) cfg.message.forEach((t, i) => jobs.push({ file: `msg/${slug(n)}-${i}`, text: t.replaceAll('{name}', n) }));
  for (const [k, t] of Object.entries(cfg.notifications)) jobs.push({ file: `notif/${k}`, text: t });

  const ff = hasFfmpeg();
  const ext = ff ? 'mp3' : 'wav';
  const voiceKey = `${cfg.voice}@${cfg.speed}`;
  const todo = jobs.filter((j) => old.text?.[`${j.file}.${ext}`] !== j.text || old.voice !== voiceKey);
  console.log(`${jobs.length} lines, ${todo.length} to render (${ext})`);

  if (todo.length) {
    await mkdir(path.join(MODEL_DIR, 'voices'), { recursive: true });
    await fetchTo(`${HF}/onnx/model_quantized.onnx`, path.join(MODEL_DIR, 'model_q8.onnx'), MODEL_SHA256);
    await fetchTo(`${HF}/voices/${cfg.voice}.bin`, path.join(MODEL_DIR, 'voices', `${cfg.voice}.bin`));
    ort.env.wasm.numThreads = 1;
    const tts = await KokoroLite.create({
      ort, phonemize,
      model: await readFile(path.join(MODEL_DIR, 'model_q8.onnx')),
      voices: { [cfg.voice]: await readFile(path.join(MODEL_DIR, 'voices', `${cfg.voice}.bin`)) },
    });
    for (const j of todo) {
      const t0 = Date.now();
      const { audio, sampleRate } = await tts.generate(j.text, { voice: cfg.voice, speed: cfg.speed });
      const pcm = trim(audio, sampleRate);
      const dest = path.join(OUT, `${j.file}.${ext}`);
      await mkdir(path.dirname(dest), { recursive: true });
      if (ff) {
        const tmp = dest + '.tmp.wav';
        await writeFile(tmp, wav(pcm, sampleRate));
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-ar', '24000', '-codec:a', 'libmp3lame', '-b:a', '40k', dest]);
        await rm(tmp);
      } else await writeFile(dest, wav(pcm, sampleRate));
      console.log(`✓ ${j.file}.${ext}  "${j.text}"  ${(pcm.length / sampleRate).toFixed(2)}s  (${Date.now() - t0} ms)`);
    }
  }

  // ---- manifest the app reads
  const manifest = { voice: voiceKey, ext, names, greet: [], msg: {}, msgGeneric: `msg/_generic.${ext}`, notif: {}, text: {} };
  for (const j of jobs) {
    const f = `${j.file}.${ext}`;
    manifest.text[f] = j.text;
    if (j.file.startsWith('greet/')) manifest.greet.push(f);
    else if (j.file.startsWith('notif/')) manifest.notif[j.file.slice(6)] = f;
    else if (j.file !== 'msg/_generic') { const k = j.file.slice(4).replace(/-\d+$/, ''); (manifest.msg[k] ||= []).push(f); }
  }
  await mkdir(OUT, { recursive: true });
  await writeFile(manifestPath, JSON.stringify(manifest, null, 1));
  console.log('✓ manifest.json →', path.relative(ROOT, manifestPath));
}

main().catch((e) => { console.error(e); process.exit(1); });
