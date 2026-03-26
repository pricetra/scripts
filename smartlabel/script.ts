import {
  BarcodeScanDocument,
  BarcodeScanQuery,
  BarcodeScanQueryVariables,
} from "graphql-utils";
import { fetchGraphql, normalizeUPC } from "../utils";
import { SmartLabelResponse } from "./types";
import "dotenv/config";

const jwt = process.env.JWT;

if (!jwt) {
  console.log("JWT is null");
  process.exit();
}

async function fetchAllSmartLabelProducts() {
  const perPage = 500; // 50, 100, 500
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const url = `https://api.smartlabel.org/api/search?perPage=${perPage}&page=${page}`;

    console.log(`Fetching page ${page}...`);

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
        page++; // increment manually (important)
      }

      for (const smartLabelItem of products) {
        await new Promise((r) => setTimeout(r, 500));

        const upc = normalizeUPC(smartLabelItem.upc) ?? smartLabelItem.upc;
        console.log(`trying for ${upc}: ${JSON.stringify(smartLabelItem)}`);
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
      console.error(`Error on page ${page}:`, err);
      break;
    }
  }
}

// Run it
fetchAllSmartLabelProducts().then(() => {
  console.log("Finished fetching all data.");
});
