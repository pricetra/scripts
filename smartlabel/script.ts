import {
  BarcodeScanDocument,
  BarcodeScanQuery,
  BarcodeScanQueryVariables,
} from "graphql-utils";
import { fetchGraphql, normalizeUPC } from "../utils";
import { SmartLabelResponse } from "./types";
import "dotenv/config";
import { program } from "commander";

const jwt = process.env.JWT;

if (!jwt) {
  console.log("JWT is null");
  process.exit();
}

program
  .name('SmartLabel Script')
  .version('1.0.0')
  .option('-p, --page <number>', 'Page to start crawling from', '');
program.parse();
const options = program.opts();
let page = 1;
if (options.page) {
  const parsedPage = parseInt(options.page);
  if (!isNaN(parsedPage)) page = parsedPage;
}
const limit = 500;

async function fetchAllSmartLabelProducts(page: number, perPage: number = 500) {
  let hasNext = true;
  let curPage = page;

  while (hasNext) {
    const url = `https://api.smartlabel.org/api/search?perPage=${perPage}&page=${curPage}`;
    console.log(`Fetching page ${curPage} (${url}):\n`);

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const json: SmartLabelResponse = await res.json();
      const products = json.data.data;
      console.log(`→ Got ${products.length} products`);

      // Stop condition
      if (!json.data.next_page_url) {
        hasNext = false;
      } else {
        curPage++; // increment manually (important)
      }

      for (const smartLabelItem of products) {
        await new Promise((r) => setTimeout(r, 250));

        const upc = normalizeUPC(smartLabelItem.upc) ?? smartLabelItem.upc;
        console.log();
        console.log(`Trying ${upc} (page ${curPage-1}):`);
        console.info(JSON.stringify(smartLabelItem))
        const { data, errors } = await fetchGraphql<
          BarcodeScanQueryVariables,
          BarcodeScanQuery
        >(
          BarcodeScanDocument,
          "query",
          {
            barcode: upc,
            productData: {
              name: smartLabelItem.common,
              brand: smartLabelItem.brand,
              description: `${smartLabelItem.common}. Brand: ${smartLabelItem.brand}. Sub brand: ${smartLabelItem.subbrand}. Company: ${smartLabelItem.company_name}`,
              category: smartLabelItem.category ?? "unknown",
              productPageUrl: smartLabelItem.url,
              manufacturer_id: smartLabelItem.id.toString(),
            },
          },
          jwt,
        );

        if (data) {
          console.log(
            `Added ${upc}: https://pricetra.com/products/${data.barcodeScan.id}`,
          );
          continue;
        }

        if (errors || !data) {
          console.warn(
            `could not add ${upc} (${smartLabelItem.upc}): `,
            errors,
          );
          continue;
        }
      }

      // Optional: small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      console.error(`Error on page ${curPage-1}:`, err);
      break;
    }
  }
}

// Run it
fetchAllSmartLabelProducts(page, limit).then(() => {
  console.log("Finished fetching all data.");
});
