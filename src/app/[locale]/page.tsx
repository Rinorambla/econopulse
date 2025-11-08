"use client";
export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
      <h1 className="text-4xl font-bold mb-4">EconoPulse</h1>
      <p className="text-white/70 max-w-md text-center mb-6">
        Minimal diagnostic homepage. Stiamo isolando il problema. Se vedi questa pagina, il rendering base funziona.
      </p>
      <a href="/pricing" className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-700 transition">Pricing</a>
    </div>
  );
}
