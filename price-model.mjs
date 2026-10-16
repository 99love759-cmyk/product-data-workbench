const text=value=>String(value??'').trim();
const key=value=>text(value).normalize('NFKC').replace(/\s/g,'').replace(/[（）]/g,c=>c==='（'?'(':')');
const definitions=[
 ['name',['品牌+产品名称','产品名称']],['supplier',['厂家公司名称','厂家公司名称签合同的公司名称']],
 ['brand',['品牌']],['category',['品类']],['nature',['产品性质']],['mechanism',['直播机制','直播机制(规格+数量)']],
 ['livePrice',['直播价']],['barePrice',['裸价']],['deliveredPrice',['含运价']],['margin',['平台毛利']],
 ['sold',['是否卖过']],['settlementUnit',['结算(最小单位)']],['quantity',['机制数量']],
 ['settlementOrder',['每单结算','每单结算(含运)']],['profitBeforeFreight',['每单利润(未扣减运费)']],
 ['freightUnit',['运费(最小单位)']],['freightOrder',['机制运费']],['profitAfterFreight',['每单利润(扣减运费)']],
 ['profit',['每单利润']],['notes',['备注']]
];
const numeric=new Set(['livePrice','barePrice','deliveredPrice','margin','settlementUnit','quantity','settlementOrder','profitBeforeFreight','freightUnit','freightOrder','profitAfterFreight','profit']);
export function priceValue(value){
 if(value===null||value===undefined||text(value)==='')return null;
 if(typeof value==='number')return Number.isFinite(value)?value:null;
 const cleaned=key(value).replace(/^[¥￥]/,'').replace(/,/g,'');
 return /^-?\d+(?:\.\d+)?$/.test(cleaned)?Number(cleaned):text(value);
}
export function buildPriceCatalog(source,sourceUrl=''){
 if(!source?.sheets?.length)throw Error('价格表没有可读取的子表，本次刷新未保存。');
 const entries=[],sheets=[];
 for(const sheet of source.sheets){
  const headerRow=sheet.rows.findIndex(row=>row.some(v=>['品牌+产品名称','产品名称'].includes(key(v)))&&row.some(v=>key(v)==='直播价'));
  if(headerRow<0)throw Error(`价格表“${sheet.title}”未识别到产品名称和直播价列，本次刷新未保存。`);
  const headers=sheet.rows[headerRow],columns=Object.fromEntries(definitions.map(([field,aliases])=>[field,headers.findIndex(v=>aliases.some(a=>key(a)===key(v)))]));
  if(columns.mechanism<0||columns.barePrice<0||columns.deliveredPrice<0)throw Error(`价格表“${sheet.title}”缺少规格或供货价列，本次刷新未保存。`);
  let count=0;
  for(let index=headerRow+1;index<sheet.rows.length;index++){
   const row=sheet.rows[index],name=text(row[columns.name]);
   if(!name||['品牌+产品名称','产品名称'].includes(key(name)))continue;
   const entry={id:`${sheet.sheet_id}-${index+1}`,sheetId:sheet.sheet_id,sheetTitle:sheet.title,row:index+1,fields:[]};
   for(const [field] of definitions){
    const col=columns[field],value=col<0?(numeric.has(field)?null:''):numeric.has(field)?priceValue(row[col]):text(row[col]);
    entry[field]=value;
    if(col>=0)entry.fields.push({key:field,label:text(headers[col]),value});
   }
   // Keep each quoted mechanism and price as its own row, even for identical names.
   entries.push(entry);count++;
  }
  sheets.push({id:sheet.sheet_id,title:sheet.title,entries:count,headerRow:headerRow+1});
 }
 return {version:1,fetchedAt:source.fetchedAt,sourceUrl,sheets,entries};
}
export function queryPrices(catalog,{search='',sheet='',supplier='',status='',sort='source'}={}){
 const words=text(search).normalize('NFKC').toLowerCase().split(/\s+/).filter(Boolean);
 const normalize=value=>key(value).toLowerCase();
 const rows=(catalog?.entries||[]).filter(entry=>{
  if(sheet&&entry.sheetId!==sheet||supplier&&entry.supplier!==supplier)return false;
  if(status==='priced'&&typeof entry.livePrice!=='number'||status==='missing'&&typeof entry.livePrice==='number')return false;
  const haystack=normalize([entry.sheetTitle,...entry.fields.map(f=>f.value)].join(' '));
  return words.every(word=>haystack.includes(normalize(word)));
 });
 if(sort==='name')rows.sort((a,b)=>a.name.localeCompare(b.name,'zh-CN')||a.row-b.row);
 if(sort==='price-asc'||sort==='price-desc')rows.sort((a,b)=>{
  const av=typeof a.livePrice==='number'?a.livePrice:null,bv=typeof b.livePrice==='number'?b.livePrice:null;
  if(av===null||bv===null)return av===bv?0:av===null?1:-1;
  return sort==='price-asc'?av-bv:bv-av;
 });
 return rows;
}
