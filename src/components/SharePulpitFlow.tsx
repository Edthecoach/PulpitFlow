import { useRef, useState } from "react";
import { Copy, Download, QrCode, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const SITE_URL = "https://pulpitflow.netlify.app/";

export default function SharePulpitFlow() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(SITE_URL);
      setMessage("Link copied. Share it with someone who could use PulpitFlow.");
    } catch {
      setMessage("Copy the website address below to share PulpitFlow.");
    }
  }

  function downloadCode() {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const url = URL.createObjectURL(new Blob(
      [new XMLSerializer().serializeToString(svg)],
      { type: "image/svg+xml;charset=utf-8" }
    ));
    const link = document.createElement("a");
    link.href = url;
    link.download = "pulpitflow-qr-code.svg";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("QR code downloaded. Add it to a flyer, slide, or invitation.");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setMessage(""); dialogRef.current?.showModal(); }}
        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-amber-50 text-amber-800 transition-colors focus-visible:outline-2 focus-visible:outline-amber-800"
        title="Share PulpitFlow with a QR code"
        aria-label="Share PulpitFlow with a QR code"
      >
        <QrCode className="w-4 h-4" />
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="share-pulpitflow-title"
        aria-describedby="share-pulpitflow-description"
        className="m-auto w-[calc(100%-2rem)] max-w-sm max-h-[90dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-xl backdrop:bg-slate-900/50 select-text"
        onClick={(event) => {
          event.stopPropagation();
          if (event.target === event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
              dialogRef.current?.close();
            }
          }
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-800 mb-2">Pass it along</p>
            <h2 id="share-pulpitflow-title" className="font-display text-xl font-bold text-slate-900">Share PulpitFlow</h2>
          </div>
          <button type="button" autoFocus onClick={() => dialogRef.current?.close()} aria-label="Close share dialog" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-amber-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p id="share-pulpitflow-description" className="mt-3 text-sm leading-relaxed text-slate-600">Know someone preparing their next sermon? Invite them to try PulpitFlow. Scan this code with a phone camera to get started.</p>
        <div ref={qrRef} className="my-5 flex justify-center rounded-xl border border-amber-100 bg-amber-50/50 p-3">
          <QRCodeSVG value={SITE_URL} size={232} level="M" marginSize={4} bgColor="#ffffff" fgColor="#0f172a" title="Scan to open PulpitFlow at https://pulpitflow.netlify.app/" className="max-w-full h-auto" />
        </div>
        <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="block text-center text-sm text-amber-800 underline underline-offset-4 break-all">pulpitflow.netlify.app</a>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={copyLink} className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-amber-800"><Copy className="w-4 h-4" />Copy link</button>
          <button type="button" onClick={downloadCode} className="flex items-center justify-center gap-2 rounded-lg bg-amber-800 px-3 py-2.5 text-xs font-semibold text-white hover:bg-amber-900 focus-visible:outline-2 focus-visible:outline-amber-800"><Download className="w-4 h-4" />Download QR</button>
        </div>
        <p role="status" className="mt-3 text-xs leading-relaxed text-slate-500">{message || "Share this invitation with other pastors and ministry leaders."}</p>
      </dialog>
    </>
  );
}
