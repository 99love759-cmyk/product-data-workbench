const normalize=value=>String(value??'').normalize('NFKC').replace(/\s+/g,'').toLowerCase();
const business=value=>/星跃/.test(value)?'风驰星跃':/悦龄集/.test(value)?'悦龄集':/^(?:悦甄选(?:abc)?|abc)$/i.test(value)?'abc':value;

// Match the full product name within its business. Similar names and other
// brands must not inherit a photo, and a bundle's gift is not its main image.
export function createProductPhotoLookup(catalog,supplement){
 const index=new Map();
 for(const entry of catalog?.entries||[]){
  const photo=catalog.images?.[entry.imageId];
  if(!photo||!/^data:image\/(?:jpeg|png|webp);base64,/.test(photo.dataUrl))continue;
  const key=JSON.stringify([normalize(business(entry.sheetTitle)),normalize(entry.name)]);
  if(!index.has(key))index.set(key,new Map());
  index.get(key).set(photo.dataUrl,photo);
 }
 for(const entry of supplement?.entries||[]){
  const photo=supplement.images?.[entry.imageId];
  if(!photo||!/^data:image\/(?:jpeg|png|webp);base64,/.test(photo.dataUrl))continue;
  const key=JSON.stringify([normalize(business(entry.group)),normalize(entry.name)]);
  // A verified supplementary mapping also supports user-confirmed source aliases.
  index.set(key,new Map([[photo.dataUrl,photo]]));
 }
 return product=>{
  if(!product)return null;
  const main=product.components?.[0]??product.latest?.components?.[0];
  const mainName=typeof main==='string'?main:main?.name;
  for(const name of new Set([product.name,mainName].filter(Boolean))){
   const photos=index.get(JSON.stringify([normalize(business(product.group)),normalize(name)]));
   if(photos?.size===1)return photos.values().next().value;
  }
  return null;
 };
}
