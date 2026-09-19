// speech.ts — předčítání textů přes Web Speech API (window.speechSynthesis).
//
// Žádná knihovna, žádný backend. Cílová platforma je Safari na iOS, kde má
// speechSynthesis několik zrádných míst — proto:
//   • hlasy se načítají ASYNCHRONNĚ (voiceschanged), první getVoices() bývá prázdné
//   • před každým speak() je nutný cancel(), jinak se fronta zasekne
//   • dlouhý text se v některých prohlížečích uprostřed usekne → dělíme na věty
//
// Modul nesmí NIKDY spadnout — každý vstup projde, i když regexy nesednou.

// --- Podpora -----------------------------------------------------------------

export function isSpeechSupported(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof window.SpeechSynthesisUtterance === "function"
    );
  } catch {
    return false;
  }
}

// --- Výběr hlasu -------------------------------------------------------------

let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesWatched = false;

function pickVoice(): void {
  try {
    const voices = window.speechSynthesis.getVoices() ?? [];
    // 1) první hlas s lang začínajícím na "cs" (na iOS např. Zuzana)
    cachedVoice =
      voices.find((v) => (v.lang ?? "").toLowerCase().startsWith("cs")) ?? null;
  } catch {
    cachedVoice = null;
  }
}

// Zaregistruje listener na voiceschanged (jen jednou) a zkusí hlas načíst.
// Volej klidně opakovaně — je idempotentní.
export function ensureVoicesLoaded(): void {
  if (!isSpeechSupported()) return;
  if (!voicesWatched) {
    voicesWatched = true;
    try {
      window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
    } catch {
      /* starší prohlížeč bez addEventListener na synth */
      try {
        window.speechSynthesis.onvoiceschanged = pickVoice;
      } catch {
        /* vzdáváme to, zůstane fallback přes utterance.lang */
      }
    }
  }
  if (!cachedVoice) pickVoice();
}

// 2) Když český hlas není, vracíme null — volající nastaví jen lang = "cs-CZ"
//    a systém vybere sám (může znít s cizím přízvukem, ale funguje).
export function getCzechVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;
  ensureVoicesLoaded();
  return cachedVoice;
}

// --- Notace → mluvená čeština ------------------------------------------------

const PIECE_WORDS: Record<string, string> = {
  J: "jezdec",
  S: "střelec",
  V: "věž",
  D: "dáma",
  K: "král",
};

const PROMOTION_WORDS: Record<string, string> = {
  J: " proměna v jezdce",
  D: " proměna v dámu",
  S: " proměna ve střelce",
  V: " proměna ve věž",
};

/**
 * Převede šachovou notaci uvnitř textu na mluvenou češtinu, aby předčítání
 * dávalo smysl („Jf3" → „jezdec f3", ne „J ef tři").
 *
 * Když cokoli selže, vrací původní text beze změny.
 */
