"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import QRCode from "qrcode";

type InputMode = "write" | "photo" | "draw" | "sounddraw" | "voice" | "reference";
type AiPath = "none" | "together" | "translate";
type AiForm = "image" | "text" | "motion";
type SharingChoice = "take" | "online" | "here" | "future";
type SonificationMode = "tone" | "score";
type SonificationStyle = "quiet" | "warm" | "clear";
type SonificationInstrument = "string_ensemble_1" | "acoustic_grand_piano" | "acoustic_guitar_nylon" | "flute" | "synth";
type DrawingThickness = "fine" | "regular" | "broad";
type SoundfontPlayer = { play: (note: string, when?: number, options?: { duration?: number; attack?: number; release?: number; gain?: number }) => unknown };
type SoundfontLibrary = { instrument: (context: BaseAudioContext, instrument: string) => Promise<SoundfontPlayer> };

declare global {
  interface Window { Soundfont?: SoundfontLibrary; webkitAudioContext?: typeof AudioContext; }
}

let soundfontScript: Promise<SoundfontLibrary> | null = null;
const loadSoundfont = () => {
  if (window.Soundfont) return Promise.resolve(window.Soundfont);
  if (soundfontScript) return soundfontScript;
  soundfontScript = new Promise<SoundfontLibrary>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/soundfont-player@0.12.0/dist/soundfont-player.min.js";
    script.async = true;
    script.onload = () => window.Soundfont ? resolve(window.Soundfont) : reject(new Error("De instrumentklanken konden niet worden geladen."));
    script.onerror = () => reject(new Error("De instrumentklanken konden niet worden geladen."));
    document.head.appendChild(script);
  });
  return soundfontScript;
};

const inputs: Array<{ id: InputMode; title: string; text: string; symbol: string }> = [
  { id: "write", title: "Schrijven", text: "Een woord, herinnering, verhaal of iets dat nog helemaal geen vorm heeft.", symbol: "Aa" },
  { id: "photo", title: "Foto toevoegen", text: "Een beeld uit je eigen galerij, of iets wat je fysiek hier hebt gemaakt.", symbol: "camera" },
  { id: "draw", title: "Tekenen", text: "Een spoor, schets of vorm die je hier maakt.", symbol: "〰" },
  { id: "sounddraw", title: "Geluid maken", text: "Teken een klank, zonder een instrument te hoeven spelen.", symbol: "⌁" },
  { id: "voice", title: "Geluidsopname", text: "Een stem, klank, geluid of iets wat jij wil vertellen.", symbol: "microphone" },
  { id: "reference", title: "Aanwijzen", text: "Een liedje, tekst, gezegde of plek die al bestaat.", symbol: "↗" },
];

const aiForms: Array<{ id: AiForm; title: string; text: string }> = [
  { id: "image", title: "Beeld", text: "AI maakt een beeld vanuit wat jij hebt ingebracht." },
  { id: "text", title: "Woorden", text: "Orden je eigen woorden, zonder nieuwe inhoud toe te voegen." },
  { id: "motion", title: "Beweging", text: "Alleen zichtbaar wanneer iemand het rouwdier opent." },
];

const drawingColours = ["#2e2b26", "#b5533c", "#c98270", "#486f92", "#6f9bb2", "#667f55", "#91a07b", "#b17b46", "#c5a26d", "#81556f", "#af7f98"];
const drawingThicknesses: Array<{ id: DrawingThickness; title: string; width: number }> = [
  { id: "fine", title: "fijn", width: 2 },
  { id: "regular", title: "gewoon", width: 4 },
  { id: "broad", title: "breed", width: 8 },
];
const sonificationStyles: Array<{ id: SonificationStyle; title: string; text: string; waveform: OscillatorType; baseMidi: number; scale: number[] }> = [
  { id: "quiet", title: "laag en rustig", text: "een zachte, lage klank", waveform: "sine", baseMidi: 45, scale: [0, 3, 5, 7, 10] },
  { id: "warm", title: "warm en rond", text: "iets voller, zonder scherp te worden", waveform: "triangle", baseMidi: 48, scale: [0, 2, 5, 7, 9] },
  { id: "clear", title: "licht en helder", text: "iets hoger, maar nog steeds zacht", waveform: "sine", baseMidi: 51, scale: [0, 2, 4, 7, 9] },
];
const sonificationInstruments: Array<{ id: SonificationInstrument; title: string; text: string }> = [
  { id: "string_ensemble_1", title: "strijkers", text: "lang en gedragen" },
  { id: "acoustic_grand_piano", title: "piano", text: "helder en korter" },
  { id: "acoustic_guitar_nylon", title: "gitaar", text: "zacht en dichtbij" },
  { id: "flute", title: "fluit", text: "luchtig en licht" },
  { id: "synth", title: "eenvoudige toon", text: "zonder instrumentklank" },
];
function firstUsefulLine(value: string) {
  return value.split("\n").map((line) => line.trim()).find(Boolean) ?? "";
}

