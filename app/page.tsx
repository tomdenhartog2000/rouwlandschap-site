export const metadata = {
  title: "Testlandschap",
  description: "Een landschap waarin rouwdieren als kleine vonkjes leven.",
};

export default function Home() {
  return (
    <main className="landscape-shell">
      <iframe
        className="landscape-frame"
        src="/landschap.html"
        title="Interactief Testlandschap"
        allow="fullscreen"
      />
    </main>
  );
}
