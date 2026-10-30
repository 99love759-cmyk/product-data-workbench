import {predict,number} from './model.mjs?v=27';

export const normalizeStockName=value=>String(value??'').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
const aliases=new Map([
 ['洪艾堂蓝莓石斛叶黄素护眼贴','李时珍蓝莓石斛叶黄素护眼贴'],
 ['皇都郎陈皮白茶鹌鹑蛋','陈皮白茶鹌鹑蛋'],
 ['李时珍侧柏叶洗发皂','乌斯曼草侧柏叶洗发皂精油'],
 ['颐益膳新西兰进口奶源骨胶液体钙','颐益善新西兰进口奶源骨胶液体钙']
].map(pair=>pair.map(normalizeStockName)));
const identity=value=>{const n=normalizeStockName(value).replace(/组合装$/,'');return aliases.get(n)||n;};
// Specific uses take precedence over shared words such as 粉、草、百合 and 芝麻.
const categories=[
 ['管道清洁',/管道|疏通|速通/],['衣物清洁',/洗衣|凝珠|漂白|去渍/],['身体洗护',/洗发|洗脸|沐浴|香皂|羊脂皂|洗发皂/],
 ['足部护理',/泡洗|泡脚|足浴|足贴|清足/],['家居清洁',/清洁剂|除螨|除菌喷|洁厕|洗洁/],
 ['口腔护理',/牙膏|牙刷|漱口/],['眼部护理',/护眼贴|眼贴|叶黄素抑菌液/],['外用护理',/颈肩贴|膝盖贴|热敷|舒腹|艾灸|膏药/],
 ['珠宝配饰',/项链|手串|手链|耳环|吊坠|玉髓|玉佩|珠宝|翡翠/],['眼镜',/眼镜|老视镜/],['厨具',/筷|餐具|锅|菜刀|砧板/],
 ['营养补充',/蛋白粉|蛋白肽|冻干粉|液体钙|胶囊|益生菌|牛初乳/],
 ['冲调谷物',/藕粉|百合粉|葛根粉|山药粉|芝麻粉|桑葚粉|茯苓粉|七谷|八珍粉|养元粉|牛奶粉|燕麦|玉米片|大麦若叶|米糊|五谷|杂粮粉/],
 ['滋补膏糕',/阿胶|滋补膏|百合膏|元气膏|八珍糕|五黑丸|化橘红膏/],['茶饮',/姜茶|花茶|金银花|黄芪.*饮|草本.*饮|红茶|绿茶|养生茶/],
 ['零食',/润喉糖|奶枣|水晶枣|红薯片|饼|坚果/],['调味品',/调味料|香油|酱油|有机醋|辣椒|炖肉王/],
 ['主食干货',/面条|长寿面|芹菜面|豆皮|木耳|枸杞|大米/],['肉蛋',/鹌鹑蛋|鸡蛋|火腿|午餐肉/]
];
export function stockCategory(name){return categories.find(([,pattern])=>pattern.test(name))?.[0]||'';}
const median=values=>{const a=values.toSorted((x,y)=>x-y);return a.length?a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2:null;};
const conservativeMedian=values=>values.length?values.toSorted((a,b)=>a-b)[Math.floor((values.length-1)/2)]:null;
const cache=new WeakMap();
export function stockIndex(data){
 if(cache.has(data))return cache.get(data);
 const catalog=data.priceCatalog?.entries||[],rows=[];
 for(const product of data.products||[]){
  const names=[product.name,...(product.components?.slice(0,1)||[])],main=names.at(-1),matches=catalog.filter(e=>names.some(n=>identity(n)===identity(e.name)));
  const history=predict(data,{productKey:product.key,customRate:0,audience:1});
  const mechanisms=[...new Map((data.records||[]).filter(r=>r.productKey===product.key).toSorted((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.time||'').localeCompare(a.time||'')||(b.row||0)-(a.row||0)).map(r=>[r.mechanismKey,r])).values()];
  const samples=history.samples||[],rate=history.historicalRate??conservativeMedian(samples.map(s=>s.rate));
  rows.push({...product,id:'sold:'+product.key,main,category:stockCategory(main),price:median(mechanisms.map(r=>r.price).filter(p=>p>0)),history,rate,sessionCount:samples.length,mechanisms,catalog:matches,sold:true});
 }
 for(const entry of catalog){
  if(rows.some(p=>p.sold&&identity(p.main)===identity(entry.name))||rows.some(p=>!p.sold&&identity(p.name)===identity(entry.name)))continue;
  rows.push({id:'catalog:'+entry.id,name:entry.name,main:entry.name,group:entry.sheetTitle,category:stockCategory(entry.name),price:typeof entry.livePrice==='number'?entry.livePrice:null,catalog:catalog.filter(e=>identity(e.name)===identity(entry.name)),sold:false,sessionCount:0});
 }
 cache.set(data,rows);return rows;
}
export function stockSuggestions(data,query){
 const n=normalizeStockName(query);
 return stockIndex(data).filter(p=>!n||[p.name,p.main,p.group].some(v=>normalizeStockName(v).includes(n)))
  .toSorted((a,b)=>Number(b.sold)-Number(a.sold)||b.sessionCount-a.sessionCount||a.name.localeCompare(b.name,'zh-CN')).slice(0,12);
}
export function resolveStockTarget(data,input){
 const rows=stockIndex(data),name=String(input.name||'').trim();
 const selected=rows.find(p=>p.id===input.choiceId&&normalizeStockName(p.name)===normalizeStockName(name));
 if(selected)return selected;
 const exact=rows.filter(p=>normalizeStockName(p.name)===normalizeStockName(name));
 if(exact.length===1)return exact[0];
 if(exact.length>1)return {name,ambiguous:true};
 const same=rows.filter(p=>p.sold&&identity(p.main)===identity(name));
 if(same.length===1)return same[0];
 if(same.length>1)return {name,ambiguous:true};
 return {name,main:name,category:stockCategory(name),catalog:[],sold:false};
}
export function stockReferences(data,target,override=''){
 let candidates=stockIndex(data).filter(p=>p.sold&&p.rate!==null&&p.sessionCount&&p.id!==target.id&&identity(p.main)!==identity(target.main));
 if(override){const p=candidates.find(p=>p.key===override);return p?[{...p,reason:'手动指定参考'}]:[];}
 if(!target.category)return [];
 candidates=candidates.filter(p=>p.category===target.category).map(p=>{
  const ratio=target.price&&p.price?Math.max(target.price,p.price)/Math.min(target.price,p.price):null;
  return {...p,score:(ratio?Math.max(-3,2-Math.log2(ratio)):0)+Math.min(p.sessionCount,5)*.15-(p.bundle?1:0),reason:`同属${target.category}${ratio&&ratio<=2?' · 价格接近':''}${p.bundle?' · 组合售卖':''}`};
 }).toSorted((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'zh-CN'));
 // The same main product, its gift bundles and duplicated businesses get one vote.
 return [...new Map(candidates.toReversed().map(p=>[identity(p.main),p])).values()].toSorted((a,b)=>b.score-a.score).slice(0,3);
}
export function estimateStock(data,input){
 const target=resolveStockTarget(data,input),references=stockReferences(data,target,input.referenceKey),own=target.history;
 const result={target,references,samples:own?.samples||[],components:[],source:'',notes:[],rate:null};
 if(!target.name)return {...result,error:'输入产品名称，再填直播间人数。'};
 if(target.ambiguous)return {...result,error:'有多个同名产品，请从下拉列表选择本次售卖的产品或组合装。'};
 const ownCount=target.sessionCount||0,peerRate=conservativeMedian(references.map(p=>p.rate)),peerCount=references.reduce((n,p)=>n+p.sessionCount,0);
 let rate;
 if(ownCount>=3){rate=own.historicalRate;result.source='本品历史';result.notes.push(`本品 ${ownCount} 场有效历史，两端各去掉 ${own.baseline.trimEachSide} 场后等权平均。`);}
 else if(ownCount){
  const ownRate=target.rate;
  if(peerRate!==null){const weight=ownCount/(ownCount+3),capped=Math.min(ownRate,peerRate*1.5);rate=capped*weight+peerRate*(1-weight);result.notes.push(`本品仅 ${ownCount} 场：本品参考值最高按同类中位值的 1.5 倍纳入，再以 ${ownCount}∶3 与同类基准融合。`);}
  else {rate=ownRate*.7;result.notes.push(`本品仅 ${ownCount} 场且无可靠同类，按本品场次中位转化率的 70% 保守试算（偶数场取较低中位）；单场偶发爆单仍无法识别。`);}
  result.source='少样本试算';
 }else if(peerRate!==null){
  const sparse=references.length===1&&peerCount<3;rate=peerRate*.8*(sparse ? .7 : 1);result.source='同类新品试算';
  result.notes.push(`各参考品先取去尾场均值（不足 3 场取场次中位值），再取产品间中位值，偶数时取较低中位；新品按 80% 折减${sparse?'，唯一参考不足 3 场再按 70% 折减':''}。`);
 }else result.notes.push('未找到用途相近且有有效销量的商品，请在更多设置里选择参考品或填写转化率。');
 const manual=input.customRate!==''&&input.customRate!=null;
 if(manual){rate=number(input.customRate);if(rate===null)return {...result,error:'手动转化率须为大于或等于 0 的数字。'};rate/=100;result.source='手动假设';}
 result.rate=rate??null;result.lowEvidence=result.source!=='本品历史';
 let mechanism=target.mechanisms?.find(m=>m.mechanismKey===input.mechanismKey)||target.mechanisms?.[0];
 const quotes=target.catalog||[],quote=quotes.find(q=>q.id===input.quoteId),quantities=[...new Set(quotes.map(q=>q.quantity).filter(q=>Number.isInteger(q)&&q>0))];
 const quantity=quote?.quantity??(quantities.length===1?quantities[0]:1);
 const components=mechanism?.components||[{name:target.name,supplier:quote?.supplier||'',quantity:Number.isInteger(quantity)&&quantity>0?quantity:1}];
 result.mechanism=mechanism?.mechanism||quote?.mechanism||`每单 ${components[0].quantity} 件`;result.mechanismKey=mechanism?.mechanismKey||'';
 result.quantityNote=mechanism?'默认使用最近售卖规格，可在更多设置中调整。':quote?'已使用所选产品目录规格。':quantities.length===1?'每单数量来自产品目录。':'每单默认 1 件，实际为多件装时请在更多设置中调整。';
 result.components=components.map(c=>({...c,quantity:input.quantities?.[c.name]??c.quantity,stock:input.stock?.[c.name]??0}));
 if(result.components.some(c=>!Number.isInteger(number(c.quantity))||number(c.quantity)<=0))return {...result,error:'每单数量须为正整数，请在更多设置中补充。'};
 if(result.components.some(c=>!Number.isInteger(number(c.stock))))return {...result,error:'可用库存须为非负整数。'};
 if(rate==null)return {...result,error:'暂时没有可靠参考，请在更多设置中补选参考商品。'};
 const audience=number(input.audience),buffer=number(input.buffer??10);
 if(!audience||!Number.isInteger(audience))return {...result,error:'填写本次直播间预计峰值在线人数，即可计算备货。'};
 if(buffer===null||buffer>200)return {...result,error:'安全余量须在 0%–200% 之间。'};
 result.audience=audience;result.buffer=buffer;result.expectedOrders=Math.ceil(audience*rate-1e-9);
 result.components=result.components.map(c=>{const quantity=number(c.quantity),stock=number(c.stock),demand=result.expectedOrders*quantity,prepared=Math.ceil(demand*(1+buffer/100)-1e-9);return {...c,quantity,stock,demand,target:prepared,purchase:Math.max(0,prepared-stock)};});
 result.purchase=result.components.reduce((n,c)=>n+c.purchase,0);return result;
}