export default function MaakEenRouwdier() {
  const [landscape, setLandscape] = useState({ id: "test", name: "Testlandschap" });
  useEffect(() => { void fetch("/api/landscapes/active", { cache: "no-store" }).then((response) => response.json()).then((data: { landscape?: { id?: string; name?: string } }) => { if (data.landscape?.id && data.landscape.name) setLandscape({ id: data.landscape.id, name: data.landscape.name }); }).catch(() => undefined); }, []);
  const [step, setStep] = useState(1);
  const [modes, setModes] = useState<InputMode[]>([]);
  const [words, setWords] = useState("");
  const [careReflection, setCareReflection] = useState("");
  const [reference, setReference] = useState("");
  const [referenceLink, setReferenceLink] = useState("");
  const [includeReferenceQr, setIncludeReferenceQr] = useState(false);
  const [photos, setPhotos] = useState<Array<{ name: string; url: string; dataUrl: string }>>([]);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioDataUrl, setAudioDataUrl] = useState("");
  const [useTranscript, setUseTranscript] = useState(false);
  const [audioTranscript, setAudioTranscript] = useState("");
  const [hasAiConsent, setHasAiConsent] = useState(false);
  const [drawingDataUrl, setDrawingDataUrl] = useState("");
  const [drawingColour, setDrawingColour] = useState(drawingColours[0]);
  const [drawingThickness, setDrawingThickness] = useState<DrawingThickness>("regular");
  const [liveSoundReady, setLiveSoundReady] = useState(false);
  const [isPreparingLiveSound, setIsPreparingLiveSound] = useState(false);
  const [liveDrawingSound, setLiveDrawingSound] = useState(false);
  const [sonificationMode, setSonificationMode] = useState<SonificationMode>("tone");
  const [sonificationStyle, setSonificationStyle] = useState<SonificationStyle>("quiet");
  const [sonificationInstrumentsSelected, setSonificationInstrumentsSelected] = useState<SonificationInstrument[]>(["string_ensemble_1"]);
  const [sonificationUrl, setSonificationUrl] = useState("");
  const [keepSoundDrawing, setKeepSoundDrawing] = useState(false);
  const [soundDrawingEventCount, setSoundDrawingEventCount] = useState(0);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiImageDataUrl, setAiImageDataUrl] = useState("");
  const [aiTextResult, setAiTextResult] = useState("");
  const [aiMotion, setAiMotion] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [title, setTitle] = useState("");
  const [cardDescription, setCardDescription] = useState("");
  const [aiPath, setAiPath] = useState<AiPath>("none");
  const [aiFormsSelected, setAiFormsSelected] = useState<AiForm[]>([]);
  const [feedbackDirection, setFeedbackDirection] = useState<"keep" | "adjust" | "again" | "without" | null>(null);
  const [feedback, setFeedback] = useState("");
  const [sharing, setSharing] = useState<SharingChoice>("take");
  const [isPubliclyConfirmed, setIsPubliclyConfirmed] = useState(false);
  const [showConsentDetails, setShowConsentDetails] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [microphoneError, setMicrophoneError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedContributionId, setSavedContributionId] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioFileRef = useRef<File | null>(null);
  const sonificationFileRef = useRef<File | null>(null);
  const liveAudioContextRef = useRef<AudioContext | null>(null);
  const activationAudioRef = useRef<HTMLAudioElement>(null);
  const liveInstrumentsRef = useRef<Map<string, SoundfontPlayer>>(new Map());
  const lastLiveSoundAt = useRef(0);
  const liveAudioUnlocked = useRef(false);
  const soundDrawingEvents = useRef<Array<{ note: string; time: number; duration: number; release: number; gain: number }>>([]);
  const soundDrawingStartedAt = useRef<number | null>(null);

  const titleSuggestion = firstUsefulLine(reference) || (modes.includes("write") ? firstUsefulLine(words).slice(0, 70) : "");
  const descriptionSuggestion = words || careReflection;
  const visibleTitle = title.trim() || titleSuggestion || "een rouwdier";
  const visibleDescription = cardDescription.trim();
  const hasAi = aiPath !== "none";
  const hasShareableContent = Boolean(aiImageDataUrl || words.trim() || careReflection.trim() || reference.trim() || referenceLink.trim() || photos.length || drawingDataUrl || audioUrl || sonificationUrl || title.trim() || cardDescription.trim());
  const hasImageForm = aiFormsSelected.includes("image");
  const hasMotionForm = aiFormsSelected.includes("motion");
  const hasTextInput = Boolean(words.trim() || careReflection.trim() || reference.trim());
  const hasVisualInput = Boolean(photos.length || (modes.includes("draw") && drawingDataUrl));
  const availableAiForms = (aiPath === "translate" ? aiForms.filter((form) => form.id === "image") : aiForms.filter((form) => (form.id === "image" && hasVisualInput) || (form.id === "text" && hasTextInput) || (form.id === "motion" && hasVisualInput))).map((form) => form.id !== "image" ? form : aiPath === "translate" ? { ...form, title: "Maak een nieuw beeld", text: "AI werkt jouw bijdrage uit tot een nieuw beeld." } : { ...form, title: "Voeg iets toe aan mijn beeld", text: "Je tekening of foto blijft aanwezig. AI kan er bijvoorbeeld een achtergrond aan toevoegen." });
  const aiImageHeading = aiPath === "translate" ? "Welk nieuw beeld mag AI maken?" : "Wat mag AI aan jouw beeld toevoegen?";
  const aiImagePromptLabel = aiPath === "translate" ? "wat wil je dat AI verbeeldt?" : "wat wil je veranderen of toevoegen?";
  const savedAudioUrl = sonificationUrl || audioUrl;
  const selectedSonificationStyle = sonificationStyles.find((style) => style.id === sonificationStyle) || sonificationStyles[0];
  const motionPreviewImage = aiImageDataUrl || photos[0]?.dataUrl || drawingDataUrl;
  const motionPreviewWords = words.trim() || reference.trim() || "jouw bijdrage";
  useEffect(() => {
    if (step === 21 && aiFormsSelected.length && !hasImageForm) setStep(hasMotionForm ? 23 : aiFormsSelected.includes("text") ? 22 : 3);
  }, [aiFormsSelected, hasImageForm, hasMotionForm, step]);
  const consentDetails = sharing === "online"
    ? { title: "Online landschap", text: "Je rouwdier reist anoniem mee met de online collectie. Het kan hier online worden bekeken en is alleen gekoppeld aan de plek waar het is ontstaan." }
    : sharing === "here"
      ? { title: "Deze opstelling", text: "Je rouwdier kan, naast online, bij deze opstelling worden getoond. Als de opstelling naar een andere plek reist, wordt het daar niet opnieuw tentoongesteld." }
      : { title: "Andere plekken", text: "Je rouwdier reist anoniem mee met de collectie, ook naar plekken die nu nog niet bekend zijn. Niet alle rouwdieren worden daar getoond." };

  const toggleMode = (mode: InputMode) => setModes((current) => {
    if (current.includes(mode)) return current.filter((item) => item !== mode);
    if (mode === "draw" || mode === "sounddraw") return [...current.filter((item) => item !== "draw" && item !== "sounddraw"), mode];
    return [...current, mode];
  });
  const toggleAiForm = (form: AiForm) => setAiFormsSelected((current) => current.includes(form) ? [] : [form]);
  const toggleSonificationInstrument = (instrument: SonificationInstrument) => setSonificationInstrumentsSelected((current) => {
    if (instrument === "synth") return current.includes("synth") ? [] : ["synth"];
    const withoutSynth = current.filter((item) => item !== "synth");
    if (withoutSynth.includes(instrument)) return withoutSynth.filter((item) => item !== instrument);
    return [...withoutSynth, instrument].slice(-2);
  });

  const midiToFrequency = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
  const midiToNoteName = (midi: number) => `${["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][midi % 12]}${Math.floor(midi / 12) - 1}`;
  const midiForHeight = (y: number, height: number, baseMidi: number, scale: number[]) => {
    const position = Math.max(0, Math.min(1, (height - y) / height));
    const expandedScale = [...scale, ...scale.map((interval) => interval + 12), scale[0] + 24];
    const degree = Math.round(position * (expandedScale.length - 1));
    return baseMidi + expandedScale[degree];
  };
  const selectedThickness = drawingThicknesses.find((thickness) => thickness.id === drawingThickness) || drawingThicknesses[1];
  const soundCharacterForThickness = () => {
    if (drawingThickness === "fine") return { gain: .76, duration: .72, release: .7 };
    if (drawingThickness === "broad") return { gain: 1.15, duration: 1.12, release: 1.15 };
    return { gain: 1, duration: .9, release: .9 };
  };
  const frequencyForHeight = (y: number, height = 720) => {
    return midiToFrequency(midiForHeight(y, height, selectedSonificationStyle.baseMidi, selectedSonificationStyle.scale));
  };
  const unlockLiveAudio = () => {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) return null;
    const audioContext = liveAudioContextRef.current || new AudioContextConstructor();
    liveAudioContextRef.current = audioContext;
    if (liveAudioUnlocked.current) { void audioContext.resume(); return audioContext; }
    // iOS Safari only unlocks Web Audio when a source starts inside a direct touch event.
    const source = audioContext.createBufferSource();
    source.buffer = audioContext.createBuffer(1, 1, 22050);
    source.connect(audioContext.destination);
    source.start(0);
    liveAudioUnlocked.current = true;
    void audioContext.resume();
    return audioContext;
  };
  const prepareLiveInstruments = async (names = sonificationInstrumentsSelected.filter((instrument) => instrument !== "synth")) => {
    if (!names.length) return;
    const audioContext = unlockLiveAudio();
    if (!audioContext) throw new Error("De klank kon niet worden gestart.");
    await audioContext.resume();
    const soundfont = await loadSoundfont();
    await Promise.all(names.map(async (name) => {
      const loaded = liveInstrumentsRef.current.get(name) || await soundfont.instrument(audioContext, name);
      liveInstrumentsRef.current.set(name, loaded);
    }));
  };
  const activateLiveSound = () => {
    const activationAudio = activationAudioRef.current;
    if (!activationAudio) return;
    setIsPreparingLiveSound(true);
    activationAudio.currentTime = 0;
    void activationAudio.play().then(() => {
      unlockLiveAudio();
      return prepareLiveInstruments();
    }).then(() => setLiveSoundReady(true)).catch(() => setLiveSoundReady(false)).finally(() => setIsPreparingLiveSound(false));
  };
  const playLiveDrawingSound = (point: { x: number; y: number }) => {
    if ((!liveDrawingSound && !modes.includes("sounddraw")) || Date.now() - lastLiveSoundAt.current < 320) return;
    if (modes.includes("sounddraw") && !liveSoundReady) return;
    lastLiveSoundAt.current = Date.now();
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) return;
    const audioContext = liveAudioContextRef.current || new AudioContextConstructor();
    liveAudioContextRef.current = audioContext;
    const instrumentNames = sonificationInstrumentsSelected.filter((instrument) => instrument !== "synth");
    if (!instrumentNames.length) return;
    const liveBaseMidi = sonificationStyle === "quiet" ? 43 : sonificationStyle === "clear" ? 53 : 48;
    const liveGain = sonificationStyle === "quiet" ? .19 : sonificationStyle === "clear" ? .24 : .28;
    const scale = [0, 3, 5, 7, 10];
    const note = midiToNoteName(midiForHeight(point.y, 720, liveBaseMidi, scale));
    const thicknessCharacter = soundCharacterForThickness();
    const duration = (sonificationStyle === "quiet" ? .9 : .72) * thicknessCharacter.duration;
    const release = (sonificationStyle === "quiet" ? .5 : .36) * thicknessCharacter.release;
    const gain = liveGain * thicknessCharacter.gain;
    const recordSound = () => {
      if (modes.includes("sounddraw") && soundDrawingStartedAt.current !== null) {
        soundDrawingEvents.current.push({ note, time: (performance.now() - soundDrawingStartedAt.current) / 1000, duration, release, gain });
        setSoundDrawingEventCount(soundDrawingEvents.current.length);
      }
    };
    const play = (instruments: SoundfontPlayer[], shouldRecord = true) => {
      instruments.forEach((instrument) => instrument.play(note, audioContext.currentTime, { duration, attack: .18, release, gain: gain / instruments.length }));
      if (shouldRecord) recordSound();
    };
    const startPlayback = () => {
      const cached = instrumentNames.map((name) => liveInstrumentsRef.current.get(name)).filter((instrument): instrument is SoundfontPlayer => Boolean(instrument));
      if (cached.length === instrumentNames.length) { play(cached); return; }
      void prepareLiveInstruments(instrumentNames);
    };
    if (audioContext.state === "running") startPlayback();
    else void audioContext.resume().then(startPlayback).catch(() => undefined);
  };
  useEffect(() => {
    if (liveSoundReady) void prepareLiveInstruments();
  }, [liveSoundReady, sonificationInstrumentsSelected]);
  const drawAt = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const rect = canvas.getBoundingClientRect();
    const point = { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
    context.strokeStyle = drawingColour;
    context.lineWidth = selectedThickness.width;
    context.lineCap = "round";
    context.lineJoin = "round";
    if (lastPoint.current) {
      context.beginPath();
      context.moveTo(lastPoint.current.x, lastPoint.current.y);
      context.lineTo(point.x, point.y);
      context.stroke();
    }
    lastPoint.current = point;
    playLiveDrawingSound(point);
  };
  const beginDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => { if (modes.includes("sounddraw") && soundDrawingStartedAt.current === null) soundDrawingStartedAt.current = performance.now(); drawing.current = true; event.currentTarget.setPointerCapture(event.pointerId); drawAt(event); };
  const continueDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => { if (drawing.current) drawAt(event); };
  const endDrawing = () => { drawing.current = false; lastPoint.current = null; if (canvasRef.current && (!modes.includes("sounddraw") || keepSoundDrawing)) setDrawingDataUrl(canvasRef.current.toDataURL("image/png")); };
  const clearDrawing = () => { const canvas = canvasRef.current; const context = canvas?.getContext("2d"); if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height); soundDrawingEvents.current = []; soundDrawingStartedAt.current = null; setSoundDrawingEventCount(0); setDrawingDataUrl(""); setSonificationUrl(""); sonificationFileRef.current = null; };
  const addPhotos = async (files?: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    const prepared = await Promise.all(selectedFiles.map((file) => new Promise<{ name: string; url: string; dataUrl: string }>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, url: URL.createObjectURL(file), dataUrl: String(reader.result) });
      reader.readAsDataURL(file);
    })));
    if (prepared.length) setPhotos((current) => [...current, ...prepared]);
  };
  const removePhoto = (url: string) => setPhotos((current) => current.filter((photo) => photo.url !== url));

  const audioBufferToWav = (buffer: AudioBuffer) => {
    const bytes = buffer.length * buffer.numberOfChannels * 2;
    const view = new DataView(new ArrayBuffer(44 + bytes));
    const write = (offset: number, value: string) => [...value].forEach((letter, index) => view.setUint8(offset + index, letter.charCodeAt(0)));
    write(0, "RIFF"); view.setUint32(4, 36 + bytes, true); write(8, "WAVE"); write(12, "fmt ");
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, buffer.numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true);
    view.setUint16(32, buffer.numberOfChannels * 2, true); view.setUint16(34, 16, true); write(36, "data"); view.setUint32(40, bytes, true);
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
    let offset = 44;
    for (let sample = 0; sample < buffer.length; sample += 1) for (const channel of channels) { view.setInt16(offset, Math.max(-1, Math.min(1, channel[sample])) * 0x7fff, true); offset += 2; }
    return new Blob([view], { type: "audio/wav" });
  };
  const saveSonification = async (buffer: AudioBuffer) => {
    const blob = audioBufferToWav(buffer);
    const file = new File([blob], "klank-van-de-tekening.wav", { type: "audio/wav" });
    sonificationFileRef.current = file;
    setSonificationUrl(URL.createObjectURL(blob));
  };
  const drawingCanvasForSound = async () => {
    if (canvasRef.current) return canvasRef.current;
    if (!drawingDataUrl) return null;
    const image = await new Promise<HTMLImageElement>((resolve, reject) => { const value = new Image(); value.onload = () => resolve(value); value.onerror = reject; value.src = drawingDataUrl; });
    const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
    canvas.getContext("2d")?.drawImage(image, 0, 0);
    return canvas;
  };
  const createInstrumentSonification = async () => {
    const canvas = await drawingCanvasForSound();
    if (!canvas || !drawingDataUrl || !window.OfflineAudioContext) throw new Error("Er is geen tekening om te beluisteren.");
    const pixels = canvas.getContext("2d", { willReadFrequently: true })?.getImageData(0, 0, canvas.width, canvas.height);
    if (!pixels) throw new Error("De tekening kon niet worden gelezen.");
    const seconds = sonificationMode === "score" ? 8 : 2.5;
    const sampleRate = 44100;
    const offline = new OfflineAudioContext(1, Math.ceil(sampleRate * seconds), sampleRate);
    const soundfont = await loadSoundfont();
    const instruments = await Promise.all(sonificationInstrumentsSelected.filter((instrument) => instrument !== "synth").map((instrument) => soundfont.instrument(offline, instrument)));
    if (!instruments.length) throw new Error("Er is geen instrumentklank gekozen.");
    const character = sonificationStyle === "quiet"
      ? { baseMidi: 43, gain: .48, duration: 1.25, release: 1.05 }
      : sonificationStyle === "clear"
        ? { baseMidi: 53, gain: .55, duration: .78, release: .56 }
        : { baseMidi: 48, gain: .62, duration: 1, release: .8 };
    const { data } = pixels;
    const { width, height } = canvas;
    const darknessAt = (x: number, y: number) => {
      const index = (Math.min(height - 1, y) * width + Math.min(width - 1, x)) * 4;
      if (data[index + 3] < 10) return 0;
      return 255 - (data[index] + data[index + 1] + data[index + 2]) / 3;
    };
    if (sonificationMode === "tone") {
      let total = 0;
      let yTotal = 0;
      for (let y = 0; y < height; y += 6) for (let x = 0; x < width; x += 6) {
        const darkness = darknessAt(x, y);
        if (darkness > 24) { total += darkness; yTotal += y * darkness; }
      }
      if (!total) throw new Error("Er is nog niets om te beluisteren.");
      const relativeHeight = 1 - yTotal / total / height;
      const scale = [0, 3, 5, 7, 10];
      const degree = Math.max(0, Math.min(scale.length - 1, Math.round(relativeHeight * (scale.length - 1))));
      instruments.forEach((instrument) => instrument.play(midiToNoteName(character.baseMidi + scale[degree]), 0.03, { duration: seconds - .08, attack: .25, release: character.release, gain: character.gain / instruments.length }));
    } else {
      const scale = [0, 3, 5, 7, 10];
      const bands = 6;
      const columns = 48;
      const step = seconds / columns;
      const bandHeight = height / bands;
      for (let band = 0; band < bands; band += 1) {
        const midi = character.baseMidi + scale[(bands - 1 - band) % scale.length] + (band === 0 ? 12 : 0);
        let lastPlayedColumn = -99;
        for (let column = 0; column < columns; column += 1) {
          const xStart = Math.floor(column * width / columns);
          const xEnd = Math.max(xStart + 1, Math.floor((column + 1) * width / columns));
          const yStart = Math.floor(band * bandHeight);
          const yEnd = Math.max(yStart + 1, Math.floor((band + 1) * bandHeight));
          let total = 0;
          let samples = 0;
          for (let x = xStart; x < xEnd; x += 3) for (let y = yStart; y < yEnd; y += 3) { total += darknessAt(x, y); samples += 1; }
          const darkness = samples ? total / samples : 0;
          if (darkness < 18 || column - lastPlayedColumn < 3) continue;
          lastPlayedColumn = column;
          instruments.forEach((instrument) => instrument.play(midiToNoteName(midi), column * step + .03, { duration: step * 3.25 * character.duration, attack: .14, release: step * 1.5 * character.release, gain: Math.min(character.gain, darkness / 255 * character.gain * 1.85) / instruments.length }));
        }
      }
    }
    await saveSonification(await offline.startRendering());
  };
  const createSoundDrawingRecording = async () => {
    if (!soundDrawingEvents.current.length || !window.OfflineAudioContext) throw new Error("Er is nog geen geluid getekend.");
    const lastEvent = soundDrawingEvents.current.at(-1)!;
    const seconds = Math.max(2, lastEvent.time + lastEvent.duration + lastEvent.release + .25);
    const offline = new OfflineAudioContext(1, Math.ceil(44100 * seconds), 44100);
    const soundfont = await loadSoundfont();
    const instruments = await Promise.all(sonificationInstrumentsSelected.filter((instrument) => instrument !== "synth").map((instrument) => soundfont.instrument(offline, instrument)));
    if (!instruments.length) throw new Error("Er is geen instrumentklank gekozen.");
    for (const event of soundDrawingEvents.current) instruments.forEach((instrument) => instrument.play(event.note, event.time + .03, { duration: event.duration, attack: .1, release: event.release, gain: event.gain / instruments.length }));
    await saveSonification(await offline.startRendering());
  };
  const createSonification = async () => {
    if (modes.includes("sounddraw")) { await createSoundDrawingRecording(); return; }
    if (sonificationInstrumentsSelected.some((instrument) => instrument !== "synth")) {
      try {
        await createInstrumentSonification();
        return;
      } catch {
        // The drawing can still become a local tone when an instrument file cannot load.
      }
    }
    await createSynthSonification();
  };
  const createSynthSonification = async () => {
    const canvas = await drawingCanvasForSound();
    if (!canvas || !drawingDataUrl || !window.OfflineAudioContext) return;
    const pixels = canvas.getContext("2d", { willReadFrequently: true })?.getImageData(0, 0, canvas.width, canvas.height);
    if (!pixels) return;
    const seconds = sonificationMode === "score" ? 8 : 1.8;
    const sampleRate = 22050;
    const offline = new OfflineAudioContext(1, Math.ceil(sampleRate * seconds), sampleRate);
    const addTone = (start: number, duration: number, frequency: number, volume: number, waveform: OscillatorType) => {
      const oscillator = offline.createOscillator();
      const gain = offline.createGain();
      oscillator.type = waveform;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(volume, start + Math.min(.07, duration / 3));
      gain.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(.12, duration * .98));
      oscillator.connect(gain).connect(offline.destination);
      oscillator.start(start);
      oscillator.stop(start + duration);
    };
    const { data } = pixels;
    const { width, height } = canvas;
    if (sonificationMode === "tone") {
      let total = 0, yTotal = 0;
      for (let y = 0; y < height; y += 8) for (let x = 0; x < width; x += 8) {
        const index = (y * width + x) * 4;
        const darkness = 255 - (data[index] + data[index + 1] + data[index + 2]) / 3;
        if (data[index + 3] > 10 && darkness > 24) { total += darkness; yTotal += y * darkness; }
      }
      if (!total) return;
      const y = yTotal / total;
      addTone(0, seconds, frequencyForHeight(y, height), .095, selectedSonificationStyle.waveform);
    } else {
      const columns = 72, step = seconds / columns;
      const oscillator = offline.createOscillator();
      const gain = offline.createGain();
      oscillator.type = selectedSonificationStyle.waveform;
      let previousFrequency = frequencyForHeight(height * .52, height);
      oscillator.frequency.setValueAtTime(previousFrequency, 0);
      gain.gain.setValueAtTime(.0001, 0);
      gain.gain.linearRampToValueAtTime(.055, .22);
      for (let column = 0; column < columns; column += 1) {
        const xStart = Math.floor((column / columns) * width);
        const xEnd = Math.min(width, Math.ceil(((column + 1) / columns) * width));
        let total = 0, yTotal = 0;
        for (let x = xStart; x < xEnd; x += 2) for (let y = 0; y < height; y += 4) {
          const index = (y * width + x) * 4;
          const darkness = 255 - (data[index] + data[index + 1] + data[index + 2]) / 3;
          if (data[index + 3] > 10 && darkness > 24) { total += darkness; yTotal += y * darkness; }
        }
        if (total) previousFrequency = frequencyForHeight(yTotal / total, height);
        oscillator.frequency.linearRampToValueAtTime(previousFrequency, Math.min(seconds - .03, (column + 1) * step));
      }
      gain.gain.exponentialRampToValueAtTime(.0001, seconds);
      oscillator.connect(gain).connect(offline.destination);
      oscillator.start(0);
      oscillator.stop(seconds);
    }
    await saveSonification(await offline.startRendering());
  };

  const startRecording = async () => {
    setMicrophoneError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunks.current = [];
      recorder.ondataavailable = (event) => audioChunks.current.push(event.data);
      recorder.onstop = () => {
        const recording = new Blob(audioChunks.current, { type: recorder.mimeType || "audio/webm" });
        audioFileRef.current = new File([recording], `geluidsopname.${recording.type.includes("mp4") ? "mp4" : "webm"}`, { type: recording.type });
        setAudioTranscript("");
        setAudioUrl(URL.createObjectURL(recording));
        const reader = new FileReader();
        reader.onload = () => setAudioDataUrl(String(reader.result));
        reader.readAsDataURL(recording);
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
      };
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch { setMicrophoneError(true); }
  };
  const stopRecording = () => recorderRef.current?.stop();
  const prepareCard = () => { if (!title.trim() && titleSuggestion) setTitle(titleSuggestion); if (!aiImageDataUrl && !cardDescription.trim() && descriptionSuggestion) setCardDescription(descriptionSuggestion); setStep(4); };
  const dataUrlToFile = async (dataUrl: string, name: string) => {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return new File([blob], name, { type: blob.type || "application/octet-stream" });
  };
  const createAiImage = async (direction = aiPrompt, isRevision = false) => {
    setIsGenerating(true);
    setGenerationError("");
    try {
      let transcriptContext = "";
      if (useTranscript && audioFileRef.current) {
        const transcript = audioTranscript || await (async () => {
          const transcriptionData = new FormData();
          transcriptionData.set("audio", audioFileRef.current as File);
          const transcriptionResponse = await fetch("/api/ai/transcribe", { method: "POST", body: transcriptionData });
          const transcriptionResult = await transcriptionResponse.json().catch(() => ({})) as { transcript?: string; error?: string };
          if (!transcriptionResponse.ok || !transcriptionResult.transcript) throw new Error(transcriptionResult.error || "De opname kon niet worden gebruikt voor dit beeldvoorstel.");
          setAudioTranscript(transcriptionResult.transcript);
          return transcriptionResult.transcript;
        })();
        transcriptContext = `Woorden uit de geluidsopname: ${transcript}`;
      }
      const data = new FormData();
      data.set("landscape", landscape.id);
      data.set("direction", direction);
      data.set("baseDirection", aiPrompt);
      data.set("revision", String(isRevision));
      data.set("aiPath", aiPath);
      data.set("context", [words, reference, careReflection, transcriptContext].filter(Boolean).join("\n"));
      const source = isRevision && aiImageDataUrl ? aiImageDataUrl : photos[0]?.dataUrl || (modes.includes("draw") ? drawingDataUrl : "");
      if (source) data.set("source", await dataUrlToFile(source, photos[0]?.name || "tekening.png"));
      const response = await fetch("/api/ai/image", { method: "POST", body: data });
      const result = await response.json().catch(() => ({})) as { image?: string; error?: string };
      if (!response.ok || !result.image) throw new Error(result.error || "Het beeldvoorstel kon niet worden gemaakt.");
      setAiImageDataUrl(result.image);
      setFeedbackDirection(null);
      setFeedback("");
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Het beeldvoorstel kon niet worden gemaakt.");
    } finally {
      setIsGenerating(false);
    }
  };
  const createAiText = async (direction = aiPrompt) => {
    setIsGenerating(true);
    setGenerationError("");
    try {
      const response = await fetch("/api/ai/text", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "text", direction, text: [words, careReflection, reference].filter(Boolean).join("\n\n") }) });
      const result = await response.json().catch(() => ({})) as { text?: string; error?: string };
      if (!response.ok || !result.text) throw new Error(result.error || "De tekstversie kon niet worden gemaakt.");
      setAiTextResult(result.text);
      setFeedbackDirection(null);
      setFeedback("");
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "De tekstversie kon niet worden gemaakt.");
    } finally { setIsGenerating(false); }
  };
  const createAiMotion = async (direction = aiPrompt) => {
    setIsGenerating(true);
    setGenerationError("");
    try {
      const response = await fetch("/api/ai/text", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "motion", direction, text: [words, careReflection, reference].filter(Boolean).join("\n\n") }) });
      const result = await response.json().catch(() => ({})) as { motion?: string; error?: string };
      if (!response.ok || !result.motion) throw new Error(result.error || "De beweging kon niet worden gekozen.");
      setAiMotion(result.motion);
      setFeedbackDirection(null);
      setFeedback("");
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "De beweging kon niet worden gekozen.");
    } finally { setIsGenerating(false); }
  };
  const finishContribution = async () => {
    if (sharing === "take") { setStep(6); return; }
    if (!hasShareableContent) {
      setSaveError("Voeg eerst iets toe voordat je rouwdier in het landschap kan leven.");
      return;
    }
    setIsSaving(true);
    setSaveError("");
    try {
      const data = new FormData();
      data.set("title", visibleTitle);
      const hasAiEndProduct = Boolean(aiImageDataUrl);
      data.set("description", hasAiEndProduct ? visibleDescription : visibleDescription || words || careReflection);
      data.set("kind", hasAiEndProduct ? "Beeld met AI" : sonificationUrl ? "Tekening met klank" : modes.includes("voice") ? "Geluidsopname" : modes.includes("draw") ? "Tekening" : modes.includes("photo") ? "Foto" : modes.includes("reference") ? "Verwijzing" : "Tekst");
      if (aiMotion) data.set("motion", aiMotion);
      if (hasAiEndProduct) data.set("aiImage", await dataUrlToFile(aiImageDataUrl, "beeld-met-ai.png"));
      else {
        data.set("text", words);
        data.set("reference", reference);
        data.set("referenceLink", referenceLink);
        for (const [index, photo] of photos.entries()) data.append("photos", await dataUrlToFile(photo.dataUrl, photo.name || `foto-${index + 1}.jpg`));
        if (drawingDataUrl) data.set("drawing", await dataUrlToFile(drawingDataUrl, "tekening.png"));
        if (sonificationFileRef.current || audioFileRef.current) data.set("audio", sonificationFileRef.current || audioFileRef.current as File);
      }
      const response = await fetch("/api/contributions", { method: "POST", body: data });
      const result = await response.json().catch(() => ({})) as { error?: string; contribution?: { id?: string } };
      if (!response.ok) throw new Error(result.error || "Je rouwdier kon niet worden toegevoegd.");
      setSavedContributionId(result.contribution?.id || "");
      setStep(6);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Je rouwdier kon niet worden toegevoegd.");
    } finally {
      setIsSaving(false);
    }
  };
  const wrapCanvasText = (context: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const lines: string[] = [];
    text.split("\n").forEach((paragraph) => {
      const wordsInParagraph = paragraph.trim().split(/\s+/).filter(Boolean);
      if (!wordsInParagraph.length) { lines.push(""); return; }
      let line = "";
      wordsInParagraph.forEach((word) => {
        const nextLine = line ? `${line} ${word}` : word;
        if (line && context.measureText(nextLine).width > maxWidth) { lines.push(line); line = word; }
        else line = nextLine;
      });
      if (line) lines.push(line);
    });
    return lines;
  };
  const downloadCard = async () => {
    const canvas = document.createElement("canvas");
    const width = 720;
    const inset = 16;
    const padding = 38;
    const contentWidth = width - inset * 2 - padding * 2;
    const mediaSource = aiImageDataUrl || photos[0]?.dataUrl || drawingDataUrl;
    const media = mediaSource ? await new Promise<HTMLImageElement | null>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = mediaSource;
    }) : null;
    const mediaHeight = media ? Math.round(contentWidth * (media.height / media.width)) : savedAudioUrl ? 140 : 0;
    canvas.width = width;
    canvas.height = 100;
    let context = canvas.getContext("2d");
    if (!context) return;
    context.font = "400 26px Arial, sans-serif";
    const titleLines = wrapCanvasText(context, visibleTitle, contentWidth).slice(0, 3);
    context.font = "17px Arial, sans-serif";
    const bodyText = visibleDescription || (!media && words ? words : "");
    const bodyLines = bodyText ? wrapCanvasText(context, bodyText, contentWidth).slice(0, 7) : [];
    const top = inset + padding;
    const titleTop = top + 47;
    const mediaTop = titleTop + titleLines.length * 34 + 24;
    const bodyTop = mediaTop + mediaHeight + (mediaHeight ? 25 : 0);
    const footerTop = bodyTop + bodyLines.length * 26 + (bodyLines.length ? 28 : 10);
    const footerHeight = includeReferenceQr && referenceLink ? 178 : 118;
    const height = Math.max(500, footerTop + footerHeight + inset + padding);
    canvas.height = height;
    context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#f7f4ec";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#fffdf8";
    context.fillRect(inset, inset, width - inset * 2, height - inset * 2);
    context.strokeStyle = "#d8d1c5";
    context.lineWidth = 1;
    context.strokeRect(inset + .5, inset + .5, width - inset * 2 - 1, height - inset * 2 - 1);
    context.fillStyle = "#6b655b";
    context.font = "14px Arial, sans-serif";
    context.fillText("rouwdier", inset + padding, top);
    context.fillStyle = "#2e2b26";
    context.font = "400 26px Arial, sans-serif";
    titleLines.forEach((line, index) => context?.fillText(line, inset + padding, titleTop + index * 34));
    if (media) context.drawImage(media, inset + padding, mediaTop, contentWidth, mediaHeight);
    if (!media && savedAudioUrl) {
      context.fillStyle = "#ebe6dc";
      context.fillRect(inset + padding, mediaTop, contentWidth, mediaHeight);
      context.fillStyle = "#6b655b";
      context.font = "16px Arial, sans-serif";
      context.fillText("geluidsopname", inset + padding + 18, mediaTop + 32);
    }
    context.fillStyle = "#2e2b26";
    context.font = "17px Arial, sans-serif";
    bodyLines.forEach((line, index) => context?.fillText(line, inset + padding, bodyTop + index * 26));
    context.strokeStyle = "#d8d1c5";
    context.beginPath();
    context.moveTo(inset + padding, footerTop);
    context.lineTo(width - inset - padding, footerTop);
    context.stroke();
    context.fillStyle = "#6b655b";
    context.font = "14px Arial, sans-serif";
    const hasReferenceQr = includeReferenceQr && Boolean(referenceLink);
    const sourceFooterTop = footerTop + 26;
    if (hasReferenceQr) {
      context.fillText("Open de verwijzing", inset + padding, sourceFooterTop);
      context.fillText("Scan de QR-code.", inset + padding, sourceFooterTop + 21);
    }
    const projectFooterTop = footerTop + (hasReferenceQr ? 104 : 26);
    context.fillText("Meer weten over rouwdieren?", inset + padding, projectFooterTop);
    context.fillText("Scan de QR-code.", inset + padding, projectFooterTop + 21);
    const qrUrl = `${window.location.origin}/over-rouwdieren`;
    const qrImage = await new Promise<HTMLImageElement | null>((resolve) => {
      QRCode.toDataURL(qrUrl, { width: 112, margin: 1, color: { dark: "#2e2b26", light: "#fffdf8" } }).then((source) => {
        const image = new Image(); image.onload = () => resolve(image); image.onerror = () => resolve(null); image.src = source;
      }).catch(() => resolve(null));
    });
    if (qrImage) context.drawImage(qrImage, width - inset - padding - 84, projectFooterTop - 13, 84, 84);
    if (hasReferenceQr) {
      const referenceQr = await new Promise<HTMLImageElement | null>((resolve) => {
        QRCode.toDataURL(referenceLink, { width: 112, margin: 1, color: { dark: "#2e2b26", light: "#fffdf8" } }).then((source) => {
          const image = new Image(); image.onload = () => resolve(image); image.onerror = () => resolve(null); image.src = source;
        }).catch(() => resolve(null));
      });
      if (referenceQr) context.drawImage(referenceQr, width - inset - padding - 84, sourceFooterTop - 13, 84, 84);
    }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const safeTitle = visibleTitle.toLocaleLowerCase("nl-NL").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "rouwdier";
    const file = new File([blob], `${safeTitle}.png`, { type: "image/png" });
    if (window.matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: visibleTitle }); return; }
      catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderInput = (mode: InputMode) => {
    const label = inputs.find((input) => input.id === mode)?.title;
    return <div className="input-surface" key={mode}>
      <p className="surface-label">{label}</p>
      {mode === "sounddraw" && <audio ref={activationAudioRef} className="activation-audio" src="/klank-aan.wav" preload="auto" />}
      {mode === "sounddraw" && isPreparingLiveSound && <p className="sound-preparing">klank wordt klaargezet…</p>}
      {mode === "write" && <textarea value={words} onChange={(event) => setWords(event.target.value)} placeholder="Begin waar je wilt…" aria-label="Schrijf iets over je rouwdier" />}
      {mode === "reference" && <div className="reference-area"><label>wat wil je aanwijzen?<textarea value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Een titel, zin, plek, liedje of gezegde…" aria-label="Wat wil je aanwijzen" /></label><label>link <span>optioneel</span><input type="url" value={referenceLink} onChange={(event) => { setReferenceLink(event.target.value); if (!event.target.value) setIncludeReferenceQr(false); }} placeholder="Waar is het te vinden?" aria-label="Link naar de verwijzing" /></label>{referenceLink && <label className="live-sound-choice"><input type="checkbox" checked={includeReferenceQr} onChange={(event) => setIncludeReferenceQr(event.target.checked)} />Zet een QR-code naar deze verwijzing op mijn kaartje.</label>}<p>De verwijzing blijft van jou. De AI zoekt niets automatisch op.</p></div>}
      {mode === "photo" && <div className="upload-area">{photos.length ? <div className="photo-previews">{photos.map((photo, index) => <figure key={photo.url} className="photo-preview-card"><img src={photo.url} alt={`Gekozen afbeelding ${index + 1}`} className="photo-preview" /><button type="button" onClick={() => removePhoto(photo.url)} aria-label={`Verwijder ${photo.name}`}>×</button></figure>)}</div> : <span className="upload-spark" aria-hidden="true" />}<div className="photo-actions"><label className="secondary-button">maak een foto<input type="file" accept="image/*" capture="environment" onChange={(event) => { addPhotos(event.target.files); event.currentTarget.value = ""; }} /></label><label className="secondary-button">kies uit je foto’s<input type="file" accept="image/*" multiple onChange={(event) => { addPhotos(event.target.files); event.currentTarget.value = ""; }} /></label></div>{photos.length > 0 && <small>{photos.length === 1 ? "1 foto toegevoegd" : `${photos.length} foto’s toegevoegd`}</small>}</div>}
      {(mode === "draw" || mode === "sounddraw") && <>{mode === "sounddraw" && <div className="sound-controls"><p className="lead">Teken terwijl de klank ontstaat. Wat je straks bewaart, klinkt zoals je het hier hebt gemaakt.</p><div className="sound-activation">{liveSoundReady ? <p>Klank staat aan.</p> : <><button type="button" className="secondary-button" onClick={activateLiveSound}>zet klank aan</button><p>Tik hier eerst op. Daarna hoor je de klank tijdens het tekenen.</p></>}</div><div className="drawing-sound-area"><p>Welke klank wil je tekenen?</p><div className="drawing-sound-options">{sonificationStyles.map((style) => <button type="button" key={style.id} className={sonificationStyle === style.id ? "is-selected" : ""} onClick={() => setSonificationStyle(style.id)}><strong>{style.title}</strong><span>{style.text}</span></button>)}</div><p>Welke instrumentklanken wil je horen? <span>maximaal twee</span></p><div className="drawing-sound-options">{sonificationInstruments.map((instrument) => <button type="button" key={instrument.id} className={sonificationInstrumentsSelected.includes(instrument.id) ? "is-selected" : ""} onClick={() => toggleSonificationInstrument(instrument.id)}><strong>{instrument.title}</strong><span>{instrument.text}</span></button>)}</div></div></div>}<div className="drawing-tools"><div className="drawing-colours" aria-label="Kies een kleur">{drawingColours.map((colour) => <button type="button" key={colour} className={drawingColour === colour ? "is-selected" : ""} style={{ "--drawing-colour": colour } as React.CSSProperties} aria-label={`Kies kleur ${colour}`} onClick={() => setDrawingColour(colour)} />)}</div><div className="drawing-thicknesses" aria-label="Kies lijndikte">{drawingThicknesses.map((thickness) => <button type="button" key={thickness.id} className={drawingThickness === thickness.id ? "is-selected" : ""} onClick={() => setDrawingThickness(thickness.id)}><strong style={{ "--stroke-width": `${thickness.width}px` } as React.CSSProperties} aria-hidden="true" />{thickness.title}</button>)}</div></div><div className="drawing-area">
        <canvas ref={canvasRef} width="720" height="720" aria-label="Tekenruimte" onPointerDown={beginDrawing} onPointerMove={continueDrawing} onPointerUp={endDrawing} onPointerLeave={endDrawing} />
        <button type="button" className="clear-button" onClick={clearDrawing}>begin opnieuw</button>
      </div>{mode === "sounddraw" && soundDrawingEventCount > 0 && <div className="drawing-result-controls">
          <button type="button" className="secondary-button" onClick={() => void createSonification()}>{sonificationUrl ? "maak opnieuw" : "bewaar en beluister je geluid"}</button>{sonificationUrl && <><audio controls src={sonificationUrl}>Je browser kan deze klank niet afspelen.</audio><label className="live-sound-choice"><input type="checkbox" checked={keepSoundDrawing} onChange={(event) => { setKeepSoundDrawing(event.target.checked); if (canvasRef.current) setDrawingDataUrl(event.target.checked ? canvasRef.current.toDataURL("image/png") : ""); }} />bewaar ook het tekenbeeld</label></>}<small>De eerste instrumentklank vraagt kort internet. Daarna wordt de klank uit je tekening gemaakt.</small>
        </div>}</>}
      {mode === "voice" && <div className="voice-area">{!audioUrl && <p>Je kunt je opname eerst hier beluisteren.</p>}{audioUrl && <audio controls src={audioUrl}>Je browser kan deze opname niet afspelen.</audio>}<button type="button" className={`record-button ${isRecording ? "is-recording" : ""}`} onClick={isRecording ? stopRecording : startRecording}>{isRecording ? "stop opname" : audioUrl ? "neem opnieuw op" : "begin opname"}</button>{microphoneError && <small>De microfoon is niet beschikbaar. Je kunt ook schrijven, tekenen of een foto kiezen.</small>}</div>}
    </div>;
  };

  const CardPreview = ({ compact = false }: { compact?: boolean }) => <article className={`rouwdier-card ${compact ? "is-compact" : ""}`} aria-label="Voorvertoning van je rouwdierkaartje"><p className="card-kicker">rouwdier</p><h2>{visibleTitle}</h2>{aiImageDataUrl ? <img className="card-image" src={aiImageDataUrl} alt="Beeldvoorstel van AI" /> : <>{photos[0] && <img className="card-image" src={photos[0].url} alt="Jouw gekozen afbeelding" />}{!photos[0] && drawingDataUrl && <img className="card-image card-drawing" src={drawingDataUrl} alt="Jouw tekening" />}{!photos[0] && !drawingDataUrl && savedAudioUrl && <div className="audio-cover"><span>{sonificationUrl ? "klank van de tekening" : "geluidsopname"}</span><i aria-hidden="true" /></div>}{!photos[0] && !drawingDataUrl && !savedAudioUrl && words && <p className="card-words">{words}</p>}{savedAudioUrl && <audio className="card-audio" controls src={savedAudioUrl}>Je browser kan deze opname niet afspelen.</audio>}{referenceLink && <p className="card-reference">verwijzing toegevoegd</p>}</>}{visibleDescription && <p className="card-description">{visibleDescription}</p>}<footer className="card-project-footer"><span>Meer weten over rouwdieren?</span><small>Scan de QR-code op het gedownloade kaartje.</small></footer></article>;

  return <main className="make-page"><header className="make-header"><a href="/verken" className="back-link">← terug naar het landschap</a></header><section className="make-card" aria-live="polite">
    {step === 1 && <div><p className="eyebrow">1 van 5 · iets meenemen</p><h1>Waar mag jouw rouwdier uit bestaan?</h1><p className="lead">Een rouwdier kan beginnen bij iets kleins. Je kunt één vorm kiezen, verschillende dingen samenbrengen of een foto toevoegen van iets wat je al fysiek hebt gemaakt.</p><div className="input-options">{inputs.map((input) => { const isSelected = modes.includes(input.id); return <button type="button" key={input.id} aria-pressed={isSelected} className={`input-option ${isSelected ? "is-selected" : ""}`} onClick={() => toggleMode(input.id)}><span className={`input-symbol ${input.symbol === "camera" ? "input-symbol-camera" : input.symbol === "microphone" ? "input-symbol-microphone" : ""}`} aria-hidden="true">{input.symbol !== "camera" && input.symbol !== "microphone" ? input.symbol : <span />}</span><span><strong>{input.title}</strong><small>{input.text}</small></span><span className="input-state">{isSelected ? "toegevoegd" : "voeg toe"}</span></button>; })}</div>{modes.length ? <div className="input-surfaces">{modes.map(renderInput)}</div> : <p className="empty-input-message">Je kunt iets kiezen, of meteen verdergaan.</p>}<div className="step-actions"><a className="quiet-button" href="/">terug</a><button type="button" className="primary-button" onClick={() => setStep(2)}>verder</button></div></div>}

    {step === 3 && <div><p className="eyebrow">3 van 5 · even stilstaan</p><h1>Kan je toelichten wat dit met jou doet? En vraagt jouw rouwdier iets van je?</h1><textarea className="feedback-field care-field" value={careReflection} onChange={(event) => setCareReflection(event.target.value)} placeholder="Als je wil kun je hier iets over schrijven." aria-label="Toelichting over wat dit met jou doet en wat jouw rouwdier vraagt" /><p className="skip-note">Je kunt ook meteen verder.</p><div className="step-actions"><button type="button" className="quiet-button" onClick={() => setStep(hasAi ? 21 : 2)}>terug</button><button type="button" className="primary-button" onClick={prepareCard}>verder</button></div></div>}

    {step === 2 && <div><p className="eyebrow">2 van 5 · vormgeven</p><h1>Wat wil je nu met je rouwdier doen?</h1><p className="lead">Je kunt zelf verdergaan, iets samen met AI maken, of AI vragen jouw input naar een andere vorm te vertalen.</p><div className="choice-list"><button type="button" className={aiPath === "none" ? "is-selected" : ""} onClick={() => { setAiPath("none"); setAiFormsSelected([]); }}><strong>Ik wil zelf verder</strong><span>Je rouwdier blijft zoals het nu is. Je kunt er zelf nog iets aan toevoegen.</span></button><button type="button" className={aiPath === "together" ? "is-selected" : ""} onClick={() => { setAiPath("together"); setAiFormsSelected([]); }}><strong>Ik wil samen met AI verder werken</strong><span>AI werkt met wat je hebt ingebracht. Jij bepaalt wat er gebeurt.</span></button><button type="button" className={aiPath === "translate" ? "is-selected" : ""} onClick={() => { setAiPath("translate"); setAiFormsSelected([]); }}><strong>Ik wil AI mijn input laten vertalen</strong><span>AI maakt een nieuw beeld vanuit wat jij hebt ingebracht.</span></button></div>{hasAi && <div className="ai-form-area"><p className="feedback-question">{aiPath === "together" ? "Wat mag AI nu doen?" : "AI maakt een nieuw beeld."}</p><p className="option-explainer">Je kiest nu één bewerking. Wat je zelf hebt ingebracht blijft behouden.</p><div className="choice-list">{availableAiForms.map((form) => <button type="button" key={form.id} className={aiFormsSelected.includes(form.id) ? "is-selected" : ""} onClick={() => toggleAiForm(form.id)}><strong>{form.title}</strong><span>{form.text}</span></button>)}</div></div>}<div className="step-actions"><button type="button" className="quiet-button" onClick={() => setStep(1)}>terug</button><button type="button" className="primary-button" disabled={hasAi && !aiFormsSelected.length} onClick={() => hasAi ? setStep(hasImageForm ? 21 : hasMotionForm ? 23 : aiFormsSelected.includes("text") ? 22 : 3) : setStep(3)}>verder</button></div></div>}

    {step === 21 && <div><p className="eyebrow">2 van 5 · vormgeven</p><h1>{aiImageDataUrl ? "Kijk even naar de AI-versie." : aiImageHeading}</h1><p className="lead">Straks beslis je wat ermee gebeurt. Je hoeft niets te delen als je dat niet wilt.</p>{hasImageForm && <><label className="title-field">{aiImagePromptLabel} <span>optioneel</span><textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder="Bijvoorbeeld: laat zien wat hier voor jou in meeleeft" aria-label="Wat mag AI verbeelden" /></label>{audioUrl && <label className="consent-field transcript-choice"><input type="checkbox" checked={useTranscript} onChange={(event) => setUseTranscript(event.target.checked)} /><span>Gebruik de woorden uit mijn opname ook voor dit beeld.</span><small>De opname wordt hiervoor eenmalig omgezet naar tekst. Die tekst komt niet op je kaartje en wordt niet bewaard.</small></label>}<label className="consent-field transcript-choice"><input type="checkbox" checked={hasAiConsent} onChange={(event) => setHasAiConsent(event.target.checked)} /><span>Ik begrijp dat wat ik voor deze AI-versie kies tijdelijk naar OpenAI gaat.</span><small>OpenAI maakt hiermee een beeldvoorstel. Alleen het eindresultaat komt op je kaartje.</small></label>{!aiImageDataUrl && <div className="step-actions"><button type="button" className="quiet-button" onClick={() => setStep(2)}>terug</button><button type="button" className="primary-button" disabled={isGenerating || !hasAiConsent} onClick={() => void createAiImage()}>{isGenerating ? "beeld wordt gemaakt…" : "maak een beeldvoorstel"}</button></div>}{generationError && <p className="save-error" role="alert">{generationError}</p>}{aiImageDataUrl && <><div className="ai-result"><img src={aiImageDataUrl} alt="Beeldvoorstel van AI" /></div><div className="feedback-choices"><button type="button" className={feedbackDirection === "keep" ? "is-selected" : ""} onClick={() => setFeedbackDirection("keep")}>Dit voelt passend</button><button type="button" className={feedbackDirection === "adjust" ? "is-selected" : ""} onClick={() => setFeedbackDirection("adjust")}>Ik wil iets veranderen</button><button type="button" className={feedbackDirection === "again" ? "is-selected" : ""} onClick={() => setFeedbackDirection("again")}>Ik wil opnieuw kijken</button><button type="button" className={feedbackDirection === "without" ? "is-selected" : ""} onClick={() => setFeedbackDirection("without")}>Ik wil zonder AI verder</button></div>{(feedbackDirection === "adjust" || feedbackDirection === "again") && <div className="feedback-followup"><p>Vertel wat je anders wilt zien.</p><textarea className="feedback-field" value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Schrijf wat je wilt veranderen." aria-label="Wat wil je veranderen" /><button type="button" className="secondary-button" disabled={isGenerating} onClick={() => void createAiImage(feedback, true)}>{isGenerating ? "beeld wordt gemaakt…" : "maak een nieuwe versie"}</button></div>}{feedbackDirection === "without" && <p className="feedback-followup">Je eigen bijdrage blijft over, zonder de AI-versie.</p>}<div className="step-actions"><button type="button" className="quiet-button" onClick={() => setStep(2)}>terug</button><button type="button" className="primary-button" disabled={!feedbackDirection || feedbackDirection === "adjust" || feedbackDirection === "again"} onClick={() => { if (feedbackDirection === "without") { setAiPath("none"); setAiImageDataUrl(""); } setStep(3); }}>verder</button></div></>}</>}</div>}

    {step === 4 && <div><p className="eyebrow">4 van 5 · je rouwdier als kaartje</p><h1>Je rouwdier als kaartje</h1><p className="lead">We hebben alvast gebruikt wat je zelf hebt toegevoegd. Je kunt dit aanpassen, leegmaken of vervangen.</p><div className="card-editor"><CardPreview /><div className="card-fields"><label className="title-field">naam of klein woord <span>optioneel</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="bijvoorbeeld: De stekjes van oma" /></label><label className="title-field">wat wil je erbij zeggen? <span>optioneel</span><textarea value={cardDescription} onChange={(event) => setCardDescription(event.target.value)} placeholder="Schrijf wat je wilt meegeven." aria-label="Toelichting bij je rouwdier" /></label></div></div><div className="completion-actions"><button type="button" className="secondary-button" onClick={downloadCard}>bewaar als afbeelding</button>{audioUrl && <a className="secondary-button" href={audioUrl} download="geluidsopname.webm">bewaar geluidsopname</a>}</div><div className="step-actions"><button type="button" className="quiet-button" onClick={() => setStep(3)}>terug</button><button type="button" className="primary-button" onClick={() => setStep(5)}>kies waar het mag leven</button></div></div>}

    {step === 5 && <div><p className="eyebrow">5 van 5 · waar mag het leven?</p><h1>Waar mag deze bijdrage leven?</h1><p className="lead">Je bijdrage blijft anoniem.</p><div className="choice-list sharing-list"><button type="button" className={sharing === "take" ? "is-selected" : ""} onClick={() => { setSharing("take"); setIsPubliclyConfirmed(false); setShowConsentDetails(false); setSaveError(""); }}><strong>Ik neem het weer mee</strong><span>Er verschijnt niets in het landschap.</span></button><button type="button" className={sharing === "online" ? "is-selected" : ""} onClick={() => { setSharing("online"); setIsPubliclyConfirmed(false); setShowConsentDetails(false); setSaveError(""); }}><strong>Het mag in het online landschap leven</strong><span>Bezoekers kunnen jouw bijdrage daar openen.</span></button><button type="button" className={sharing === "here" ? "is-selected" : ""} onClick={() => { setSharing("here"); setIsPubliclyConfirmed(false); setShowConsentDetails(false); setSaveError(""); }}><strong>Het mag bij deze opstelling leven</strong><span>Naast het online landschap kan het hier bij deze opstelling worden getoond. Niet alle rouwdieren krijgen hier een plek.</span></button><button type="button" className={sharing === "future" ? "is-selected" : ""} onClick={() => { setSharing("future"); setIsPubliclyConfirmed(false); setShowConsentDetails(false); setSaveError(""); }}><strong>Het mag ook op andere plekken leven</strong><span>Ook niet alle rouwdieren worden elders getoond. Welke andere plekken dat zijn, is vooraf niet bekend.</span></button></div>{sharing !== "take" && <div className="consent-area"><label className="consent-field"><input type="checkbox" checked={isPubliclyConfirmed} onChange={(event) => setIsPubliclyConfirmed(event.target.checked)} /><span>Ik begrijp wat deze keuze inhoudt.</span></label><button type="button" className="consent-details-button" onClick={() => setShowConsentDetails(true)}>Lees de toelichting</button></div>}<p className="test-note">{hasShareableContent ? "Als je kiest voor het online landschap, verschijnt je rouwdier daar meteen en kunnen anderen het openen." : "Je kunt je rouwdier meenemen, of eerst nog iets toevoegen voordat het in het landschap kan leven."}</p>{saveError && <p className="save-error" role="alert">{saveError}</p>}<div className="step-actions"><button type="button" className="quiet-button" onClick={() => setStep(4)}>terug</button><button type="button" className="primary-button" disabled={isSaving || (sharing !== "take" && (!isPubliclyConfirmed || !hasShareableContent))} onClick={() => void finishContribution()}>{isSaving ? "even toevoegen…" : "rond af"}</button></div>{showConsentDetails && <div className="consent-modal" role="dialog" aria-modal="true" aria-labelledby="consent-title"><section><button type="button" aria-label="Sluit toelichting" onClick={() => setShowConsentDetails(false)}>×</button><p>{consentDetails.title}</p><h2 id="consent-title">Wat houdt deze keuze in?</h2><div>{consentDetails.text}</div></section></div>}</div>}

    {step === 6 && <div className="make-intro completion"><p className="eyebrow">klaar</p><h1>{sharing === "take" ? "Je rouwdier blijft bij jou." : "Je rouwdier heeft nu een plek gekregen."}</h1><p className="lead">{sharing === "take" ? "Er is niets aan het landschap of een opstelling toegevoegd. Wil je wel die van anderen bekijken?" : "Je hebt aangegeven waar deze bijdrage eventueel mag leven."}</p><a className="primary-button" href={savedContributionId ? `/verken?landschap=${landscape.id}&nieuw=${encodeURIComponent(savedContributionId)}` : `/verken?landschap=${landscape.id}`}>{sharing === "take" ? `bekijk de rouwdieren van anderen in het ${landscape.name}` : `bekijk jouw rouwdier en dat van anderen in het ${landscape.name}`}</a></div>}
    {step === 22 && aiFormsSelected.includes("text") && <div><p className="eyebrow">2 van 5 · vormgeven</p><h1>{aiTextResult ? "Kijk even naar de tekstversie." : "Wat mag AI met je woorden doen?"}</h1><p className="lead">AI ordent alleen wat jij zelf hebt geschreven. Je kunt de tekst gebruiken, aanpassen of niet gebruiken.</p><label className="title-field">wat mag helderder of anders geordend? <span>optioneel</span><textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder="Bijvoorbeeld: houd mijn woorden, maar maak de volgorde rustiger" aria-label="Wat mag AI met je woorden doen" /></label><label className="consent-field transcript-choice"><input type="checkbox" checked={hasAiConsent} onChange={(event) => setHasAiConsent(event.target.checked)} /><span>Ik begrijp dat mijn woorden tijdelijk naar OpenAI gaan.</span><small>OpenAI ordent ze zonder nieuwe inhoud toe te voegen. Alleen wat ik zelf kies komt op mijn kaartje.</small></label>{!aiTextResult ? <div className="step-actions"><button type="button" className="quiet-button" onClick={() => setStep(2)}>terug</button><button type="button" className="primary-button" disabled={isGenerating || !hasAiConsent} onClick={() => void createAiText()}>{isGenerating ? "tekst wordt geordend…" : "orden mijn woorden"}</button></div> : <><div className="ai-result ai-text-result">{aiTextResult}</div><div className="feedback-choices"><button type="button" className={feedbackDirection === "keep" ? "is-selected" : ""} onClick={() => setFeedbackDirection("keep")}>Dit voelt passend</button><button type="button" className={feedbackDirection === "adjust" ? "is-selected" : ""} onClick={() => setFeedbackDirection("adjust")}>Ik wil iets veranderen</button><button type="button" className={feedbackDirection === "without" ? "is-selected" : ""} onClick={() => setFeedbackDirection("without")}>Ik wil zonder AI verder</button></div>{feedbackDirection === "adjust" && <div className="feedback-followup"><p>Vertel wat je anders wilt.</p><textarea className="feedback-field" value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Schrijf wat je wilt veranderen." aria-label="Wat wil je veranderen" /><button type="button" className="secondary-button" disabled={isGenerating} onClick={() => void createAiText(feedback)}>{isGenerating ? "tekst wordt geordend…" : "maak een nieuwe versie"}</button></div>}<div className="step-actions"><button type="button" className="quiet-button" onClick={() => setStep(2)}>terug</button><button type="button" className="primary-button" disabled={!feedbackDirection || feedbackDirection === "adjust"} onClick={() => { if (feedbackDirection === "keep") setWords(aiTextResult); setStep(3); }}>verder</button></div></>}{generationError && <p className="save-error" role="alert">{generationError}</p>}</div>}
    {step === 23 && hasMotionForm && <div><p className="eyebrow">2 van 5 · vormgeven</p><h1>{aiMotion ? "Kijk even naar de beweging." : "Hoe mag je rouwdier bewegen?"}</h1><p className="lead">De beweging verschijnt alleen wanneer iemand jouw rouwdier opent. Het landschap zelf blijft rustig.</p><label className="title-field">wat wil je dat de beweging doet? <span>optioneel</span><textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder="Bijvoorbeeld: heel rustig, alsof het even blijft hangen" aria-label="Wat wil je dat de beweging doet" /></label><label className="consent-field transcript-choice"><input type="checkbox" checked={hasAiConsent} onChange={(event) => setHasAiConsent(event.target.checked)} /><span>Ik begrijp dat mijn woorden tijdelijk naar OpenAI gaan.</span><small>OpenAI kiest alleen een rustige bewegingsrichting voor dit rouwdier.</small></label>{!aiMotion ? <div className="step-actions"><button type="button" className="quiet-button" onClick={() => setStep(2)}>terug</button><button type="button" className="primary-button" disabled={isGenerating || !hasAiConsent} onClick={() => void createAiMotion()}>{isGenerating ? "beweging wordt gekozen…" : "kies een beweging"}</button></div> : <><div className={`motion-preview motion-${aiMotion}`}>{motionPreviewImage ? <img className="motion-preview-subject" src={motionPreviewImage} alt="Voorvertoning van jouw bijdrage met beweging" /> : <p className="motion-preview-subject motion-preview-words">{motionPreviewWords}</p>}<p>{aiMotion === "heartbeat" ? "een lichte hartslag" : aiMotion === "drift" ? "een zachte beweging die langzaam wegdrijft" : aiMotion === "sway" ? "een rustige beweging van links naar rechts" : "een beweging die langzaam ademt"}</p></div><div className="feedback-choices"><button type="button" className={feedbackDirection === "keep" ? "is-selected" : ""} onClick={() => setFeedbackDirection("keep")}>Dit voelt passend</button><button type="button" className={feedbackDirection === "without" ? "is-selected" : ""} onClick={() => setFeedbackDirection("without")}>Ik wil zonder beweging verder</button></div><div className="step-actions"><button type="button" className="quiet-button" onClick={() => setStep(2)}>terug</button><button type="button" className="primary-button" disabled={!feedbackDirection} onClick={() => { if (feedbackDirection === "without") setAiMotion(""); setStep(3); }}>verder</button></div></>}{generationError && <p className="save-error" role="alert">{generationError}</p>}</div>}
  </section></main>;
}
