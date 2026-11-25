// kokoro-lite: Kokoro-82M (ONNX, q8) text-to-speech with onnxruntime-web, no Hugging Face downloads.
// Pipeline: normalize text → espeak-ng phonemes (phonemizer) → Kokoro token ids → ONNX → 24 kHz Float32 PCM.
// Works in the browser, in Electron and in Node (onnxruntime-web runs on WASM everywhere).

// Kokoro-82M phoneme vocabulary (from the model's config.json)
const VOCAB = {";":1,":":2,",":3,".":4,"!":5,"?":6,"—":9,"…":10,'"':11,"(":12,")":13,"“":14,"”":15," ":16,"̃":17,"ʣ":18,"ʥ":19,"ʦ":20,"ʨ":21,"ᵝ":22,"ꭧ":23,"A":24,"I":25,"O":31,"Q":33,"S":35,"T":36,"W":39,"Y":41,"ᵊ":42,"a":43,"b":44,"c":45,"d":46,"e":47,"f":48,"h":50,"i":51,"j":52,"k":53,"l":54,"m":55,"n":56,"o":57,"p":58,"q":59,"r":60,"s":61,"t":62,"u":63,"v":64,"w":65,"x":66,"y":67,"z":68,"ɑ":69,"ɐ":70,"ɒ":71,"æ":72,"β":75,"ɔ":76,"ɕ":77,"ç":78,"ɖ":80,"ð":81,"ʤ":82,"ə":83,"ɚ":85,"ɛ":86,"ɜ":87,"ɟ":90,"ɡ":92,"ɥ":99,"ɨ":101,"ɪ":102,"ʝ":103,"ɯ":110,"ɰ":111,"ŋ":112,"ɳ":113,"ɲ":114,"ɴ":115,"ø":116,"ɸ":118,"θ":119,"œ":120,"ɹ":123,"ɾ":125,"ɻ":126,"ʁ":128,"ɽ":129,"ʂ":130,"ʃ":131,"ʈ":132,"ʧ":133,"ʊ":135,"ʋ":136,"ʌ":138,"ɣ":139,"ɤ":140,"χ":142,"ʎ":143,"ʒ":147,"ʔ":148,"ˈ":156,"ˌ":157,"ː":158,"ʰ":162,"ʲ":164,"↓":169,"→":171,"↗":172,"↘":173,"ᵻ":177};

const PUNCT = ';:,.!?¡¿—…"«»“”(){}[]';
const PUNCT_RE = new RegExp(`(\\s*[${PUNCT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]+\\s*)+`, 'g');

function normalize(t) {
  return t
    .replace(/[‘’]/g, "'").replace(/[“”«»]/g, '"')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}️]/gu, '') // emoji
    .replace(/\b(\d{1,2}):([0-5]\d)\b/g, (_, h, m) => (m === '00' ? `${h} o'clock` : `${h} ${m}`))
    .replace(/(?<=\d)-(?=\d)/g, ' to ')
    .replace(/\s+/g, ' ')
    .trim();
}

export class KokoroLite {
  /**
   * @param {object} o
   * @param {object} o.ort         onnxruntime-web module (import * as ort from 'onnxruntime-web')
   * @param {Function} o.phonemize phonemize() from the 'phonemizer' package
   * @param {ArrayBuffer|Uint8Array} o.model  model_q8.onnx bytes
   * @param {Record<string, ArrayBuffer>} o.voices  { am_michael: <bytes of am_michael.bin>, ... }
   */
  static async create({ ort, phonemize, model, voices, executionProviders = ['wasm'] }) {
    const session = await ort.InferenceSession.create(model instanceof ArrayBuffer ? new Uint8Array(model) : model, {
      executionProviders,
      graphOptimizationLevel: 'all',
    });
    const v = {};
    for (const [k, buf] of Object.entries(voices)) v[k] = new Float32Array(buf instanceof ArrayBuffer ? buf : buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    return new KokoroLite(ort, phonemize, session, v);
  }

  constructor(ort, phonemize, session, voices) {
    this.ort = ort; this.phonemize = phonemize; this.session = session; this.voices = voices;
    this.sampleRate = 24000;
  }

  async phonemes(text) {
    const parts = [];
    let last = 0;
    const src = normalize(text);
    for (const m of src.matchAll(PUNCT_RE)) {
      if (last < m.index) parts.push({ p: false, t: src.slice(last, m.index) });
      parts.push({ p: true, t: m[0] });
      last = m.index + m[0].length;
    }
    if (last < src.length) parts.push({ p: false, t: src.slice(last) });
    const out = await Promise.all(parts.map(async ({ p, t }) => (p ? t : (await this.phonemize(t, 'en-us')).join(' '))));
    return out.join('')
      .replace(/ʲ/g, 'j').replace(/r/g, 'ɹ').replace(/x/g, 'k').replace(/ɬ/g, 'l')
      .replace(/(?<=[a-zɹː])(?=hˈʌndɹɪd)/g, ' ')
      .replace(/ z(?=[;:,.!?¡¿—…"«»“” ]|$)/g, 'z')
      .replace(/(?<=nˈaɪn)ti(?!ː)/g, 'di')
      .trim();
  }

  /** @returns {Promise<{audio: Float32Array, sampleRate: number, phonemes: string}>} */
  async generate(text, { voice = 'am_michael', speed = 1 } = {}) {
    const ph = await this.phonemes(text);
    const ids = [0];
    for (const ch of ph) { const id = VOCAB[ch]; if (id !== undefined) ids.push(id); }
    if (ids.length > 511) ids.length = 511;
    ids.push(0);
    const style = this.voices[voice] ?? Object.values(this.voices)[0];
    const off = 256 * Math.min(Math.max(ids.length - 2, 0), 509);
    const { Tensor } = this.ort;
    const feeds = {
      input_ids: new Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
      style: new Tensor('float32', style.slice(off, off + 256), [1, 256]),
      speed: new Tensor('float32', new Float32Array([speed]), [1]),
    };
    const res = await this.session.run(feeds);
    return { audio: res.waveform.data, sampleRate: this.sampleRate, phonemes: ph };
  }
}
