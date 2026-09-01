import { NextResponse } from "next/server";
import { extraheerEisenBlok, extraheerTitel, htmlNaarTekst, vindVaardigheden } from "@/lib/extract";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { url } = (await req.json()) as { url?: string };
    if (!url || typeof url !== "string") {
      return NextResponse.json({ fout: "Plak een vacaturelink." }, { status: 400 });
    }
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ fout: "Dit is geen geldige URL." }, { status: 400 });
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ fout: "Alleen http(s)-links." }, { status: 400 });
    }

    const res = await fetch(parsed.toString(), {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ikzoekwerk/1.0; +https://github.com/muwattah/ikzoekwerk)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) {
      return NextResponse.json(
        { fout: `De pagina gaf status ${res.status}. Probeer de tekst te kopiëren als de site blokkeert.` },
        { status: 422 }
      );
    }
    const html = await res.text();
    const tekst = htmlNaarTekst(html);
    if (tekst.length < 80) {
      return NextResponse.json(
        {
          fout: "Er was te weinig tekst op de pagina (vaak door login of JavaScript). Plak de vacaturetekst handmatig.",
        },
        { status: 422 }
      );
    }
    const titel = extraheerTitel(html, parsed.toString());
    const eisen = extraheerEisenBlok(tekst);
    const vaardigheden = vindVaardigheden(tekst);
    return NextResponse.json({
      url: parsed.toString(),
      titel,
      tekst: tekst.slice(0, 20000),
      eisen: eisen.slice(0, 4000),
      vaardigheden,
    });
  } catch {
    return NextResponse.json(
      { fout: "De vacature kon niet worden geladen. Controleer de link of plak de tekst." },
      { status: 500 }
    );
  }
}
