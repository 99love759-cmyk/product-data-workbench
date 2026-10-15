// One record represents one sale offer, including all rows of a bundle.
export const SOURCE_URL = '';
const clean = v => String(v ?? '').trim();
const norm = v => clean(v).replace(/\s/g, '');
export function businessName(title) {
  return clean(title).replace(/(?:[（(]\s*)?(?:产品)?(?:售卖|销售)?(?:明细|汇总)(?:表)?\s*[）)]?\s*$/,'').replace(/[\s—_·-]+$/,'').trim() || clean(title);
}
export function number(v) {
  if (v === '' || v == null || typeof v === 'boolean') return null;
  const n = Number(String(v).replace(/[,，\s]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : null;
}
export function roomNumbers(value) {
  const map = {};
  for (const m of clean(value).toUpperCase().matchAll(/([A-Z]+\d+)\s*[:：]\s*([\d,，]+(?:\.\d+)?)/g)) map[m[1]] = number(m[2]);
  return map;
}
export function rooms(value) { return [...new Set(clean(value).toUpperCase().match(/[A-Z]+\d+/g) || [])]; }
export function dateValue(value) {
  if (typeof value === 'number') return new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000).toISOString().slice(0,10);
  const m = clean(value).match(/(\d{4})[年/.-](\d{1,2})[月/.-](\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}` : null;
}
function timeValue(v) {
  if (typeof v === 'number') { const m=Math.round(v*1440); return `${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`; }
  return clean(v).slice(0,5);
}
const sum = a => a.reduce((x,y)=>x+y,0);
const has = (o,k) => Object.hasOwn(o,k) && o[k] !== null;
const complete = (o,keys) => keys.length>0 && keys.every(k=>has(o,k));
const different = (a,b) => a!==null && b!==null && Math.abs(a-b)>0.01;
export function buildDataset(source) {
  const records=[], issues=[], sheetInfo=[];
  for (const sheet of source.sheets) {
    const group=businessName(sheet.title);
    const headerAt=sheet.rows.findIndex(r=>r.some(c=>norm(c)==='直播日期') && r.some(c=>norm(c)==='产品名称'));
    if(headerAt<0) { sheetInfo.push({id:sheet.sheet_id,title:sheet.title,group,type:/汇总/.test(sheet.title)?'summary':'other',rows:Math.max(0,sheet.rows.filter(r=>r.some(c=>c!=='')).length-1)}); continue; }
    const h=sheet.rows[headerAt].map(norm);
    const idx=name=>h.indexOf(norm(name));
    const required=['直播日期','直播时间','主播','系统','产品名称','拍一发几','各系统单量','合计单量','各系统峰值在线人数','合计峰值在线人数'];
    if(required.some(name=>idx(name)<0)) throw Error(`「${sheet.title}」缺少必要字段，请检查表头。`);
    const get=(r,name)=>r[idx(name)]??'';
    const offers=[]; let active=null;
    for(let i=headerAt+1;i<sheet.rows.length;i++) {
      const r=sheet.rows[i], name=clean(get(r,'产品名称'));
      if(!name) { if(r.every(c=>c==='')) active=null; continue; }
      if(/^(合计|总计|小计)$/.test(name)) {active=null;continue;}
      const continuation = active && ['直播日期','直播时间','主播','系统'].every(k=>clean(get(r,k))==='') && clean(get(r,'直播价'))==='';
      const component={name,supplier:clean(get(r,'提报主体'))||(continuation?active.supplier:''),quantity:number(get(r,'拍一发几')),sourceUnits:number(get(r,'合计总量（最小颗粒度）')),sourceOrders:number(get(r,'合计单量')),roomOrders:roomNumbers(get(r,'各系统单量')),sourceRate:number(get(r,'峰值转换率')),row:i+1};
      if(continuation) {active.components.push(component);continue;}
      active={id:`${sheet.sheet_id}:${i+1}`,sheetId:sheet.sheet_id,sheet:sheet.title,group,row:i+1,date:dateValue(get(r,'直播日期')),time:timeValue(get(r,'直播时间')),anchor:clean(get(r,'主播')),supplier:component.supplier,rooms:rooms(get(r,'系统')),price:number(get(r,'直播价')),sourceOrders:component.sourceOrders,sourcePeak:number(get(r,'合计峰值在线人数')),roomOrders:component.roomOrders,roomPeaks:roomNumbers(get(r,'各系统峰值在线人数')),components:[component]};
      offers.push(active);
    }
    sheetInfo.push({id:sheet.sheet_id,title:sheet.title,group,type:'detail',rows:offers.reduce((n,r)=>n+r.components.length,0),offers:offers.length});
    for(const offer of offers) {
      offer.bundle=offer.components.length>1;
      offer.suppliers=[...new Set(offer.components.map(c=>c.supplier).filter(Boolean))];
      offer.supplier=offer.suppliers.join('、');
      offer.name=offer.components[0].name+(offer.bundle?'组合装':'');
      offer.productKey=`${offer.group}:${offer.components.map(c=>norm(c.name)).join('+')}`;
      offer.mechanism=offer.components.map(c=>`${c.name} ×${c.quantity??'待填'}`).join(' + ');
      offer.mechanismKey=JSON.stringify(offer.components.map(c=>[norm(c.name),c.quantity]));
      offer.issues=[]; offer.invalidRooms=[];
      const issue=(message,kind='warning')=>{const v={id:`${offer.id}:${offer.issues.length}`,recordId:offer.id,sheet:offer.sheet,row:offer.row,product:offer.name,message,kind};offer.issues.push(v);issues.push(v);};
      if(!offer.date) issue('直播日期缺失，此记录不参与备货估算。');
      if(!offer.anchor) issue('主播未填；完整的订单和峰值仍参与该产品综合备货。');
      if(!offer.rooms.length) offer.rooms=[...new Set([...Object.keys(offer.roomOrders),...Object.keys(offer.roomPeaks)])];
      const ordersComplete=complete(offer.roomOrders,offer.rooms), peaksComplete=complete(offer.roomPeaks,offer.rooms);
      const roomOrderSum=ordersComplete?sum(offer.rooms.map(r=>offer.roomOrders[r])):null;
      const roomPeakSum=peaksComplete?sum(offer.rooms.map(r=>offer.roomPeaks[r])):null;
      offer.orders=offer.sourceOrders??roomOrderSum;
      offer.peak=offer.sourcePeak??roomPeakSum;
      offer.derived=offer.sourceOrders===null&&roomOrderSum!==null;
      offer.pending=offer.orders===null;
      if(offer.derived) issue('合计单量未填，已按完整的各系统单量重新计算。','derived');
      if(offer.pending) issue('单量尚未填齐；原表公式的 0 不作为零销量。','pending');
      if(offer.sourcePeak===null&&roomPeakSum!==null) issue('合计峰值未填，已按完整的各系统峰值重新计算。','derived');
      if(different(offer.sourceOrders,roomOrderSum)) {offer.totalConflict=true;issue(`合计单量 ${offer.sourceOrders} 与各系统合计 ${roomOrderSum} 不一致；该场不用于备货。`);}
      if(different(offer.sourcePeak,roomPeakSum)) {offer.totalConflict=true;issue(`合计峰值 ${offer.sourcePeak} 与各系统合计 ${roomPeakSum} 不一致；该场不用于备货。`);}
      for(const c of offer.components) {
        if(c.quantity===null||c.quantity<=0) issue(`「${c.name}」拍发数量未填写或无效，不能计算组件备货。`);
        if(different(c.sourceOrders,offer.orders)) {offer.totalConflict=true;issue(`组合组件「${c.name}」单量与主品不一致；该场不用于备货。`);}
        const expected=offer.orders!==null&&c.quantity!==null?offer.orders*c.quantity:null;
        if(different(c.sourceUnits,expected)) issue(`「${c.name}」原表总量为 ${c.sourceUnits}，按单量 × 拍发数量应为 ${expected}。${offer.derived?'网站使用重算值。':'网站保留原表值供核对。'}`);
        c.units=offer.pending?null:(offer.derived?expected:(c.sourceUnits??expected));
        for(const room of offer.rooms) if(has(c.roomOrders,room)&&has(offer.roomOrders,room)&&different(c.roomOrders[room],offer.roomOrders[room])) {offer.invalidRooms.push(room);issue(`组合组件「${c.name}」${room} 单量与主品不一致；已标记明细差异，组合备货按主品总订单计算。`);}
        const expectedRate=c.units!==null&&offer.peak>0?c.units/offer.peak:null;
        if(c.sourceRate!==null&&expectedRate!==null&&Math.abs(c.sourceRate-expectedRate)>0.000001&&!offer.derived) issue(`「${c.name}」原表转换率与件数 / 峰值不一致。`);
      }
      offer.totalQuantity=offer.components.every(c=>c.quantity>0)?sum(offer.components.map(c=>c.quantity)):null;
      offer.units=offer.components.every(c=>c.units!==null)?sum(offer.components.map(c=>c.units)):null;
      offer.revenue=offer.orders!==null&&offer.price!==null?offer.orders*offer.price:null;
      offer.rate=offer.orders!==null&&offer.peak>0?offer.orders/offer.peak:null;
      offer.unitRate=offer.units!==null&&offer.peak>0?offer.units/offer.peak:null;
      records.push(offer);
    }
  }
  if(!sheetInfo.some(s=>s.type==='detail')) throw Error('没有找到含直播日期、产品名称的明细工作表。');
  const products=[...new Map(records.map(r=>[r.productKey,{key:r.productKey,name:r.name,bundle:r.bundle,group:r.group,components:r.components.map(c=>c.name)}])).values()].sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));
  const businesses=[...new Set(sheetInfo.filter(s=>s.type!=='other').map(s=>s.group))].map(name=>({name,detailSheets:sheetInfo.filter(s=>s.group===name&&s.type==='detail').map(s=>s.id),summarySheets:sheetInfo.filter(s=>s.group===name&&s.type==='summary').map(s=>s.id),...summarize(records.filter(r=>r.group===name))}));
  return {version:2,name:source.name||'产品售卖数据表',sourceUrl:SOURCE_URL,fetchedAt:source.fetchedAt,sheets:sheetInfo,businesses,records,products,issues,rooms:[...new Set(records.flatMap(r=>r.rooms))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})),anchors:[...new Set(records.map(r=>r.anchor).filter(Boolean))].sort(),dateRange:{from:records.map(r=>r.date).filter(Boolean).sort()[0]??null,to:records.map(r=>r.date).filter(Boolean).sort().at(-1)??null}};
}

export function viewRecord(r,room='') {
  if(!room)return r;
  if(!r.rooms.includes(room))return null;
  const orders=has(r.roomOrders,room)?r.roomOrders[room]:null;
  const peak=has(r.roomPeaks,room)?r.roomPeaks[room]:null;
  const components=r.components.map(c=>({...c,units:orders!==null&&c.quantity!==null?(c.roomOrders[room]??orders)*c.quantity:null}));
  const units=components.every(c=>c.units!==null)?sum(components.map(c=>c.units)):null;
 return {...r,displayRoom:room,orders,peak,units,components,rate:orders!==null&&peak>0?orders/peak:null,unitRate:units!==null&&peak>0?units/peak:null,revenue:orders!==null&&r.price!==null?orders*r.price:null,pending:orders===null};
}

export function summarize(records) {
 const known=records.filter(r=>r.orders!==null),rated=known.filter(r=>r.peak>0),unitRated=rated.filter(r=>r.units!==null);
 return {products:new Set(records.map(r=>r.productKey)).size,offers:records.length,orders:sum(known.map(r=>r.orders)),units:sum(records.filter(r=>r.units!==null).map(r=>r.units)),revenue:sum(records.filter(r=>r.revenue!==null).map(r=>r.revenue)),priced:records.filter(r=>r.revenue!==null).length,peak:sum(rated.map(r=>r.peak)),rate: rated.length?sum(rated.map(r=>r.orders))/sum(rated.map(r=>r.peak)):null,unitRate:unitRated.length?sum(unitRated.map(r=>r.units))/sum(unitRated.map(r=>r.peak)):null,pending:records.length-known.length,rated:rated.length};
}

// System-level views use only explicitly recorded system figures. A source
// aggregate is never allocated across systems or counted again in each group.
export function roomGroups(records,selectedRoom='') {
 const map=new Map();
 for(const record of records) for(const room of record.rooms) {
  if(selectedRoom&&room!==selectedRoom)continue;
  const key=room.match(/^[A-Z]+/)?.[0]||room;
  if(!map.has(key))map.set(key,new Map());
  const systems=map.get(key);if(!systems.has(room))systems.set(room,[]);
  systems.get(room).push(viewRecord(record,room));
 }
 return [...map].map(([key,systems])=>{
  const rooms=[...systems].map(([room,rows])=>({room,records:rows,...summarize(rows)})).sort((a,b)=>a.room.localeCompare(b.room,undefined,{numeric:true}));
  const rows=rooms.flatMap(r=>r.records);
  return {key,rooms,records:rows,sourceRecords:new Set(rows.map(r=>r.id)).size,...summarize(rows)};
 }).sort((a,b)=>a.key.localeCompare(b.key));
}

export function dailySummaries(records) {
 const dates=new Map();for(const r of records)if(r.date){if(!dates.has(r.date))dates.set(r.date,[]);dates.get(r.date).push(r);}
 return [...dates].map(([date,rows])=>({date,records:rows,...summarize(rows)})).sort((a,b)=>b.date.localeCompare(a.date));
}

export function predict(dataset,input) {
 const {productKey,mechanismKey='',audience=null,buffer=10,stock={},quantities={},customRate=null}=input;
 const product=dataset.products.find(p=>p.key===productKey);
 if(!product)return {error:'请从产品列表选择产品。'};
 const all=dataset.records.filter(r=>r.productKey===productKey);
 const mechanism=mechanismKey?all.find(r=>r.mechanismKey===mechanismKey):all.toSorted((a,b)=>(b.date||'').localeCompare(a.date||''))[0];
 if(!mechanism||!mechanism.totalQuantity)return {error:'该产品缺少有效的拍发数量。'};
 // The selected mechanism describes the next order's contents. Calibration uses
 // every valid record for this product, across all rooms, anchors and mechanisms.
 const samples=all.filter(r=>!r.totalConflict&&r.date&&r.orders!==null&&r.peak>0);
 // Multiple room groups for the same broadcast are one observation.
 const grouped=new Map();
 for(const r of samples) {const key=`${r.date}|${r.time}|${r.anchor}`; if(!grouped.has(key))grouped.set(key,{...r,orders:0,peak:0,ids:[],rooms:[],mechanisms:[]});const o=grouped.get(key);o.orders+=r.orders;o.peak+=r.peak;o.ids.push(r.id);o.rooms=[...new Set([...o.rooms,...r.rooms])];o.mechanisms=[...new Set([...o.mechanisms,r.mechanism])];}
 const observations=[...grouped.values()].map(r=>({...r,rate:r.orders/r.peak})).sort((a,b)=>b.date.localeCompare(a.date));
 const historicalRate=observations.length?sum(observations.map(r=>r.orders))/sum(observations.map(r=>r.peak)):null;
 const chosenRate=customRate!==null?number(customRate):historicalRate;
 const peaks=observations.map(r=>r.peak).sort((a,b)=>a-b);
 const suggestedAudience=peaks.length?(peaks.length%2?peaks[Math.floor(peaks.length/2)]:(peaks[peaks.length/2-1]+peaks[peaks.length/2])/2):null;
 const chosenAudience=audience!==null?number(audience):suggestedAudience;
 const dates=observations.map(r=>r.date).sort();
 const result={product,scope:'all-history',mechanism:mechanism.mechanism,mechanismKey:mechanism.mechanismKey,samples:observations.map(r=>({date:r.date,time:r.time,anchor:r.anchor,orders:r.orders,peak:r.peak,rate:r.rate,ids:r.ids,rooms:r.rooms,mechanisms:r.mechanisms})),recordCount:samples.length,roomCount:new Set(samples.flatMap(r=>r.rooms)).size,anchorCount:new Set(samples.map(r=>r.anchor).filter(Boolean)).size,historyOrders:sum(samples.map(r=>r.orders)),dateRange:{from:dates[0]??null,to:dates.at(-1)??null},excluded:all.length-samples.length,historicalRate,rate:chosenRate,suggestedAudience,audience:chosenAudience,customRate:customRate!==null};
 if(chosenRate===null)return {...result,error:'该产品暂无完整的历史订单和峰值数据，请填写预计峰值人数和自定订单转化率。'};
 if(chosenAudience===null||chosenAudience<=0)return {...result,error:'请填写大于 0 的预计峰值在线人数。'};
 const margin=number(buffer);if(margin===null||margin>200)return {...result,error:'安全余量应为 0%–200%。'};
 const expectedOrders=Math.ceil(chosenAudience*chosenRate-1e-9);
 if(mechanism.components.some(c=>quantities[c.name]!==undefined&&(!Number.isInteger(number(quantities[c.name]))||number(quantities[c.name])<=0)))return {...result,error:'每单发货数量应为正整数。'};
 if(mechanism.components.some(c=>stock[c.name]!==undefined&&(!Number.isInteger(number(stock[c.name]))||number(stock[c.name])<0)))return {...result,error:'可用库存应为非负整数。'};
 const components=mechanism.components.map(c=>{const quantity=number(quantities[c.name])??c.quantity,demand=expectedOrders*quantity,target=Math.ceil(demand*(1+margin/100)-1e-9),available=number(stock[c.name])??0;return {name:c.name,supplier:c.supplier,quantity,demand,target,stock:available,purchase:Math.max(0,target-available)};});
 const rates=observations.map(r=>r.rate).sort((a,b)=>a-b);
 return {...result,buffer:margin,expectedOrders:Math.ceil(expectedOrders),components,lowerOrders:rates.length>=2?Math.ceil(chosenAudience*rates[0]):null,upperOrders:rates.length>=2?Math.ceil(chosenAudience*rates.at(-1)):null};
}
