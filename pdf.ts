import fs from "fs";
import pdf from "pdf-parse";

type PluData = {
  plu: string;
  name: string;
  size?: string;
};

export async function parsePluPdf(pdfFilename: string): Promise<Map<string, PluData[]>> {
  const dataBuffer = fs.readFileSync(pdfFilename);
  const { text: pdfDataText } = await pdf(dataBuffer);

  const lines = pdfDataText.split(/\r?\n/);
  const result = new Map<string, PluData[]>();

  let currentParent: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Detect parent line (no leading •)
    if (!line.startsWith("•")) {
      currentParent = line;
      if (currentParent && !result.has(currentParent)) {
        result.set(currentParent, []);
      }
      continue;
    }

    if (!currentParent) continue;

    // Remove bullet "•"
    const entry = line.replace(/^•\s*/, "");

    // Some lines have multiple items separated by semicolons
    const chunks = entry.split(/;\s*/);

    for (const chunk of chunks) {
      // Match patterns like: "Akane, small (4098)"
      const matches = [...chunk.matchAll(/(.+?)\s*\((\d+)\)/g)];

      for (const m of matches) {
        let rawName = m[1].trim();
        const plu = m[2].trim();

        // Try to extract size if present inside the name
        let size: string | undefined;
        const sizeMatch = rawName.match(
          /\b(small|medium|large|extra large|red|yellow|green|on the vine)\b/i
        );
        if (sizeMatch) {
          size = sizeMatch[1].toLowerCase();
          rawName = rawName.replace(sizeMatch[0], "").trim().replace(/,$/, "");
        }

        result.get(currentParent)!.push({
          plu,
          name: rawName,
          size,
        });
      }
    }
  }

  return result;
}

if (require.main === module) {
  parsePluPdf("2011-plu-listings.pdf").then((data) => {
    data.forEach((value, key) => {
      if (value.length === 0) data.delete(key);
    });
    const jsonDump = JSON.stringify(Object.fromEntries(data), null, 2);
    fs.writeFileSync("plu.json", jsonDump);
  });
}
