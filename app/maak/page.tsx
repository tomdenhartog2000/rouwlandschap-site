"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type InputMode = "write" | "photo" | "draw" | "voice" | "reference";
type AiPath = "none" | "together" | "translate";
type AiForm = "image";
type SharingChoice = "take" | "online" | "here" | "future";

const inputs: Array<{ id: InputMode; title: string; text: string; symbol: string }> = [
  { id: "write", title: "Schrijven", text: "Een woord, herinnering of iets dat nog geen vorm heeft.", symbol: "Aa" },
  { id: "photo", title: "Foto toevoegen", text: "Een beeld dat je al bij je hebt, of hier maakt.", symbol: "camera" },
  { id: "draw", title: "Tekenen", text: "Een spoor, schets of vorm die je hier maakt.", symbol: "〰" },
  { id: "voice", title: "Geluidsopname", text: "Een stem, klank of moment van geluid.", symbol: "microphone" },
  { id: "reference", title: "Aanwijzen", text: "Een liedje, tekst, gezegde of plek die al bestaat.", symbol: "↗" },
];

const aiForms: Array<{ id: AiForm; title: string; text: string }> = [
  { id: "image", title: "Beeld", text: "Een achtergrond of extra beeldlaag." },
];

const formNames: Record<AiForm, string> = { image: "beeld" };

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
  const [photos, setPhotos] = useState<Array<{ name: string; url: string; dataUrl: string }>>([]);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioDataUrl, setAudioDataUrl] = useState("");
  const [useTranscript, setUseTranscript] = useState(false);
  const [audioTranscript, setAudioTranscript] = useState("");
  const [hasAiConsent, setHasAiConsent] = useState(false);
  const [drawingDataUrl, setDrawingDataUrl] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiImageDataUrl, setAiImageDataUrl] = useState("");
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

  const titleSuggestion = firstUsefulLine(reference) || (modes.includes("write") ? firstUsefulLine(words).slice(0, 70) : "");
  const descriptionSuggestion = words || careReflection;
  const visibleTitle = title.trim() || titleSuggestion || "een rouwdier";
  const visibleDescription = cardDescription.trim();
  const hasAi = aiPath !== "none";
  const consentDetails = sharing === "online"
    ? { title: "Online landschap", text: "Je rouwdier reist anoniem mee met de online collectie. Het kan hier online worden bekeken en is alleen gekoppeld aan de plek waar het is ontstaan." }
    : sharing === "here"
      ? { title: "Deze opstelling", text: "Je rouwdier kan, naast online, bij deze opstelling worden getoond. Als de opstelling naar een andere plek reist, wordt het daar niet opnieuw tentoongesteld." }
      : { title: "Andere plekken", text: "Je rouwdier reist anoniem mee met de collectie, ook naar plekken die nu nog niet bekend zijn. Niet alle rouwdieren worden daar getoond." };

  const toggleMode = (mode: InputMode) => setModes((current) => current.includes(mode) ? current.filter((item) => item !== mode) : [...current, mode]);
  const toggleAiForm = (form: AiForm) => setAiFormsSelected((current) => current.includes(form) ? current.filter((item) => item !== form) : [...current, form]);

  const drawAt = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const rect = canvas.getBoundingClientRect();
    const point = { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
    context.strokeStyle = "#2e2b26";
    context.lineWidth = 3.5;
    context.lineCap = "round";
    context.lineJoin = "round";
    if (lastPoint.current) {
      context.beginPath();
      context.moveTo(lastPoint.current.x, lastPoint.current.y);
      context.lineTo(point.x, point.y);
      context.stroke();
    }
    lastPoint.current = point;
  };
  const beginDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => { drawing.current = true; event.currentTarget.setPointerCapture(event.pointerId); drawAt(event); };
  const continueDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => { if (drawing.current) drawAt(event); };
  const endDrawing = () => { drawing.current = false; lastPoint.current = null; if (canvasRef.current) setDrawingDataUrl(canvasRef.current.toDataURL("image/png")); };
  const clearDrawing = () => { const canvas = canvasRef.current; const context = canvas?.getContext("2d"); if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height); setDrawingDataUrl(""); };
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
      data.set("context", [words, reference, careReflection, transcriptContext].filter(Boolean).join("\n"));
      const source = isRevision && aiImageDataUrl ? aiImageDataUrl : photos[0]?.dataUrl || drawingDataUrl;
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
  const finishContribution = async () => {
    if (sharing === "take") { setStep(6); return; }
    setIsSaving(true);
    setSaveError("");
    try {
      const data = new FormData();
      data.set("title", visibleTitle);
      const hasAiEndProduct = Boolean(aiImageDataUrl);
      data.set("description", hasAiEndProduct ? visibleDescription : visibleDescription || words || careReflection);
      data.set("kind", hasAiEndProduct ? "Beeld met AI" : modes.includes("voice") ? "Geluidsopname" : modes.includes("draw") ? "Tekening" : modes.includes("photo") ? "Foto" : modes.includes("reference") ? "Verwijzing" : "Tekst");
      if (hasAiEndProduct) data.set("aiImage", await dataUrlToFile(aiImageDataUrl, "beeld-met-ai.png"));
      else {
        data.set("text", words);
        data.set("reference", reference);
        data.set("referenceLink", referenceLink);
        for (const [index, photo] of photos.entries()) data.append("photos", await dataUrlToFile(photo.dataUrl, photo.name || `foto-${index + 1}.jpg`));
        if (drawingDataUrl) data.set("drawing", await dataUrlToFile(drawingDataUrl, "tekening.png"));
        if (audioFileRef.current) data.set("audio", audioFileRef.current);
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
    const context = canvas.getContext("2d");
    if (!context) return;
    const width = 1200;
    const height = 1600;
    const padding = 90;
    const contentWidth = width - padding * 2;
    canvas.width = width;
    canvas.height = height;
    context.fillStyle = "#f7f4ec";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#fffdf8";
    context.fillRect(42, 42, width - 84, height - 84);
    context.strokeStyle = "#d8d1c5";
    context.lineWidth = 2;
    context.strokeRect(42, 42, width - 84, height - 84);
    context.fillStyle = "#6b655b";
    context.font = "28px Arial, sans-serif";
    context.fillText("rouwdier", padding, 130);
    context.fillStyle = "#2e2b26";
    context.font = "56px Arial, sans-serif";
    const titleLines = wrapCanvasText(context, visibleTitle, contentWidth);
    titleLines.slice(0, 3).forEach((line, index) => context.fillText(line, padding, 212 + index * 66));
    const titleHeight = Math.max(1, Math.min(titleLines.length, 3)) * 66;
    const mediaSource = aiImageDataUrl || photos[0]?.dataUrl || drawingDataUrl;
    const mediaTop = 260 + titleHeight;
    const mediaHeight = 610;
    if (mediaSource) {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const item = new Image();
        item.onload = () => resolve(item);
        item.onerror = () => reject(new Error("Afbeelding kon niet worden geladen."));
        item.src = mediaSource;
      }).catch(() => null);
      if (image) {
        const scale = Math.min(contentWidth / image.width, mediaHeight / image.height);
        const imageWidth = image.width * scale;
        const imageHeight = image.height * scale;
        const imageX = padding + (contentWidth - imageWidth) / 2;
        const imageY = mediaTop + (mediaHeight - imageHeight) / 2;
        context.fillStyle = "#ebe6dc";
        context.fillRect(padding, mediaTop, contentWidth, mediaHeight);
        context.drawImage(image, imageX, imageY, imageWidth, imageHeight);
      }
    } else if (audioUrl) {
      context.fillStyle = "#ebe6dc";
      context.fillRect(padding, mediaTop, contentWidth, 340);
      context.fillStyle = "#2e2b26";
      context.font = "34px Arial, sans-serif";
      context.fillText("geluidsopname", padding + 38, mediaTop + 76);
      context.strokeStyle = "#6b655b";
      context.lineWidth = 6;
      for (let index = 0; index < 27; index += 1) {
        const x = padding + 38 + index * 38;
        const waveHeight = 26 + ((index * 31) % 130);
        context.beginPath();
        context.moveTo(x, mediaTop + 230 - waveHeight / 2);
        context.lineTo(x, mediaTop + 230 + waveHeight / 2);
        context.stroke();
      }
    } else if (words) {
      context.fillStyle = "#ebe6dc";
      context.fillRect(padding, mediaTop, contentWidth, 340);
      context.fillStyle = "#2e2b26";
      context.font = "38px Arial, sans-serif";
      wrapCanvasText(context, words, contentWidth - 76).slice(0, 7).forEach((line, index) => context.fillText(line, padding + 38, mediaTop + 80 + index * 48));
    }
    const descriptionTop = mediaSource ? mediaTop + mediaHeight + 72 : mediaTop + 415;
    const description = visibleDescription || (!mediaSource && !audioUrl ? words : "");
    if (description) {
      context.fillStyle = "#2e2b26";
      context.font = "34px Arial, sans-serif";
      wrapCanvasText(context, description, contentWidth).slice(0, 8).forEach((line, index) => context.fillText(line, padding, descriptionTop + index * 46));
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
      {mode === "write" && <textarea value={words} onChange={(event) => setWords(event.target.value)} placeholder="Begin waar je wilt…" aria-label="Schrijf iets over je rouwdier" />}
      {mode === "reference" && <div className="reference-area"><label>wat wil je aanwijzen?<textarea value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Een titel, zin, plek, liedje of gezegde…" aria-label="Wat wil je aanwijzen" /></label><label>link <span>optioneel</span><input type="url" value={referenceLink} onChange={(event) => setReferenceLink(event.target.value)} placeholder="Waar is het te vinden?" aria-label="Link naar de verwijzing" /></label><p>De verwijzing blijft van jou. De AI zoekt niets automatisch op.</p></div>}
      {mode === "photo" && <div className="upload-area">{photos.length ? <div className="photo-previews">{photos.map((photo, index) => <figure key={photo.url} className="photo-preview-card"><img src={photo.url} alt={`Gekozen afbeelding ${index + 1}`} className="photo-preview" /><button type="button" onClick={() => removePhoto(photo.url)} aria-label={`Verwijder ${photo.name}`}>×</button></figure>)}</div> : <span className="upload-spark" aria-hidden="true" />}<div className="photo-actions"><label className="secondary-button">maak een foto<input type="file" accept="image/*" capture="environment" onChange={(event) => { addPhotos(event.target.files); event.currentTarget.value = ""; }} /></label><label className="secondary-button">kies uit je foto’s<input type="file" accept="image/*" multiple onChange={(event) => { addPhotos(event.target.files); event.currentTarget.value = ""; }} /></label></div>{photos.length > 0 && <small>{photos.length === 1 ? "1 foto toegevoegd" : `${photos.length} foto’s toegevoegd`}</small>}</div>}
      {mode === "draw" && <div className="drawing-area"><canvas ref={canvasRef} width="720" height="720" aria-label="Tekenruimte" onPointerDown={beginDrawing} onPointerMove={continueDrawing} onPointerUp={endDrawing} onPointerLeave={endDrawing} /><button type="button" className="clear-button" onClick={clearDrawing}>wis tekening</button></div>}
      {mode === "voice" && <div className="voice-area">{!audioUrl && <p>Je kunt je opname eerst hier beluisteren.</p>}{audioUrl && <audio controls src={audioUrl}>Je browser kan deze opname niet afspelen.</audio>}<button type="button" className={`record-button ${isRecording ? "is-recording" : ""}`} onClick={isRecording ? stopRecording : startRecording}>{isRecording ? "stop opname" : audioUrl ? "neem opnieuw op" : "begin opname"}</button>{microphoneError && <small>De microfoon is niet beschikbaar. Je kunt ook schrijven, tekenen of een foto kiezen.</small>}</div>}
    </div>;
  };

  const CardPreview = ({ compact = false }: { compact?: boolean }) => <article className={`rouwdier-card ${compact ? "is-compact" : ""}`} aria-label="Voorvertoning van je rouwdierkaartje"><p className="card-kicker">rouwdier</p><h2>{visibleTitle}</h2>{aiImageDataUrl ? <><p className="card-ai-label">gemaakt met AI</p><img className="card-image" src={aiImageDataUrl} alt="Beeldvoorstel van AI" /></> : <>{photos[0] && <img className="card-image" src={photos[0].url} alt="Jouw gekozen afbeelding" />}{!photos[0] && drawingDataUrl && <img className="card-image card-drawing" src={drawingDataUrl} alt="Jouw tekening" />}{!photos[0] && !drawingDataUrl && audioUrl && <div className="audio-cover"><span>geluidsopname</span><i aria-hidden="true" /></div>}{!photos[0] && !drawingDataUrl && !audioUrl && words && <p className="card-words">{words}</p>}{audioUrl && <audio className="card-audio" controls src={audioUrl}>Je browser kan deze opname niet afspelen.</audio>}{referenceLink && <p className="card-reference">verwijzing toegevoegd</p>}</>}{visibleDescription && <p className="card-description">{visibleDescription}</p>}</article>;

  return <main className="make-page"><header className="make-header"><a href="/verken" className="back-link">← terug naar het landschap</a></header><section className="make-card" aria-live="polite">
    {step === 1 && <div><p className="eyebrow">1 van 5 · iets meenemen</p><h1>Wat wil je meenemen?</h1><p className="lead">Een rouwdier kan beginnen bij iets kleins. Je kunt één vorm kiezen, of verschillende dingen samenbrengen.</p><div className="input-options">{inputs.map((input) => { const isSelected = modes.includes(input.id); return <button type="button" key={input.id} aria-pressed={isSelected} className={`input-option ${isSelected ? "is-selected" : ""}`} onClick={() => toggleMode(input.id)}><span className={`input-symbol ${input.symbol === "camera" ? "input-symbol-camera" : input.symbol === "microphone" ? "input-symbol-microphone" : ""}`} aria-hidden="true">{input.symbol !== "camera" && input.symbol !== "microphone" ? input.symbol : <span />}</span><span><strong>{input.title}</strong><small>{input.text}</small></span><span className="input-state">{isSelected ? "toegevoegd" : "voeg toe"}</span></button>; })}</div>{modes.length ? <div className="input-surfaces">{modes.map(renderInput)}</div> : <p className="empty-input-message">Je kunt iets kiezen, of meteen verdergaan.</p>}<div className="step-actions"><a className="quiet-button" href="/">terug</a><button type="button" className="primary-button" onClick={() => setStep(2)}>verder</button></div></div>}

    {step === 3 && <div><p className="eyebrow">3 van 5 · even stilstaan</p><h1>Kan je toelichten wat dit met jou doet? En vraagt jouw rouwdier iets van je?</h1><textarea className="feedback-field care-field" value={careReflection} onChange={(event) => setCareReflection(event.target.value)} placeholder="Als je wil kun je hier iets over schrijven." aria-label="Toelichting over wat dit met jou doet en wat jouw rouwdier vraagt" /><p className="skip-note">Je kunt ook meteen verder.</p><div className="step-actions"><button type="button" className="quiet-button" onClick={() => setStep(hasAi ? 21 : 2)}>terug</button><button type="button" className="primary-button" onClick={prepareCard}>verder</button></div></div>}

    {step === 2 && <div><p className="eyebrow">2 van 5 · vormgeven</p><h1>Wat wil je nu met je rouwdier doen?</h1><p className="lead">Je kunt zelf verdergaan, iets samen met AI maken, of AI vragen jouw input naar een andere vorm te vertalen.</p><div className="choice-list"><button type="button" className={aiPath === "none" ? "is-selected" : ""} onClick={() => { setAiPath("none"); setAiFormsSelected([]); }}><strong>Ik wil zelf verder</strong><span>Je rouwdier blijft zoals het nu is. Je kunt er zelf nog iets aan toevoegen.</span></button><button type="button" className={aiPath === "together" ? "is-selected" : ""} onClick={() => setAiPath("together")}><strong>Ik wil samen met AI verder werken</strong><span>AI kan iets toevoegen, veranderen of ergens op reageren. Jij bepaalt wat er gebeurt.</span></button><button type="button" className={aiPath === "translate" ? "is-selected" : ""} onClick={() => setAiPath("translate")}><strong>Ik wil AI mijn input laten vertalen</strong><span>AI maakt een nieuwe vorm vanuit wat jij hebt ingebracht.</span></button></div>{hasAi && <div className="ai-form-area"><p className="feedback-question">{aiPath === "together" ? "Wat mag AI aan jouw bijdrage toevoegen?" : "Welke vorm wil je verkennen?"}</p><p className="option-explainer">Je eigen bijdrage blijft het vertrekpunt.</p><div className="choice-list">{aiForms.map((form) => <button type="button" key={form.id} className={aiFormsSelected.includes(form.id) ? "is-selected" : ""} onClick={() => toggleAiForm(form.id)}><strong>{form.title}</strong><span>Een achtergrond of extra beeldlaag.</span></button>)}</div></div>}{hasAi && <p className="test-note">Een beeldvoorstel werkt nu. Geluid kun je zelf opnemen; tekst en beweging volgen later.</p>}<div className="step-actions"><button type="button" className="quiet-button" onClick={() => setStep(1)}>terug</button><button type="button" className="primary-button" disabled={hasAi && !aiFormsSelected.length} onClick={() => hasAi ? setStep(21) : setStep(3)}>verder</button></div></div>}

    {step === 21 && <div><p className="eyebrow">2 van 5 · vormgeven</p><h1>{aiImageDataUrl ? "Kijk even naar wat er is ontstaan." : "Wat mag AI toevoegen?"}</h1><p className="lead">Straks beslis je wat ermee gebeurt. Je hoeft niets te delen als je dat niet wilt.</p>{aiFormsSelected.includes("image") ? <><label className="title-field">wat wil je dat AI toevoegt? <span>optioneel</span><textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder="Bijvoorbeeld: een rustige achtergrond met zachte vormen" aria-label="Wat mag AI toevoegen" /></label>{audioUrl && <label className="consent-field transcript-choice"><input type="checkbox" checked={useTranscript} onChange={(event) => setUseTranscript(event.target.checked)} /><span>Gebruik de woorden uit mijn opname ook voor dit beeld.</span><small>De opname wordt hiervoor eenmalig omgezet naar tekst. Die tekst komt niet op je kaartje en wordt niet bewaard.</small></label>}<label className="consent-field transcript-choice"><input type="checkbox" checked={hasAiConsent} onChange={(event) => setHasAiConsent(event.target.checked)} /><span>Ik begrijp dat wat ik voor dit beeld kies tijdelijk naar OpenAI gaat.</span><small>OpenAI maakt hiermee een beeldvoorstel. Alleen het eindresultaat komt op je kaartje.</small></label>{!aiImageDataUrl && <div className="step-actions"><button type="button" className="quiet-button" onClick={() => setStep(2)}>terug</button><button type="button" className="primary-button" disabled={isGenerating || !hasAiConsent} onClick={() => void createAiImage()}>{isGenerating ? "beeld wordt gemaakt…" : "maak een beeldvoorstel"}</button></div>}{generationError && <p className="save-error" role="alert">{generationError}</p>}{aiImageDataUrl && <><div className="ai-result"><img src={aiImageDataUrl} alt="Beeldvoorstel van AI" /></div><div className="feedback-choices"><button type="button" className={feedbackDirection === "keep" ? "is-selected" : ""} onClick={() => setFeedbackDirection("keep")}>Dit voelt passend</button><button type="button" className={feedbackDirection === "adjust" ? "is-selected" : ""} onClick={() => setFeedbackDirection("adjust")}>Ik wil iets veranderen</button><button type="button" className={feedbackDirection === "again" ? "is-selected" : ""} onClick={() => setFeedbackDirection("again")}>Ik wil opnieuw kijken</button><button type="button" className={feedbackDirection === "without" ? "is-selected" : ""} onClick={() => setFeedbackDirection("without")}>Ik wil zonder AI verder</button></div>{(feedbackDirection === "adjust" || feedbackDirection === "again") && <div className="feedback-followup"><p>Vertel wat je anders wilt zien.</p><textarea className="feedback-field" value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Schrijf wat je wilt veranderen." aria-label="Wat wil je veranderen" /><button type="button" className="secondary-button" disabled={isGenerating} onClick={() => void createAiImage(feedback, true)}>{isGenerating ? "beeld wordt gemaakt…" : "maak een nieuwe versie"}</button></div>}{feedbackDirection === "without" && <p className="feedback-followup">Je eigen bijdrage blijft over, zonder de toevoeging van AI.</p>}<div className="step-actions"><button type="button" className="quiet-button" onClick={() => setStep(2)}>terug</button><button type="button" className="primary-button" onClick={() => { if (feedbackDirection === "without") { setAiPath("none"); setAiImageDataUrl(""); } setStep(3); }}>verder</button></div></>}</> : <><div className="private-space"><span className="private-spark" aria-hidden="true" /><p>Voor {aiFormsSelected.map((form) => formNames[form]).join(", ")} is de keuze er al. De echte AI-uitwerking begint nu met beeld.</p></div><div className="step-actions"><button type="button" className="quiet-button" onClick={() => setStep(2)}>terug</button><button type="button" className="primary-button" onClick={() => setStep(3)}>verder</button></div></>}</div>}

    {step === 4 && <div><p className="eyebrow">4 van 5 · je rouwdier als kaartje</p><h1>Je rouwdier als kaartje</h1><p className="lead">We hebben alvast gebruikt wat je zelf hebt toegevoegd. Je kunt dit aanpassen, leegmaken of vervangen.</p><div className="card-editor"><CardPreview /><div className="card-fields"><label className="title-field">naam of klein woord <span>optioneel</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="bijvoorbeeld: De stekjes van oma" /></label><label className="title-field">wat wil je erbij zeggen? <span>optioneel</span><textarea value={cardDescription} onChange={(event) => setCardDescription(event.target.value)} placeholder="Schrijf wat je wilt meegeven." aria-label="Toelichting bij je rouwdier" /></label></div></div><div className="completion-actions"><button type="button" className="secondary-button" onClick={downloadCard}>bewaar als afbeelding</button>{audioUrl && <a className="secondary-button" href={audioUrl} download="geluidsopname.webm">bewaar geluidsopname</a>}</div><div className="step-actions"><button type="button" className="quiet-button" onClick={() => setStep(3)}>terug</button><button type="button" className="primary-button" onClick={() => setStep(5)}>kies waar het mag leven</button></div></div>}

    {step === 5 && <div><p className="eyebrow">5 van 5 · waar mag het leven?</p><h1>Waar mag deze bijdrage leven?</h1><p className="lead">Je bijdrage blijft anoniem.</p><div className="choice-list sharing-list"><button type="button" className={sharing === "take" ? "is-selected" : ""} onClick={() => { setSharing("take"); setIsPubliclyConfirmed(false); setShowConsentDetails(false); }}><strong>Ik neem het weer mee</strong><span>Er verschijnt niets in het landschap.</span></button><button type="button" className={sharing === "online" ? "is-selected" : ""} onClick={() => { setSharing("online"); setIsPubliclyConfirmed(false); setShowConsentDetails(false); }}><strong>Het mag in het online landschap leven</strong><span>Bezoekers kunnen jouw bijdrage daar openen.</span></button><button type="button" className={sharing === "here" ? "is-selected" : ""} onClick={() => { setSharing("here"); setIsPubliclyConfirmed(false); setShowConsentDetails(false); }}><strong>Het mag bij deze opstelling leven</strong><span>Naast het online landschap kan het hier bij deze opstelling worden getoond. Niet alle rouwdieren krijgen hier een plek.</span></button><button type="button" className={sharing === "future" ? "is-selected" : ""} onClick={() => { setSharing("future"); setIsPubliclyConfirmed(false); setShowConsentDetails(false); }}><strong>Het mag ook op andere plekken leven</strong><span>Ook niet alle rouwdieren worden elders getoond. Welke andere plekken dat zijn, is vooraf niet bekend.</span></button></div>{sharing !== "take" && <div className="consent-area"><label className="consent-field"><input type="checkbox" checked={isPubliclyConfirmed} onChange={(event) => setIsPubliclyConfirmed(event.target.checked)} /><span>Ik begrijp wat deze keuze inhoudt.</span></label><button type="button" className="consent-details-button" onClick={() => setShowConsentDetails(true)}>Lees de toelichting</button></div>}<p className="test-note">Als je kiest voor het online landschap, verschijnt je rouwdier daar meteen en kunnen anderen het openen.</p>{saveError && <p className="save-error" role="alert">{saveError}</p>}<div className="step-actions"><button type="button" className="quiet-button" onClick={() => setStep(4)}>terug</button><button type="button" className="primary-button" disabled={isSaving || (sharing !== "take" && !isPubliclyConfirmed)} onClick={() => void finishContribution()}>{isSaving ? "even toevoegen…" : "rond af"}</button></div>{showConsentDetails && <div className="consent-modal" role="dialog" aria-modal="true" aria-labelledby="consent-title"><section><button type="button" aria-label="Sluit toelichting" onClick={() => setShowConsentDetails(false)}>×</button><p>{consentDetails.title}</p><h2 id="consent-title">Wat houdt deze keuze in?</h2><div>{consentDetails.text}</div></section></div>}</div>}

    {step === 6 && <div className="make-intro completion"><p className="eyebrow">klaar</p><h1>{sharing === "take" ? "Je rouwdier blijft bij jou." : "Je rouwdier heeft nu een plek gekregen."}</h1><p className="lead">{sharing === "take" ? "Er is niets aan het landschap of een opstelling toegevoegd. Wil je wel die van anderen bekijken?" : "Je hebt aangegeven waar deze bijdrage eventueel mag leven."}</p><a className="primary-button" href={savedContributionId ? `/verken?landschap=${landscape.id}&nieuw=${encodeURIComponent(savedContributionId)}` : `/verken?landschap=${landscape.id}`}>{sharing === "take" ? `bekijk de rouwdieren van anderen in het ${landscape.name}` : `bekijk jouw rouwdier en dat van anderen in het ${landscape.name}`}</a></div>}
  </section></main>;
}
