import {
  CreateProductAndSanitizeDocument,
  CreateProductAndSanitizeMutation,
  CreateProductAndSanitizeMutationVariables,
  CreateProductRaw,
} from "graphql-utils";
import { SwadProduct } from "./types";
import { fetchGraphql } from "../utils";
import * as fs from "fs";
import 'dotenv/config';

function generateSwadUPC(sku: string) {
  // ensure it's a 5-digit string
  if (!/^\d{1,5}$/.test(sku)) {
    throw new Error("SKU must be 1 to 5 digits");
  }

  // pad with leading zeros if needed
  const paddedSku = sku.padStart(5, "0");

  const base = "051179" + paddedSku; // 11 digits

  // compute check digit
  let sumOdd = 0;
  let sumEven = 0;

  for (let i = 0; i < base.length; i++) {
    const digit = Number(base[i]);

    if ((i + 1) % 2 === 1) {
      sumOdd += digit;
    } else {
      sumEven += digit;
    }
  }

  const total = sumOdd * 3 + sumEven;
  const checkDigit = (10 - (total % 10)) % 10;

  return base + checkDigit;
}

const dataArray = JSON.parse(
  fs.readFileSync("./swad_products.json", "utf-8"),
) as SwadProduct[];

const inputData = dataArray.map((p) => {
  const code = generateSwadUPC(p.sku.toString().substring(0, 5));
  const descriptionExtra = `SKU: ${p.sku}. BARCODE: ${p.barcode}.`;
  return {
    code,
    name: p.name,
    brand: "Swad",
    imageUrl: p.image_path,
    weight: p.product_sizes,
    description: p.details
      ? `${p.details}. ${descriptionExtra}`
      : descriptionExtra,
    category: p.category ?? "Uncategorized",
  } as CreateProductRaw;
});

const jwt = process.env.JWT;

if (!jwt) {
  process.exit();
}

inputData.forEach(async (input) => {
  const {data, errors} = await fetchGraphql<
    CreateProductAndSanitizeMutationVariables,
    CreateProductAndSanitizeMutation
  >(
    CreateProductAndSanitizeDocument,
    "mutation",
    {
      input,
    },
    jwt,
  )

  if (data) {
    console.log(`Added ${input.code}: https://pricetra.com/products/${data.createProductAndSanitize.id}`)
    return;
  }

  if (errors) {
    console.log(`Failed adding ${input.code}.`, JSON.stringify(errors), JSON.stringify(input))
    return;
  }
});
