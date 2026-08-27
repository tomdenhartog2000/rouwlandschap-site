"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type InputMode = "write" | "photo" | "draw" | "voice" | "reference";
type AiPath = "none" | "together" | "translate";
type AiForm = "image" | "text" | "sound" | "motion";
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
  { id: "text", title: "Tekst", text: "Een korte tekstuele reactie." },
  { id: "sound", title: "Klank", text: "Een korte klank bij jouw bijdrage." },
  { id: "motion", title: "Beweging", text: "Een subtiele beweging, zonder dat het een video wordt." },
];

const formNames: Record<AiForm, string> = { image: "beeld", text: "tekst", sound: "klank", motion: "beweging" };

function firstUsefulLine(value: string) {
  return value.split("\n").map((line) => line.trim()).find(Boolean) ?? "";
}

export default function MaakEenRouwdier() {
  const [step, setStep] = useState(1);
  const [modes, setModes] = useState<InputMode[]>([]);
  const [words, setWords] = useState("");
  const [careReflection, setCareReflection] = useState("");
  const [reference, setReference] = useState("");
  const [referenceLink, setReferenceLink] = useState("");
  const [photos, setPhotos] = useState<Array<{ name: string; url: string; dataUrl: string }>>([]);
  const [audioUrl, setAudioUrl] = useState("");
  const [drawingDataUrl, setDrawingDataUrl] = useState("");
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

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
      recorder.onstop = () => { setAudioUrl(URL.createObjectURL(new Blob(audioChunks.current, { type: recorder.mimeType || "audio/webm" }))); stream.getTracks().forEach((track) => track.stop()); setIsRecording(false); };
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch { setMicrophoneError(true); }
  };
  const stopRecording = () => recorderRef.current?.stop();
  const prepareCard = () => { if (!title.trim() && titleSuggestion) setTitle(titleSuggestion); if (!cardDescription.trim() && descriptionSuggestion) setCardDescription(descriptionSuggestion); setStep(4); };
  const finishContribution = () => {
    if (sharing !== "take") {
      const existing = JSON.parse(window.localStorage.getItem("rouwdieren-testbijdragen") || "[]") as Array<unknown>;
      const addition = {
        id: `${Date.now()}`,
        title: visibleTitle,
        description: visibleDescription || words || careReflection,
        kind: modes.includes("voice") ? "Geluidsopname" : modes.includes("draw") ? "Tekening" : modes.includes("photo") ? "Foto" : modes.includes("reference") ? "Verwijzing" : "Tekst",
        image: photos[0]?.dataUrl || drawingDataUrl || "",
        x: 28 + ((existing.length * 17 + 11) % 46),
        y: 25 + ((existing.length * 13 + 7) % 48),
      };
      window.localStorage.setItem("rouwdieren-testbijdragen", JSON.stringify([...existing, addition]));
    }
    setStep(6);
  };

  const renderInput = (mode: InputMode) => {
    const label = inputs.find((input) => input.id === mode)?.title;
    return <div className="input-surface" key={mode}>
      <p className="surface-label">{label}</p>
      {mode === "write" && <textarea value={words} onChange={(event) => setWords(event.target.value)} placeholder="Begin waar je wilt…" aria-label="Schrijf iets over je rouwdier" />}
      {mode === "reference" && <div className="reference-area"><label>wat wil je aanwijzen?<textarea value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Een titel, zin, plek, liedje of gezegde…" aria-label="Wat wil je aanwijzen" /></label><label>link <span>optioneel</span><input type="url" value={referenceLink} onChange={(event) => setReferenceLink(event.target.value)} placeholder="Waar is het te vinden?" aria-label="Link naar de verwijzing" /></label><p>De verwijzing blijft van jou. De AI zoekt niets automatisch op.</p></div>}
      {mode === "photo" && <div className="upload-area">{photos.length ? <div className="photo-previews">{photos.map((photo, index) => <figure key={photo.url} className="photo-preview-card"><img src={photo.url} alt={`Gekozen afbeelding ${index + 1}`} className="photo-preview" /><button type="button" onClick={() => removePhoto(photo.url)} aria-label={`Verwijder ${photo.name}`}>×</button></figure>)}</div> : <span className="upload-spark" aria-hidden="true" />}<div className="photo-actions"><label className="secondary-button">maak een foto<input type="file" accept="image/*" capture="environment" onChange={(event) => { addPhotos(event.target.files); event.currentTarget.value = ""; }} /></label><label className="secondary-button">kies uit je foto’s<input type="file" accept="image/*" multiple onChange={(event) => { addPhotos(event.target.files); event.currentTarget.value = ""; }} /></label></div>{photos.length > 0 && <small>{photos.length === 1 ? "1 foto toegevoegd" : `${photos.length} foto’s toegevoegd`}</small>}</div>}
      {mode === "draw" && <div className="drawing-area"><canvas ref={canvasRef} width="720" height="420" aria-label="Tekenruimte" onPointerDown={beginDrawing} onPointerMove={continueDrawing} onPointerUp={endDrawing} onPointerLeave={endDrawing} /><button type="button" className="clear-button" onClick={clearDrawing}>wis tekening</button></div>}
      {mode === "voice" && <div className="voice-area">{!audioUrl && <p>Je opname blijft in deze test op je eigen toestel.</p>}{audioUrl && <audio controls src={audioUrl}>Je browser kan deze opname niet afspelen.</audio>}<button type="button" className={`record-button ${isRecording ? "is-recording" : ""}`} onClick={isRecording ? stopRecording : startRecording}>{isRecording ? "stop opname" : audioUrl ? "neem opnieuw op" : "begin opname"}</button>{microphoneError && <small>De microfoon is niet beschikbaar. Je kunt ook schrijven, tekenen of een foto kiezen.</small>}</div>}
    </div>;
  };

  const CardPreview = ({ compact = false }: { compact?: boolean }) => <article className={`rouwdier-card ${compact ? "is-compact" : ""}`} aria-label="Voorvertoning van je rouwdierkaartje"><p className="card-kicker">rouwdier</p><h2>{visibleTitle}</h2>{photos[0] && <img className="card-image" src={photos[0].url} alt="Jouw gekozen afbeelding" />}{!photos[0] && drawingDataUrl && <img className="card-image card-drawing" src={drawingDataUrl} alt="Jouw tekening" />}{!photos[0] && !drawingDataUrl && audioUrl && <div className="audio-cover"><span>geluidsopname</span><i aria-hidden="true" /></div>}{!photos[0] && !drawingDataUrl && !audioUrl && words && <p className="card-words">{words}</p>}{audioUrl && <audio className="card-audio" controls src={audioUrl}>Je browser kan deze opname niet afspelen.</audio>}{visibleDescription && <p className="card-description">{visibleDescription}</p>}{referenceLink && <p className="card-reference">verwijzing toegevoegd</p>}</article>;

  return <main className="make-page"><header className="make-header"><a href="/verken" className="back-link">← terug naar het landschap</a></header><section className="make-card" aria-live="polite">
    {step === 1 && <div><p className="eyebrow">1 van 5 · iets meenemen</p><h1>Wat wil je meenemen?</h1><p className="lead">Een rouwdier kan beginnen bij iets kleins. Je kunt één vorm kiezen, of verschillende dingen samenbrengen.</p><div className="input-options">{inputs.map((input) => { const isSelected = modes.includes(input.id); return <button type="button" key={input.id} aria-pressed={isSelected} className={`input-option ${isSelected ? "is-selected" : ""}`} onClick={() => toggleMode(input.id)}><span className={`input-symbol ${input.symbol === "camera" ? "input-symbol-camera" : input.symbol === "microphone" ? "input-symbol-microphone" : ""}`} aria-hidden="true">{input.symbol !== "camera" && input.symbol !== "microphone" ? input.symbol : <span />}</span><span><strong>{input.title}</strong><small>{input.text}</small></span><span className="input-state">{isSelected ? "toegevoegd" : "voeg toe"}</span></button>; })}</div>{modes.length ? <div className="input-surfaces">{modes.map(renderInput)}</div> : <p className="empty-input-message">Je kunt iets kiezen, of meteen verdergaan.</p>}<div className="step-actions"><a className="quiet-button" href="/">terug</a><button type="button" className="primary-button" onClick={() => setStep(2)}>verder</button></div></div>}

    {step === 3 && <div><p className="eyebrow">3 van 5 · even stilstaan</p><h1>Kan je toelichten wat dit met jou doet? En vraagt jouw rouwdier iets van je?</h1><textarea className="feedback-field care-field" value={careReflection} onChange={(event) => setCareReflection(event.target.value)} placeholder="Als je wil kun je hier iets over schrijven." aria-label="Toelichting over wat dit met jou doet en wat jouw rouwdier vraagt" /><p className="skip-note">Je kunt ook meteen verder.</p><div className="step-actions"><button type="button" className="quiet-button" onClick={() => setStep(hasAi ? 21 : 2)}>terug</button><button type="button" className="primary-button" onClick={prepareCard}>verder</button></div></div>}

    {step === 2 && <div><p className="eyebrow">2 van 5 · vormgeven</p><h1>Wat wil je nu met je rouwdier doen?</h1><p className="lead">Je kunt zelf verdergaan, iets samen met AI maken, of AI vragen jouw input naar een andere vorm te vertalen.</p><div className="choice-list"><button type="button" className={aiPath === "none" ? "is-selected" : ""} onClick={() => { setAiPath("none"); setAiFormsSelected([]); }}><strong>Ik wil zelf verder</strong><span>Je rouwdier blijft zoals het nu is. Je kunt er zelf nog iets aan toevoegen.</span></button><button type="button" className={aiPath === "together" ? "is-selected" : ""} onClick={() => setAiPath("together")}><strong>Ik wil samen met AI verder werken</strong><span>AI kan iets toevoegen, veranderen of ergens op reageren. Jij bepaalt wat er gebeurt.</span></button><button type="button" className={aiPath === "translate" ? "is-selected" : ""} onClick={() => setAiPath("translate")}><strong>Ik wil AI mijn input laten vertalen</strong><span>AI maakt een nieuwe vorm vanuit wat jij hebt ingebracht.</span></button></div>{hasAi && <div className="ai-form-area"><p className="feedback-question">{aiPath === "together" ? "Wat mag AI aan jouw bijdrage toevoegen?" : "Welke vormen wil je verkennen?"}</p><p className="option-explainer">{aiPath === "together" ? "Je kunt meerdere vormen kiezen. Jouw eigen bijdrage blijft het vertrekpunt." : "Je kunt er meerdere kiezen. AI maakt er een samenhangend voorstel van."}</p><div className="choice-list">{aiForms.map((form) => <button type="button" key={form.id} className={aiFormsSelected.includes(form.id) ? "is-selected" : ""} onClick={() => toggleAiForm(form.id)}><strong>{form.title}</strong><span>{form.id === "motion" && aiPath === "translate" ? "Een laag die samen kan gaan met beeld, tekst of klank." : form.text}</span></button>)}</div></div>}{hasAi && <p className="test-note">In deze test verschijnt nog geen echte AI-uitvoer. We testen hier de keuze en de plek die AI in de ervaring krijgt.</p>}<div className="step-actions"><button type="button" className="quiet-button" onClick={() => setStep(1)}>terug</button><button type="button" className="primary-button" disabled={hasAi && !aiFormsSelected.length} onClick={() => hasAi ? setStep(21) : setStep(3)}>verder</button></div></div>}

    {step === 21 && <div><p className="eyebrow">2 van 5 · vormgeven</p><h1>Kijk even naar wat er is ontstaan.</h1><p className="lead">Straks beslis je wat ermee gebeurt. Je hoeft niets te delen als je dat niet wilt.</p><div className="private-space"><span className="private-spark" aria-hidden="true" /><p>In deze test verschijnt hier nog geen AI-uitvoer. In de uiteindelijke ervaring zie je hier eerst alleen voor jezelf een voorstel met {aiFormsSelected.map((form) => formNames[form]).join(", ")}.</p></div><div className="feedback-choices"><button type="button" className={feedbackDirection === "keep" ? "is-selected" : ""} onClick={() => setFeedbackDirection("keep")}>Dit voelt passend</button><button type="button" className={feedbackDirection === "adjust" ? "is-selected" : ""} onClick={() => setFeedbackDirection("adjust")}>Ik wil iets veranderen</button><button type="button" className={feedbackDirection === "again" ? "is-selected" : ""} onClick={() => setFeedbackDirection("again")}>Ik wil opnieuw kijken</button><button type="button" className={feedbackDirection === "without" ? "is-selected" : ""} onClick={() => setFeedbackDirection("without")}>Ik wil zonder AI verder</button></div>{feedbackDirection === "adjust" && <div className="feedback-followup"><p>Vertel wat er in je opkomt. Je hoeft nog niet te weten hoe het moet worden.</p><textarea className="feedback-field" value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Schrijf wat je wilt veranderen." aria-label="Wat wil je veranderen" /></div>}{feedbackDirection === "again" && <div className="feedback-followup"><p>AI maakt een andere versie vanuit dezelfde bijdrage.</p><textarea className="feedback-field" value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Wat wil je deze keer anders onderzoeken?" aria-label="Wat wil je anders proberen" /></div>}{feedbackDirection === "without" && <p className="feedback-followup">Je eigen bijdrage blijft over, zonder de toevoeging van AI.</p>}<div className="step-actions"><button type="button" className="quiet-button" onClick={() => setStep(2)}>terug</button><button type="button" className="primary-button" onClick={() => { if (feedbackDirection === "without") setAiPath("none"); setStep(3); }}>{feedbackDirection === "again" ? "kijk opnieuw" : feedbackDirection === "adjust" ? "ga verder met deze richting" : "verder"}</button></div></div>}

    {step === 4 && <div><p className="eyebrow">4 van 5 · je rouwdier als kaartje</p><h1>Je rouwdier als kaartje</h1><p className="lead">We hebben alvast gebruikt wat je zelf hebt toegevoegd. Je kunt dit aanpassen, leegmaken of vervangen.</p><div className="card-editor"><CardPreview /><div className="card-fields"><label className="title-field">naam of klein woord <span>optioneel</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="bijvoorbeeld: De stekjes van oma" /></label><label className="title-field">wat wil je erbij zeggen? <span>optioneel</span><textarea value={cardDescription} onChange={(event) => setCardDescription(event.target.value)} placeholder="Schrijf wat je wilt meegeven." aria-label="Toelichting bij je rouwdier" /></label></div></div><div className="step-actions"><button type="button" className="quiet-button" onClick={() => setStep(3)}>terug</button><button type="button" className="primary-button" onClick={() => setStep(5)}>verder</button></div></div>}

    {step === 5 && <div><p className="eyebrow">5 van 5 · waar mag het leven?</p><h1>Waar mag deze bijdrage leven?</h1><p className="lead">Je bijdrage blijft anoniem. Je kunt hem straks ook zelf bewaren en downloaden.</p><CardPreview compact /><div className="choice-list sharing-list"><button type="button" className={sharing === "take" ? "is-selected" : ""} onClick={() => { setSharing("take"); setIsPubliclyConfirmed(false); setShowConsentDetails(false); }}><strong>Ik neem het weer mee</strong><span>Er verschijnt niets in het landschap.</span></button><button type="button" className={sharing === "online" ? "is-selected" : ""} onClick={() => { setSharing("online"); setIsPubliclyConfirmed(false); setShowConsentDetails(false); }}><strong>Het mag in het online landschap leven</strong><span>Bezoekers kunnen jouw bijdrage daar openen.</span></button><button type="button" className={sharing === "here" ? "is-selected" : ""} onClick={() => { setSharing("here"); setIsPubliclyConfirmed(false); setShowConsentDetails(false); }}><strong>Het mag bij deze opstelling leven</strong><span>Naast het online landschap kan het hier bij deze opstelling worden getoond. Niet alle rouwdieren krijgen hier een plek.</span></button><button type="button" className={sharing === "future" ? "is-selected" : ""} onClick={() => { setSharing("future"); setIsPubliclyConfirmed(false); setShowConsentDetails(false); }}><strong>Het mag ook op andere plekken leven</strong><span>Ook niet alle rouwdieren worden elders getoond. Welke andere plekken dat zijn, is vooraf niet bekend.</span></button></div>{sharing !== "take" && <div className="consent-area"><label className="consent-field"><input type="checkbox" checked={isPubliclyConfirmed} onChange={(event) => setIsPubliclyConfirmed(event.target.checked)} /><span>Ik begrijp wat deze keuze inhoudt.</span></label><button type="button" className="consent-details-button" onClick={() => setShowConsentDetails(true)}>Lees de toelichting</button></div>}<p className="test-note">In deze test verschijnt een bijdrage alleen op dit toestel in het landschap.</p><div className="step-actions"><button type="button" className="quiet-button" onClick={() => setStep(4)}>terug</button><button type="button" className="primary-button" disabled={sharing !== "take" && !isPubliclyConfirmed} onClick={finishContribution}>rond af</button></div>{showConsentDetails && <div className="consent-modal" role="dialog" aria-modal="true" aria-labelledby="consent-title"><section><button type="button" aria-label="Sluit toelichting" onClick={() => setShowConsentDetails(false)}>×</button><p>{consentDetails.title}</p><h2 id="consent-title">Wat houdt deze keuze in?</h2><div>{consentDetails.text}</div></section></div>}</div>}

    {step === 6 && <div className="make-intro completion"><p className="eyebrow">je rouwdier</p><h1>Je kunt je rouwdier nu zelf bewaren.</h1><p className="lead">De download bevat het samengestelde kaartje met wat je zelf hebt gemaakt, toegevoegd of aangewezen.</p><CardPreview compact /><div className="completion-actions"><button type="button" className="primary-button" onClick={() => window.print()}>bewaar als kaartje</button>{audioUrl && <a className="secondary-button" href={audioUrl} download="geluidsopname.webm">bewaar geluidsopname</a>}</div><p className="completion-note">{sharing === "take" ? "Er is niets aan het landschap of een opstelling toegevoegd." : "Je hebt aangegeven waar deze bijdrage eventueel mag leven."}</p><a className="quiet-button" href="/verken">terug naar het landschap</a></div>}
  </section></main>;
}
