"use client";

import { useMemo, useRef, useState } from "react";

type AdviesVak = {
  id: string;
  titel: string;
  toon: "schoonmaak" | "match" | "advies" | "let-op";
  punten: string[];
};

type Scan = {
  url: string;
  titel: string;
  tekst: string;
  eisen: string;
  vaardigheden: string[];
};

type Analyse = {
  matchScore: number;
  vacatureSamenvatting: string;
  gevondenVaardighedenVacature: string[];
  gevondenVaardighedenCv: string[];
  ontbrekendeVaardigheden: string[];
  aanwezigeVaardigheden: string[];
  vakken: AdviesVak[];
  principes: string[];
  cvTekst: string;
  cvBestandsnaam: string;
  bron: "heuristiek" | "llm";
};

const TOON: Record<AdviesVak["toon"], string> = {
  match: "Match",
  schoonmaak: "Opschonen",
  advies: "Alleen als het waar is",
  "let-op": "Grenzen",
};

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [handTekst, setHandTekst] = useState("");
  const [scan, setScan] = useState<Scan | null>(null);
  const [scanFout, setScanFout] = useState("");
  const [bezigScan, setBezigScan] = useState(false);

  const [bestand, setBestand] = useState<File | null>(null);
  const [analyse, setAnalyse] = useState<Analyse | null>(null);
  const [analyseFout, setAnalyseFout] = useState("");
  const [bezigAnalyse, setBezigAnalyse] = useState(false);

  const [schoon, setSchoon] = useState("");
  const [schoonBron, setSchoonBron] = useState("");
  const [schoonFout, setSchoonFout] = useState("");
  const [bezigSchoon, setBezigSchoon] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const vacatureTekst = scan?.tekst || handTekst;
  const vacatureTitel = scan?.titel || "";

  const scoreKleur = useMemo(() => {
    const s = analyse?.matchScore ?? 0;
    if (s >= 70) return "#1f6b3a";
    if (s >= 40) return "#8a4b12";
    return "#8a1f1f";
  }, [analyse]);

  async function scanVacature() {
    setScanFout("");
    setScan(null);
    setAnalyse(null);
    setSchoon("");
    if (handTekst.trim().length > 80 && !url.trim()) {
      setScan({
        url: "",
        titel: "Geplakte vacaturetekst",
        tekst: handTekst.trim(),
        eisen: handTekst.trim().slice(0, 2000),
        vaardigheden: [],
      });
      return;
    }
    if (!url.trim()) {
      setScanFout("Plak een vacaturelink of de vacaturetekst.");
      return;
    }
    setBezigScan(true);
    try {
      const res = await fetch("/api/scan-vacature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScanFout(data.fout || "Scannen mislukt.");
        return;
      }
      setScan(data);
    } catch {
      setScanFout("Netwerkfout bij het scannen. Plak de tekst als fallback.");
    } finally {
      setBezigScan(false);
    }
  }

  async function startAnalyse() {
    setAnalyseFout("");
    setAnalyse(null);
    setSchoon("");
    if (!vacatureTekst.trim()) {
      setAnalyseFout("Scan eerst een vacature of plak de tekst.");
      return;
    }
    if (!bestand) {
      setAnalyseFout("Upload je CV als document — geen link.");
      return;
    }
    setBezigAnalyse(true);
    try {
      const form = new FormData();
      form.append("cv", bestand);
      form.append("vacatureTekst", vacatureTekst);
      form.append("vacatureTitel", vacatureTitel);
      form.append("vacatureUrl", scan?.url || url);
      const res = await fetch("/api/analyse", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setAnalyseFout(data.fout || "Analyse mislukt.");
        return;
      }
      setAnalyse(data);
    } catch {
      setAnalyseFout("Netwerkfout bij de analyse.");
    } finally {
      setBezigAnalyse(false);
    }
  }

  async function maakSchoon() {
    if (!analyse?.cvTekst) return;
    setSchoonFout("");
    setBezigSchoon(true);
    try {
      const res = await fetch("/api/opschonen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvTekst: analyse.cvTekst,
          vacatureTekst,
          vacatureTitel,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSchoonFout(data.fout || "Opschonen mislukt.");
        return;
      }
      setSchoon(data.tekst);
      setSchoonBron(data.bron);
    } catch {
      setSchoonFout("Netwerkfout bij het opschonen.");
    } finally {
      setBezigSchoon(false);
    }
  }

  function downloadSchoon() {
    const blob = new Blob([schoon], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cv-opgeschoond.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <main>
      <header className="top">
        <div className="brand">
          <span className="mark">izw</span>
          <div>
            <strong>ikzoekwerk</strong>
            <p>Vacature erin. CV als document. Advies in vakken. Geen verzonnen feiten.</p>
          </div>
        </div>
        <ol className="stappen">
          <li className={scan ? "klaar" : ""}>1. Link</li>
          <li className={bestand ? "klaar" : ""}>2. CV</li>
          <li className={analyse ? "klaar" : ""}>3. Vakken</li>
          <li className={schoon ? "klaar" : ""}>4. Schoon</li>
        </ol>
      </header>

      <section className="hero">
        <p className="kicker">Eerlijke CV-hulp</p>
        <h1>
          Gooi de vacature erin.
          <em> Upload je CV.</em>
          Wij zeggen wat je wél mag aanpassen.
        </h1>
        <p className="lede">
          Geen nieuwe banen, diploma’s of skills uit de lucht. Wel: rommel eruit, structuur erin,
          en suggesties die je alleen overneemt als ze kloppen.
        </p>
      </section>

      <section className="grid-2">
        <article className="kaart">
          <h2>1. Vacature scannen</h2>
          <label htmlFor="url">Vacaturelink</label>
          <div className="rij">
            <input
              id="url"
              type="url"
              placeholder="https://…/vacature"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button type="button" className="primair" onClick={scanVacature} disabled={bezigScan}>
              {bezigScan ? "Scannen…" : "Scan link"}
            </button>
          </div>
          <label htmlFor="plak">Of plak de vacaturetekst</label>
          <textarea
            id="plak"
            rows={5}
            placeholder="Als de site blokkeert: kopieer de tekst hier."
            value={handTekst}
            onChange={(e) => setHandTekst(e.target.value)}
          />
          {scanFout ? <p className="fout">{scanFout}</p> : null}
          {scan ? (
            <div className="scan-ok">
              <p>
                <strong>{scan.titel}</strong>
              </p>
              {scan.url ? (
                <p className="muted klein">
                  Gescand: {scan.url}
                </p>
              ) : (
                <p className="muted klein">Geplakte tekst gebruikt</p>
              )}
              {scan.vaardigheden?.length ? (
                <p className="chips">
                  {scan.vaardigheden.slice(0, 10).map((v) => (
                    <span key={v}>{v}</span>
                  ))}
                </p>
              ) : null}
              <p className="muted preview">{(scan.eisen || scan.tekst).slice(0, 320)}…</p>
            </div>
          ) : null}
        </article>

        <article className="kaart">
          <h2>2. CV als document</h2>
          <p className="muted">PDF, Word (.docx) of .txt. Geen Drive-link, geen LinkedIn-URL.</p>
          <button type="button" className="drop" onClick={() => fileRef.current?.click()}>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={(e) => {
                setBestand(e.target.files?.[0] || null);
                setAnalyse(null);
                setSchoon("");
              }}
            />
            {bestand ? (
              <>
                <strong>{bestand.name}</strong>
                <span>{Math.round(bestand.size / 1024)} kB — klik om te wisselen</span>
              </>
            ) : (
              <>
                <strong>Sleep of kies je CV</strong>
                <span>Maximaal 8 MB</span>
              </>
            )}
          </button>
          <button
            type="button"
            className="primair breed"
            onClick={startAnalyse}
            disabled={bezigAnalyse}
          >
            {bezigAnalyse ? "CV lezen en vergelijken…" : "Vergelijk met de vacature"}
          </button>
          {analyseFout ? <p className="fout">{analyseFout}</p> : null}
        </article>
      </section>

      {analyse ? (
        <section className="resultaat">
          <div className="score-rij">
            <div className="score" style={{ "--score": `${analyse.matchScore}%`, color: scoreKleur } as React.CSSProperties}>
              <b>{analyse.matchScore}</b>
              <span>match</span>
            </div>
            <div>
              <h2>3. Wat je het beste aanpast</h2>
              <p className="muted">{analyse.vacatureSamenvatting}</p>
              <p className="muted klein">
                Bron: {analyse.bron === "llm" ? "taalmodel + regels" : "regelgebaseerde scan"} · bestand {analyse.cvBestandsnaam}
              </p>
            </div>
          </div>

          <div className="vakken">
            {analyse.vakken.map((vak) => (
              <article key={vak.id} className={`vak vak-${vak.toon}`}>
                <header>
                  <span>{TOON[vak.toon]}</span>
                  <h3>{vak.titel}</h3>
                </header>
                <ul>
                  {vak.punten.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="actie">
            <div>
              <h2>4. Laat het CV schonen</h2>
              <p className="muted">
                De knop herschikt en strakt alleen wat er al staat. Ontbrekende skills komen
                niet automatisch in het document.
              </p>
            </div>
            <button type="button" className="primair groot" onClick={maakSchoon} disabled={bezigSchoon}>
              {bezigSchoon ? "Bezig met schonen…" : "Verander het voor mij"}
            </button>
          </div>
          {schoonFout ? <p className="fout">{schoonFout}</p> : null}

          {schoon ? (
            <article className="kaart schoon-kaart">
              <header className="schoon-kop">
                <h3>Opgeschoonde versie</h3>
                <div className="rij">
                  <span className="muted klein">bron: {schoonBron || "heuristiek"}</span>
                  <button type="button" onClick={downloadSchoon}>
                    Download .txt
                  </button>
                  <button type="button" onClick={() => window.print()}>
                    Print / PDF
                  </button>
                </div>
              </header>
              <pre className="cv-out">{schoon}</pre>
            </article>
          ) : null}
        </section>
      ) : null}

      <footer>
        <p>
          ikzoekwerk voegt geen ervaring toe die niet in jouw document staat. Controleer de
          schone versie altijd zelf voordat je solliciteert.
        </p>
        <p>
          <a href="https://github.com/muwattah/ikzoekwerk">github.com/muwattah/ikzoekwerk</a>
        </p>
      </footer>
    </main>
  );
}
