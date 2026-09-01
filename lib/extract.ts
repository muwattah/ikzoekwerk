import * as cheerio from "cheerio";

const STOP = new Set([
  "de", "het", "een", "en", "van", "in", "op", "voor", "met", "aan", "te", "is",
  "dat", "die", "als", "bij", "om", "ook", "niet", "naar", "of", "je", "we",
  "ons", "onze", "uw", "jij", "jouw", "hij", "zij", "hun", "er", "dit", "deze",
  "wordt", "worden", "bent", "zijn", "was", "waren", "heb", "hebt", "heeft",
  "the", "and", "for", "you", "your", "with", "our", "are", "will", "this",
  "that", "from", "have", "has", "be", "to", "of", "a", "in", "on",
]);

export function htmlNaarTekst(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, nav, footer, header, iframe, svg").remove();
  const tekst = $("body").text() || $.root().text();
  return tekst.replace(/\s+/g, " ").trim().slice(0, 40000);
}

export function extraheerTitel(html: string, url: string): string {
  const $ = cheerio.load(html);
  const og = $('meta[property="og:title"]').attr("content");
  const title = $("title").first().text();
  const h1 = $("h1").first().text();
  const raw = (og || h1 || title || url).replace(/\s+/g, " ").trim();
  return raw.slice(0, 180);
}

export function keywordsUitTekst(tekst: string, extra: string[] = []): string[] {
  const woorden = (tekst.toLowerCase().match(/[a-zà-ÿ0-9+#.]{3,}/gi) || [])
    .map((w) => w.replace(/[.,;:]+$/g, ""));
  const teller = new Map<string, number>();
  for (const w of woorden) {
    if (STOP.has(w) || /^\d+$/.test(w)) continue;
    teller.set(w, (teller.get(w) || 0) + 1);
  }
  for (const e of extra) teller.set(e.toLowerCase(), (teller.get(e.toLowerCase()) || 0) + 3);

  return [...teller.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([w]) => w);
}

const VAARDIGHEID_PATRONEN = [
  /\b(javascript|typescript|python|java|c\#|c\+\+|php|ruby|go|rust|kotlin|swift)\b/gi,
  /\b(react|vue|angular|next\.?js|node\.?js|django|flask|spring|laravel)\b/gi,
  /\b(sql|postgres|mysql|mongodb|redis|elasticsearch)\b/gi,
  /\b(aws|azure|gcp|docker|kubernetes|terraform|ci\/cd|git)\b/gi,
  /\b(excel|powerpoint|word|sap|salesforce|jira|figma|photoshop)\b/gi,
  /\b(nederlands|engels|duits|frans|spaans)\b/gi,
  /\b(agile|scrum|kanban|lean|prince2|itil)\b/gi,
  /\b(projectleiding|projectmanagement|leidinggeven|coach|coachen)\b/gi,
  /\b(klantgericht|communicatie|onderhandelen|presenteren|rapporteren)\b/gi,
  /\b(rijbewijs|vca|bhv|ehbo|bbl|bol)\b/gi,
];

export function vindVaardigheden(tekst: string): string[] {
  const gevonden = new Set<string>();
  for (const p of VAARDIGHEID_PATRONEN) {
    const m = tekst.match(p) || [];
    for (const x of m) gevonden.add(x.toLowerCase());
  }
  return [...gevonden].slice(0, 30);
}

export function extraheerEisenBlok(tekst: string): string {
  const markers = [
    /wat we vragen[\s\S]{0,2500}/i,
    /wij vragen[\s\S]{0,2500}/i,
    /functie[\- ]?eisen[\s\S]{0,2500}/i,
    /requirements[\s\S]{0,2500}/i,
    /profiel[\s\S]{0,2500}/i,
    /jouw profiel[\s\S]{0,2500}/i,
    /wie zoeken we[\s\S]{0,2500}/i,
    /wat breng je mee[\s\S]{0,2500}/i,
  ];
  for (const m of markers) {
    const hit = tekst.match(m);
    if (hit) return hit[0].slice(0, 2000);
  }
  return tekst.slice(0, 2000);
}
