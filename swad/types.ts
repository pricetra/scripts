export type SwadProduct = {
  barcode: string;
  sku: string;
  category?: "Mukhwas" | null;
  details?: string | null;
  feature_tag?: string | null;
  image_path?: string | null;
  name: string;
  nutrition?: string | null;
  price?: object | null;
  product_sizes: string;
  productofthemonth?: object | null;
  recipes?: object[] | null;
  stores?: object[] | null;
};
