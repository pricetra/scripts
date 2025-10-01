import fs from "fs";
import csv from "csv-parser";
import s from 'underscore.string'
import 'dotenv/config';

type PluCsvHeader = {
  "id": string;
  "Plu": string; // 4 digit PLU code
  "Type": string; // Availability code Global, LA, EMEA, etc.
  "Category": string; // Fruits, Vegetables, Herbs, Nuts, etc.
  "Commodity": string; // Apples, Pears, Pineapple, etc.
  "Variety": string; // Honeycrisp, Clementine, etc.
  "Size": string; // All Sizes, Large, Medium, Small, etc.
  "Botanical": string;
  "Aka": string;
}

const produceId = 509
const categoryToCategoryIdMap = new Map<string, number>([
  ["Dried Fruits", 1590],
  ["Nuts", 1589],
  ["Herbs", 514],
  ["Vegetables", 512],
  ["Fruits", 510],
])

let added = 0

fs.createReadStream('plu.csv')
  .pipe(csv())
  .on('data', async (data: PluCsvHeader) => {
    const plu = data.Plu

    const nameBuilder = [s.titleize(data.Commodity.trim())]
    if (data.Variety.length > 0) {
      nameBuilder.push(data.Variety.trim())
    }
    if (data.Size.length > 0 && !data.Size.toLowerCase().includes('all')) {
      nameBuilder.push('- ' + data.Size.trim())
    }

    const descriptionBuilder = []
    if (data.Botanical.length > 0) {
      descriptionBuilder.push('Botanical name: ' + data.Botanical.trim())
    }
    if (data.Aka.length > 0) {
      descriptionBuilder.push('AKA: ' + data.Aka.replace('\n', '.').trim())
    }

    const categoryId = categoryToCategoryIdMap.get(data.Category) ?? produceId
    try {
      const res = await fetch(process.env.GRAPHQL_API ?? 'http://localhost:8080/graphql', {
        headers: {
          "Authorization": `Bearer ${process.env.JWT}`,
          "Accept": "application/json, multipart/mixed",
          "Accept-Language": "en-US,en;q=0.5",
          "Content-Type": "application/json",
        },
        body: `{"query":"mutation CreateProduct($input:CreateProduct!) {\\n  createProduct(input:$input) {\\n    id\\n  code\\n  name\\n  categoryId\\n}\\n}","variables":{"input":{"code":"${plu}","name":"${nameBuilder.join(' ')}","brand":"N/A","description":"${descriptionBuilder.join(', ')}","categoryId":${categoryId}}},"operationName":"CreateProduct"}`,
        method: "POST",
      })

      console.log(await res.json())
      if (!res.ok) {
        console.log('request failed')
        return;
      }
      added++;
    } catch (err) {
      console.error(err)
    }
  })
  .on('end', () => {
    console.log('Finished. ', added);
  });