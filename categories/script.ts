import * as fs from "fs";
import { Category } from "./categoryType";

const DELIM = ' > '

const categoriesFileRaw = fs.readFileSync("./categories.txt", 'ascii');
const categoriesParsed = categoriesFileRaw.split('\n')

const categories = new Array<Category>();
const categoryIdToNameMap = new Map<number, string>()
const categorySet = new Set<string>();
let id = 462
categoriesParsed.forEach((categoryPathFull, i) => {
  if (categoryPathFull.trim().length === 0) return;
 
  const parsedCategory = categoryPathFull.split(DELIM);
  parsedCategory.forEach((category, j) => {
    if (categorySet.has(category)) return;

    const fullPath = parsedCategory.slice(0, j + 1).join(DELIM)
    const prevId = j - 1;
    let path: number[] = [];
    if (j > 0) {
      const prevPath = categories
        .find(({name}) => name === parsedCategory.at(prevId))?.path;
      if (!prevPath) return;
      path.push(...prevPath, id);
    } else {
      path = [id];
    }
    categories.push({
      id,
      path,
      name: category,
      expandedPathname: fullPath,
      alias: category === 'Food, Beverages & Tobacco' ? 'Grocery' : category
    });

    categoryIdToNameMap.set(id, category);
    categorySet.add(category);
    id++;
  });
  id++;
});

let output = '';
categories.forEach(c => {
  output += `insert into "category" ("id", "name", "path", "expanded_pathname", "alias") values (${c.id}, '${c.name}', '{${c.path.join(',')}}', '${c.expandedPathname}', '${c.alias}');\n`
});
fs.writeFileSync('./output.sql', output);
// console.log(output)

let update = ''
categories.forEach(c => {
  if (c.path.length === 1) return;
  update += `update "product" set category_id = ${c.id} where "product"."category" like '%${c.name}%';\n`
});
fs.writeFileSync('./update.sql', update);
