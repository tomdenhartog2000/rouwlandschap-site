"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type InputMode = "write" | "photo" | "draw" | "voice";
type AiChoice = "none" | "one" | "many";
type SharingChoice = "take" | "online" | "both";

const inputs: Array<{ id: InputMode; title: string; text: string; symbol: string }> = [
  { id: "write", title: "Schrijven", text: "Een herinnering, zin, woord of iets dat nog geen vorm heeft.", symbol: "Aa" },
  { id: "photo", title: "Foto maken", text: "Van iets dat je bij je hebt, maakte of tegenkwam.", symbol: "◒" },
  { id: "draw", title: "Tekenen", text: "Een spoor, schets of vorm. Het hoeft niets voor te stellen.", symbol: "〰" },
  { id: "voice", title: "Inspreken", text: "Een verhaal, geluid, stilte of een paar woorden.", symbol: "◌" },
];

export default function MaakEenRouwdier() {
  const [step, setStep] = useState(0);
  const [modes, setModes] = useState<InputMode[]>(["write"]);
  const [words, setWords] = useState("");
  const [title, setTitle] = useState("");
  const [aiChoice, setAiChoice] = useState<AiChoice>("none");
  const [sharing, setSharing] = useState<SharingChoice>("take");
  const [feedback, setFeedback] = useState("");
  const [feedbackDirection, setFeedbackDirection] = useState<"keep" | "shift" | null>(null);
  const [isPubliclyConfirmed, setIsPubliclyConfirmed] = useState(false);
  const [photos, setPhotos] = useState<Array<{ name: string; url: string }>>([]);
  const [audioUrl, setAudioUrl] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [microphoneError, setMicrophoneError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const selectedInputs = inputs.filter((input) => modes.includes(input.id));
  const inputSummary = selectedInputs.map((input) => input.title.toLowerCase()).join(" + ");

  const toggleMode = (mode: InputMode) => {
    setModes((current) => {
      if (current.includes(mode)) return current.filter((item) => item !== mode);
      return [...current, mode];
    });
  };

  const drawAt = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const rect = canvas.getBoundingClientRect();
    const point = { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
    context.strokeStyle = "#2d4134";
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

  const beginDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawAt(event);
  };
  const continueDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => { if (drawing.current) drawAt(event); };
  const endDrawing = () => { drawing.current = false; lastPoint.current = null; };
  const clearDrawing = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
  };
  const addPhotos = (files?: FileList | null) => {
    if (!files?.length) return;
    setPhotos((current) => [...current, ...Array.from(files).map((file) => ({ name: file.name, url: URL.createObjectURL(file) }))]);
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
        setAudioUrl(URL.createObjectURL(new Blob(audioChunks.current, { type: recorder.mimeType || "audio/webm" })));
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
      };
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch { setMicrophoneError(true); }
  };
  const stopRecording = () => recorderRef.current?.stop();
  const chooseSharing = (choice: SharingChoice) => { setSharing(choice); setIsPubliclyConfirmed(false); };

  const renderInput = (mode: InputMode) => {
    const label = inputs.find((input) => input.id === mode)?.title;
    return (
      <div className="input-surface" key={mode}>
        <p className="surface-label">{label}</p>
        {mode === "write" && <textarea value={words} onChange={(event) => setWords(event.target.value)} placeholder="Begin waar je wilt…" aria-label="Schrijf iets over je rouwdier" />}
        {mode === "photo" && <div className="upload-area">
          {photos.length ? <div className="photo-previews">{photos.map((photo, index) => <figure key={photo.url} className="photo-preview-card"><img src={photo.url} alt={`Gekozen afbeelding ${index + 1}`} className="photo-preview" /><button type="button" onClick={() => removePhoto(photo.url)} aria-label={`Verwijder ${photo.name}`}>×</button></figure>)}</div> : <span className="upload-spark" aria-hidden="true" />}
          <div className="photo-actions">
            <label className="secondary-button">maak een foto<input type="file" accept="image/*" capture="environment" onChange={(event) => { addPhotos(event.target.files); event.currentTarget.value = ""; }} /></label>
            <label className="secondary-button">kies uit je foto’s<input type="file" accept="image/*" multiple onChange={(event) => { addPhotos(event.target.files); event.currentTarget.value = ""; }} /></label>
          </div>
          {photos.length > 0 && <small>{photos.length === 1 ? "1 foto toegevoegd" : `${photos.length} foto’s toegevoegd`}</small>}
        </div>}
        {mode === "draw" && <div className="drawing-area">
          <canvas ref={canvasRef} width="720" height="420" aria-label="Tekenruimte" onPointerDown={beginDrawing} onPointerMove={continueDrawing} onPointerUp={endDrawing} onPointerLeave={endDrawing} />
          <button className="clear-button" onClick={clearDrawing}>wis tekening</button>
        </div>}
        {mode === "voice" && <div className="voice-area">
          {!audioUrl && <p>Je opname blijft in deze test op je eigen toestel.</p>}
          {audioUrl && <audio controls src={audioUrl}>Je browser kan deze opname niet afspelen.</audio>}
          <button className={`record-button ${isRecording ? "is-recording" : ""}`} onClick={isRecording ? stopRecording : startRecording}>{isRecording ? "stop opname" : audioUrl ? "neem opnieuw op" : "begin met inspreken"}</button>
          {microphoneError && <small>De microfoon is niet beschikbaar. Je kunt ook schrijven, tekenen of een foto kiezen.</small>}
        </div>}
      </div>
    );
  };

  return (
    <main className="make-page">
      <header className="make-header"><a href="/" className="back-link">← terug naar het landschap</a><span className="make-mark" aria-hidden="true" /></header>
      <section className="make-card" aria-live="polite">
        {step === 0 && <div className="make-intro">
          <p className="eyebrow">een mogelijke vorm</p><h1>Geef een rouwdier ruimte.</h1>
          <p className="lead">Je hoeft niets af te maken, te verklaren of achter te laten. Je kunt ook gewoon kijken.</p>
          <button className="primary-button" onClick={() => setStep(1)}>begin wanneer je wilt</button>
        </div>}

        {step === 1 && <div>
          <p className="eyebrow">1 van 4 · een ingang kiezen</p><h1>Hoe wil je beginnen?</h1>
          <p className="lead">Tik op een vorm om hem toe te voegen of weer weg te halen. Je kunt er meerdere tegelijk kiezen.</p>
          <div className="input-options">{inputs.map((input) => { const isSelected = modes.includes(input.id); return <button key={input.id} aria-pressed={isSelected} className={`input-option ${isSelected ? "is-selected" : ""}`} onClick={() => toggleMode(input.id)}><span className="input-symbol" aria-hidden="true">{input.symbol}</span><span><strong>{input.title}</strong><small>{input.text}</small></span><span className="input-state">{isSelected ? "toegevoegd" : "voeg toe"}</span></button>; })}</div>
          {modes.length ? <div className="input-surfaces">{modes.map(renderInput)}</div> : <p className="empty-input-message">Kies minstens één vorm om verder te gaan.</p>}
          <div className="step-actions"><button className="quiet-button" onClick={() => setStep(0)}>terug</button><button className="primary-button" disabled={modes.length === 0} onClick={() => setStep(2)}>verder</button></div>
        </div>}

        {step === 2 && <div>
          <p className="eyebrow">2 van 4 · ruimte voor AI</p><h1>Wat mag de AI hiermee doen?</h1>
          <p className="lead">AI is een mogelijke manier van verder kijken, niet de definitie van je rouwdier.</p>
          <div className="choice-list">
            <button className={aiChoice === "none" ? "is-selected" : ""} onClick={() => setAiChoice("none")}><strong>Laat het zoals het is</strong><span>Geen AI-verwerking.</span></button>
            <button className={aiChoice === "one" ? "is-selected" : ""} onClick={() => setAiChoice("one")}><strong>Vraag om één mogelijke richting</strong><span>Een reactie die je mag herkennen, afwijzen of veranderen.</span></button>
            <button className={aiChoice === "many" ? "is-selected" : ""} onClick={() => setAiChoice("many")}><strong>Vraag om verschillende richtingen</strong><span>Een paar mogelijke manieren van verder kijken, zonder juiste uitkomst.</span></button>
          </div>
          <p className="test-note">In deze test wordt nog geen AI-reactie gemaakt. We onderzoeken eerst of deze keuze begrijpelijk en prettig voelt.</p>
          <div className="step-actions"><button className="quiet-button" onClick={() => setStep(1)}>terug</button><button className="primary-button" onClick={() => setStep(3)}>verder</button></div>
        </div>}

        {step === 3 && <div>
          <p className="eyebrow">3 van 4 · eerst alleen voor jou</p><h1>Ruimte om terug te praten.</h1>
          <p className="lead">Een mogelijke AI-reactie verschijnt straks eerst hier, alleen voor jou. Niets krijgt automatisch een vorm of plek in het landschap.</p>
          <div className="private-space"><span className="private-spark" aria-hidden="true" /><p>{aiChoice === "none" ? "Je hebt gekozen om zonder AI verder te gaan." : "In deze test verschijnt hier nog geen AI-reactie."}</p></div>
          <p className="feedback-question">Wat wil je erbij zeggen?</p>
          <div className="feedback-choices"><button className={feedbackDirection === "keep" ? "is-selected" : ""} onClick={() => setFeedbackDirection("keep")}>hier wil ik bij blijven</button><button className={feedbackDirection === "shift" ? "is-selected" : ""} onClick={() => setFeedbackDirection("shift")}>ik wil verder zoeken</button></div>
          <textarea className="feedback-field" value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Wat herken je wel, wat niet, of wat ontbreekt er nog?" aria-label="Jouw reactie" />
          <div className="step-actions"><button className="quiet-button" onClick={() => setStep(2)}>terug</button>{feedbackDirection === "shift" ? <button className="primary-button" onClick={() => { setFeedbackDirection(null); setStep(2); }}>kies een andere richting</button> : <button className="primary-button" onClick={() => setStep(4)}>verder</button>}</div>
        </div>}

        {step === 4 && <div>
          <p className="eyebrow">4 van 4 · wel of niet achterlaten</p><h1>Waar mag deze bijdrage leven?</h1>
          <p className="lead">Alles is anoniem. Een naam voor je rouwdier mag, maar hoeft niet.</p>
          <label className="title-field">naam of klein woord <span>optioneel</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="bijvoorbeeld: De stekjes van oma" /></label>
          <div className="choice-list sharing-list">
            <button className={sharing === "take" ? "is-selected" : ""} onClick={() => chooseSharing("take")}><strong>Ik neem het weer mee</strong><span>Er verschijnt niets in het landschap.</span></button>
            <button className={sharing === "online" ? "is-selected" : ""} onClick={() => chooseSharing("online")}><strong>Het mag anoniem in het landschap leven</strong><span>De vonk opent jouw bijdrage voor bezoekers.</span></button>
            <button className={sharing === "both" ? "is-selected" : ""} onClick={() => chooseSharing("both")}><strong>Het mag ook worden overwogen voor de fysieke tentoonstelling</strong><span>Naast de online mogelijkheid; dit is geen garantie dat het getoond wordt.</span></button>
          </div>
          {sharing !== "take" && <label className="consent-field"><input type="checkbox" checked={isPubliclyConfirmed} onChange={(event) => setIsPubliclyConfirmed(event.target.checked)} /><span>Ik begrijp dat bezoekers mijn bijdrage kunnen openen wanneer zij op de vonk klikken.</span></label>}
          <p className="test-note">Dit is een testsituatie: er wordt nu niets bewaard, doorgestuurd of tentoongesteld.</p>
          <div className="step-actions"><button className="quiet-button" onClick={() => setStep(3)}>terug</button><button className="primary-button" disabled={sharing !== "take" && !isPubliclyConfirmed} onClick={() => setStep(5)}>rond af</button></div>
        </div>}

        {step === 5 && <div className="make-intro completion">
          <span className="completion-spark" aria-hidden="true" /><p className="eyebrow">dank je</p><h1>{title ? `${title} heeft even ruimte gekregen.` : "Je vorm heeft even ruimte gekregen."}</h1>
          <p className="lead">In deze test blijft alles alleen op dit toestel. Er is niets opgeslagen of toegevoegd aan het landschap.</p>
          <div className="completion-summary"><span>{inputSummary}</span><span>{aiChoice === "none" ? "zonder AI" : aiChoice === "one" ? "één mogelijke AI-richting" : "meerdere AI-richtingen"}</span><span>{sharing === "take" ? "weer meenemen" : sharing === "online" ? "online laten leven" : "online + mogelijk fysiek"}</span></div>
          <a className="primary-button link-button" href="/">terug naar het landschap</a>
        </div>}
      </section>
    </main>
  );
}