export function notationToSpeech(text: string): string {
  if (typeof text !== "string" || text.length === 0) return text ?? "";
  try {
    let out = text;

    // 1) Rošáda — dřív než cokoli jiného, kvůli pomlčkám. (Tolerujeme i nuly.)
    out = out.replace(/\b[O0]-[O0]-[O0]\b/g, "velká rošáda");
    out = out.replace(/\b[O0]-[O0]\b/g, "malá rošáda");

    // 2) Proměna pěšce: e8=D → e8 proměna v dámu
    out = out.replace(/=([JDSV])/g, (m, p: string) => PROMOTION_WORDS[p] ?? m);

    // 3) Tah figurou: Jf3 → jezdec f3, Sxe6 → střelec bere e6.
    //    Rozlišení (Jbd2, V1d2, Jgxe5) se čte „jezdec b d2", „věž 1 d2",
    //    „jezdec g bere e5" — tak, jak se to říká nahlas.
    out = out.replace(
      /\b([JSVDK])([a-h]?[1-8]?)(x?)([a-h][1-8])\b/g,
      (m, p: string, dis: string, take: string, sq: string) => {
        const word = PIECE_WORDS[p];
        if (!word) return m;
        const head = dis ? `${word} ${dis}` : word;
        return take ? `${head} bere ${sq}` : `${head} ${sq}`;
      },
    );

    // 4) Braní pěšcem: fxe6 → pěšec f bere e6
    out = out.replace(
      /\b([a-h])x([a-h][1-8])\b/g,
      (_m, file: string, sq: string) => `pěšec ${file} bere ${sq}`,
    );

    // 5) Šach a mat — jen tam, kde následují po tahu (poli / rošádě / proměně),
    //    ne po běžném textu.
    out = out.replace(
      /([a-h][1-8]|rošáda|dámu|věž|jezdce|střelce)([+#])/g,
      (_m, tail: string, mark: string) =>
        `${tail}${mark === "+" ? " šach" : " mat"}`,
    );

    // 6) Čísla tahů („1." / „12...") odstraň — pozice je vidět a předčítání
    //    čísel ruší. Maže se jen před rozpoznaným tahem, aby letopočty
    //    a řadové číslovky v běžném textu zůstaly („v 16. století").
    out = out.replace(
      /\b\d{1,3}\s*\.{1,3}\s*(?=(?:jezdec|střelec|věž|dáma|král|pěšec|malá rošáda|velká rošáda|[a-h][1-8]\b))/g,
      "",
    );

    return out;
  } catch {
    return text;
  }
}

// --- Dělení na věty ----------------------------------------------------------

// Zkratky, po kterých tečka NEKONČÍ větu.
const ABBREVIATIONS = new Set([
  "např",
  "tj",
  "tzv",
  "atd",
  "apod",
  "st",
  "stol",
  "č",
  "r",
  "mj",
  "resp",
  "cca",
  "kol",
  "tzn",
  "sv",
]);

// Pojistka pro věty bez interpunkce — delší úsek ještě rozsekáme po mezerách.
const MAX_CHUNK = 220;

function endsWithAbbreviation(chunk: string): boolean {
  const m = /([\wÀ-ž]+)\.$/.exec(chunk.trim());
  if (!m) return false;
  const word = m[1];
  if (/^\d+$/.test(word)) return true; // řadová číslovka: „16. století"
  return ABBREVIATIONS.has(word.toLowerCase());
}

function hardWrap(sentence: string): string[] {
  if (sentence.length <= MAX_CHUNK) return [sentence];
  const words = sentence.split(/\s+/);
  const out: string[] = [];
  let buf = "";
  for (const w of words) {
    if (buf && buf.length + w.length + 1 > MAX_CHUNK) {
      out.push(buf);
      buf = w;
    } else {
      buf = buf ? `${buf} ${w}` : w;
    }
  }
  if (buf) out.push(buf);
  return out;
}

/**
 * Rozdělí text na věty. Bez lookbehind regexů — starší iOS Safari je neumí.
 */
export function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  try {
    let start = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch !== "." && ch !== "!" && ch !== "?") continue;

      // Spolkni navazující interpunkci a uvozovky („…?" apod.)
      let j = i + 1;
      while (j < text.length && /[.!?"”“„»]/.test(text[j])) j++;
      // Konec věty je jen tam, kde následuje mezera nebo konec textu.
      if (j < text.length && !/\s/.test(text[j])) continue;

      const chunk = text.slice(start, j);
      if (ch === "." && endsWithAbbreviation(chunk)) continue;

      const trimmed = chunk.trim();
      if (trimmed) sentences.push(...hardWrap(trimmed));
      start = j;
      i = j - 1;
    }
    const rest = text.slice(start).trim();
    if (rest) sentences.push(...hardWrap(rest));
  } catch {
    /* při jakémkoli problému raději jeden celý kus */
  }
  if (sentences.length === 0) {
    const whole = text.trim();
    return whole ? [whole] : [];
  }
  return sentences;
}

// --- Přehrávání --------------------------------------------------------------

export interface SpeakOptions {
  onEnd?: () => void;
  onError?: () => void;
}

// Každé spuštění dostane token; po cancel() se token zvýší a opožděné
// callbacky zrušených utterance se zahodí (Safari je posílá i po cancel()).
let speakToken = 0;

export function stopSpeaking(): void {
  if (!isSpeechSupported()) return;
  speakToken++;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignoruj */
  }
}

export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!isSpeechSupported()) return;
  if (typeof text !== "string" || text.trim().length === 0) {
    opts.onEnd?.();
    return;
  }

  // c) VŽDY nejdřív cancel — jinak se fronta ve Safari zasekne.
  stopSpeaking();
  const token = speakToken;

  try {
    ensureVoicesLoaded();
    const voice = cachedVoice;
    const chunks = splitSentences(notationToSpeech(text));
    if (chunks.length === 0) {
      opts.onEnd?.();
      return;
    }

    chunks.forEach((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk);
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? "cs-CZ";
      u.rate = 0.95;
      u.pitch = 1;
      u.volume = 1;
      if (i === chunks.length - 1) {
        u.onend = () => {
          if (token === speakToken) opts.onEnd?.();
        };
      }
      u.onerror = () => {
        if (token !== speakToken) return;
        (opts.onError ?? opts.onEnd)?.();
      };
      window.speechSynthesis.speak(u);
    });
  } catch {
    opts.onError?.();
    opts.onEnd?.();
  }
}
