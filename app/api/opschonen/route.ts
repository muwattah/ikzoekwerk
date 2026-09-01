import { NextResponse } from "next/server";
import { analyseer, schoonCv } from "@/lib/analyse";
import { heeftLlm, herschrijfCv } from "@/lib/llm";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      cvTekst?: string;
      vacatureTekst?: string;
      vacatureTitel?: string;
    };
    const cvTekst = (body.cvTekst || "").trim();
    if (cvTekst.length < 40) {
      return NextResponse.json({ fout: "Geen CV-tekst om op te schonen." }, { status: 400 });
    }
    const vacatureTekst = body.vacatureTekst || "";
    const vacatureTitel = body.vacatureTitel || "";
    const basis = analyseer(vacatureTekst, cvTekst, vacatureTitel);

    let tekst = schoonCv(cvTekst, vacatureTitel, basis.aanwezigeVaardigheden);
    let bron: "heuristiek" | "llm" = "heuristiek";

    if (heeftLlm()) {
      try {
        const llm = await herschrijfCv(cvTekst, vacatureTekst, vacatureTitel);
        if (llm && llm.length > 80) {
          tekst =
            "CV — opgeschoonde versie\nGeen nieuwe feiten toegevoegd; alleen bestaande inhoud strakker gezet.\n\n" +
            llm.trim() +
            "\n";
          bron = "llm";
        }
      } catch {
        bron = "heuristiek";
      }
    }

    return NextResponse.json({ tekst, bron, aanwezigeVaardigheden: basis.aanwezigeVaardigheden });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Opschonen mislukt.";
    return NextResponse.json({ fout: msg }, { status: 500 });
  }
}
