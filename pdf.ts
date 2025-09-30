import fs from "fs";
import pdf from "pdf-parse";
import 'dotenv/config';

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

    if (!line.startsWith("•") && !/\(\d{4,}\)/.test(line)) {
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
          /b(small|medium|large|extra large|red|yellow|green|on the vine)b/i
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
  parsePluPdf("2011-plu-listings.pdf").then(async (data) => {
    for (const [key, val] of data) {
      if (val.length === 0) continue;
      if (key.length === 1) continue;
      if (key.includes(',') || key.includes('(') || key.includes(')')) continue;

      for (const { plu, name, size } of val) {
        console.log('PLU', plu)
        const nameBuilder = [key]
        const nameClean = name.replace(', ', '')
        if (nameClean !== key) {
          nameBuilder.push(nameClean)
        }
        if (size && size.length > 0) {
          nameBuilder.push(size);
        }
        const formattedName = nameBuilder.join(' ')
        console.log(formattedName)
        try {
          const res = await fetch("https://api.pricetra.com/graphql", {
            headers: {
              "Authorization": `Bearer ${process.env.JWT}`,
              "Accept": "application/json, multipart/mixed",
              "Accept-Language": "en-US,en;q=0.5",
              "Content-Type": "application/json",
            },
            body: `{"query":"mutation CreateProduct($input:CreateProduct!) {\\n  createProduct(input:$input) {\\n    id\\n  }\\n}","variables":{"input":{"code":"${plu}","name":"${formattedName}","brand":"N/A","description":"","categoryId":509}},"operationName":"CreateProduct"}`,
            method: "POST",

          })

          console.log(await res.json())
          if (!res.ok) {
            console.log('request failed')
            return;
          }
        } catch (err) {
          console.error(err)
        }
      }
    }
  });
}
