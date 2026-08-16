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
  const [mode, setMode] = useState<InputMode>("write");
  const [words, setWords] = useState("");
  const [title, setTitle] = useState("");
  const [aiChoice, setAiChoice] = useState<AiChoice>("none");
  const [sharing, setSharing] = useState<SharingChoice>("take");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [microphoneError, setMicrophoneError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const drawAt = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    const point = {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };

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

  const continueDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drawing.current) drawAt(event);
  };

  const endDrawing = () => {
    drawing.current = false;
    lastPoint.current = null;
  };

  const clearDrawing = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handlePhoto = (file?: File) => {
    if (!file) return;
    setPhotoName(file.name);
    setPhotoUrl(URL.createObjectURL(file));
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
        setAudioUrl(URL.createObjectURL(recording));
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
      };
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setMicrophoneError(true);
    }
  };

  const stopRecording = () => recorderRef.current?.stop();
  const activeInput = inputs.find((input) => input.id === mode) ?? inputs[0];

  return (
    <main className="make-page">
      <header className="make-header">
        <a href="/" className="back-link">← terug naar het landschap</a>
        <span className="make-mark" aria-hidden="true" />
      </header>

      <section className="make-card" aria-live="polite">
        {step === 0 && (
          <div className="make-intro">
            <p className="eyebrow">een mogelijke vorm</p>
            <h1>Geef een rouwdier ruimte.</h1>
            <p className="lead">Je hoeft niets af te maken, te verklaren of achter te laten. Je kunt ook gewoon kijken.</p>
            <button className="primary-button" onClick={() => setStep(1)}>begin wanneer je wilt</button>
          </div>
        )}

        {step === 1 && (
          <div>
            <p className="eyebrow">1 van 3 · een ingang kiezen</p>
            <h1>Hoe wil je beginnen?</h1>
            <p className="lead">Kies een vorm die nu past. Je kunt later iets anders kiezen of stoppen.</p>
            <div className="input-options">
              {inputs.map((input) => (
                <button key={input.id} className={`input-option ${mode === input.id ? "is-selected" : ""}`} onClick={() => setMode(input.id)}>
                  <span className="input-symbol" aria-hidden="true">{input.symbol}</span>
                  <span><strong>{input.title}</strong><small>{input.text}</small></span>
                </button>
              ))}
            </div>

            <div className="input-surface">
              <p className="surface-label">{activeInput.title}</p>
              {mode === "write" && <textarea value={words} onChange={(event) => setWords(event.target.value)} placeholder="Begin waar je wilt…" aria-label="Schrijf iets over je rouwdier" />}
              {mode === "photo" && (
                <div className="upload-area">
                  {photoUrl ? <img src={photoUrl} alt="Gekozen afbeelding" className="photo-preview" /> : <span className="upload-spark" aria-hidden="true" />}
                  <label className="secondary-button">maak of kies een foto<input type="file" accept="image/*" capture="environment" onChange={(event) => handlePhoto(event.target.files?.[0])} /></label>
                  {photoName && <small>{photoName}</small>}
                </div>
              )}
              {mode === "draw" && (
                <div className="drawing-area">
                  <canvas ref={canvasRef} width="720" height="420" aria-label="Tekenruimte" onPointerDown={beginDrawing} onPointerMove={continueDrawing} onPointerUp={endDrawing} onPointerLeave={endDrawing} />
                  <button className="clear-button" onClick={clearDrawing}>wis tekening</button>
                </div>
              )}
              {mode === "voice" && (
                <div className="voice-area">
                  {!audioUrl && <p>Je opname blijft in deze test op je eigen toestel.</p>}
                  {audioUrl && <audio controls src={audioUrl}>Je browser kan deze opname niet afspelen.</audio>}
                  <button className={`record-button ${isRecording ? "is-recording" : ""}`} onClick={isRecording ? stopRecording : startRecording}>{isRecording ? "stop opname" : audioUrl ? "neem opnieuw op" : "begin met inspreken"}</button>
                  {microphoneError && <small>De microfoon is niet beschikbaar. Je kunt ook schrijven, tekenen of een foto kiezen.</small>}
                </div>
              )}
            </div>
            <div className="step-actions"><button className="quiet-button" onClick={() => setStep(0)}>terug</button><button className="primary-button" onClick={() => setStep(2)}>verder</button></div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="eyebrow">2 van 3 · ruimte voor AI</p>
            <h1>Wat mag er met je vorm gebeuren?</h1>
            <p className="lead">AI is hier een mogelijke manier van verder kijken, niet de definitie van je rouwdier.</p>
            <div className="choice-list">
              <button className={aiChoice === "none" ? "is-selected" : ""} onClick={() => setAiChoice("none")}><strong>Laat het zoals het is</strong><span>Geen AI-verwerking.</span></button>
              <button className={aiChoice === "one" ? "is-selected" : ""} onClick={() => setAiChoice("one")}><strong>Vraag om één mogelijke vorm</strong><span>Een voorstel dat je mag herkennen, afwijzen of veranderen.</span></button>
              <button className={aiChoice === "many" ? "is-selected" : ""} onClick={() => setAiChoice("many")}><strong>Vraag om meerdere mogelijke vormen</strong><span>Verschillende richtingen, zonder dat één ervan de juiste hoeft te zijn.</span></button>
            </div>
            <p className="test-note">In deze eerste test wordt nog geen AI-uitvoer gemaakt. We onderzoeken eerst of deze keuze begrijpelijk en prettig voelt.</p>
            <div className="step-actions"><button className="quiet-button" onClick={() => setStep(1)}>terug</button><button className="primary-button" onClick={() => setStep(3)}>verder</button></div>
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="eyebrow">3 van 3 · iets wel of niet achterlaten</p>
            <h1>Waar mag deze vorm leven?</h1>
            <p className="lead">Alles is anoniem. Een naam voor je rouwdier mag, maar hoeft niet.</p>
            <label className="title-field">naam of klein woord <span>optioneel</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="bijvoorbeeld: De stekjes van oma" /></label>
            <div className="choice-list sharing-list">
              <button className={sharing === "take" ? "is-selected" : ""} onClick={() => setSharing("take")}><strong>Ik neem het weer mee</strong><span>Er blijft niets in het landschap achter.</span></button>
              <button className={sharing === "online" ? "is-selected" : ""} onClick={() => setSharing("online")}><strong>Het mag anoniem online leven</strong><span>Als klein rouwdier in een passend landschap.</span></button>
              <button className={sharing === "both" ? "is-selected" : ""} onClick={() => setSharing("both")}><strong>Het mag ook worden overwogen voor de fysieke tentoonstelling</strong><span>Naast de online mogelijkheid; dit is geen garantie dat het getoond wordt.</span></button>
            </div>
            <p className="test-note">Dit is een testsituatie: er wordt nu niets bewaard, doorgestuurd of tentoongesteld.</p>
            <div className="step-actions"><button className="quiet-button" onClick={() => setStep(2)}>terug</button><button className="primary-button" onClick={() => setStep(4)}>rond af</button></div>
          </div>
        )}

        {step === 4 && (
          <div className="make-intro completion">
            <span className="completion-spark" aria-hidden="true" />
            <p className="eyebrow">dank je</p>
            <h1>{title ? `${title} heeft even ruimte gekregen.` : "Je vorm heeft even ruimte gekregen."}</h1>
            <p className="lead">In deze test blijft alles alleen op dit toestel. Er is niets opgeslagen of toegevoegd aan het landschap.</p>
            <div className="completion-summary"><span>{activeInput.title.toLowerCase()}</span><span>{aiChoice === "none" ? "zonder AI" : aiChoice === "one" ? "één mogelijke AI-vorm" : "meerdere mogelijke AI-vormen"}</span><span>{sharing === "take" ? "weer meenemen" : sharing === "online" ? "online achterlaten" : "online + mogelijk fysiek"}</span></div>
            <a className="primary-button link-button" href="/">terug naar het landschap</a>
          </div>
        )}
      </section>
    </main>
  );
}
