import { NextResponse } from "next/server";
import { analyseer } from "@/lib/analyse";
import { tekstUitUpload } from "@/lib/bestand";
import { heeftLlm, verrijkAnalyse } from "@/lib/llm";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const bestand = form.get("cv");
    const vacatureTekst = String(form.get("vacatureTekst") || "");
    const vacatureTitel = String(form.get("vacatureTitel") || "");
    const vacatureUrl = String(form.get("vacatureUrl") || "");

    if (!vacatureTekst && !vacatureUrl) {
      return NextResponse.json({ fout: "Scan eerst een vacature of plak de tekst." }, { status: 400 });
    }
    if (!(bestand instanceof File) || bestand.size < 10) {
      return NextResponse.json({ fout: "Upload je CV als document (PDF, DOCX of TXT)." }, { status: 400 });
    }
    if (bestand.size > 8 * 1024 * 1024) {
      return NextResponse.json({ fout: "Bestand is groter dan 8 MB." }, { status: 400 });
    }

    const buf = Buffer.from(await bestand.arrayBuffer());
    const cvTekst = await tekstUitUpload(buf, bestand.name, bestand.type || "");
    if (cvTekst.length < 40) {
      return NextResponse.json(
        { fout: "Er kwam te weinig tekst uit het CV. Gebruik geen gescande foto-PDF." },
        { status: 422 }
      );
    }

    let resultaat = analyseer(vacatureTekst, cvTekst, vacatureTitel);
    let bron: "heuristiek" | "llm" = "heuristiek";
    if (heeftLlm()) {
      try {
        resultaat = await verrijkAnalyse(resultaat, vacatureTekst, cvTekst, vacatureTitel);
        bron = "llm";
      } catch {
        bron = "heuristiek";
      }
    }

    return NextResponse.json({
      ...resultaat,
      cvTekst,
      cvBestandsnaam: bestand.name,
      bron,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Analyse mislukt.";
    return NextResponse.json({ fout: msg }, { status: 500 });
  }
}
