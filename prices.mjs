import {queryPrices} from './price-model.mjs?v=15';
import {proposalColumns,proposalValues,createProposalWorkbook} from './proposal.mjs?v=15';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const price=value=>typeof value==='number'?`¥${value.toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:4})}`:value?esc(value):'<span class="price-missing">待补</span>';
const date=value=>value?new Date(value).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'尚未同步';
const fingerprint=entry=>JSON.stringify([entry.name,entry.mechanism,entry.supplier,entry.brand,entry.shippingCity,entry.sheetTitle,entry.livePrice,entry.barePrice,entry.deliveredPrice]);
export function createPriceModule({element,dialog,icon,toast}){
 const state={catalog:null,search:'',sheet:'',supplier:'',status:'',sort:'source',page:1,selected:new Set(),drafts:{},photos:{},onlySelected:false};
 let templateFlight=null;
 const all=()=>state.catalog?.entries||[];
 const matched=()=>queryPrices(state.catalog,state).filter(e=>!state.onlySelected||state.selected.has(e.id));
 const selected=()=>all().filter(e=>state.selected.has(e.id));
 const photo=entry=>state.photos[entry.id]||state.catalog?.images?.[entry.imageId];
 const photoMarkup=(entry,kind='thumb')=>{const p=photo(entry);return p?`<button class="price-photo ${kind}" data-price-detail="${esc(entry.id)}" aria-label="查看 ${esc(entry.name)} 产品图片"><img src="${esc(p.dataUrl)}" alt="${esc(entry.name)}" loading="lazy" width="${p.width}" height="${p.height}"></button>`:'';};
 function getTemplate(){
  return templateFlight??=fetch(new URL('./proposal-template.json',import.meta.url),{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('提报模板读取失败，请重试。');return r.json();}).catch(error=>{templateFlight=null;throw error;});
 }
 async function uploadPhoto(file){
  if(!file||!['image/jpeg','image/png'].includes(file.type))throw Error('请选择 JPG 或 PNG 产品图片。');
  if(file.size>12*1024*1024)throw Error('图片请控制在 12 MB 以内。');
  const source=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('图片读取失败'));reader.readAsDataURL(file);});
  const img=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('图片无法打开，请换一张图片'));image.src=source;});
  const scale=Math.min(1,720/img.naturalWidth,720/img.naturalHeight),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  return {dataUrl:canvas.toDataURL('image/jpeg',.85),width:canvas.width,height:canvas.height};
 }
 function update(catalog){
  if(state.catalog&&state.catalog!==catalog){
   const old=new Map(all().map(e=>[e.id,fingerprint(e)]));let changed=0;
   for(const id of new Set([...state.selected,...Object.keys(state.drafts),...Object.keys(state.photos)])){
    const fresh=catalog?.entries?.find(e=>e.id===id);
    if(!fresh||old.get(id)!==fingerprint(fresh)){if(state.selected.delete(id))changed++;delete state.drafts[id];delete state.photos[id];}
   }
   if(changed)toast(`${changed} 条已选报价有更新，已取消勾选，请重新确认。`);
  }
  state.catalog=catalog;
  if(state.sheet&&!catalog?.sheets?.some(s=>s.id===state.sheet))state.sheet='';
  render();
 }
 function render(){
  if(!state.catalog){element.innerHTML='<div class="empty-state"><h2>价格表正在接入</h2><p>成功刷新后即可搜索各子表的产品价格。</p></div>';return;}
  const count=all().length,products=new Set(all().map(e=>e.name)).size,priced=all().filter(e=>typeof e.livePrice==='number').length;
  const suppliers=[...new Set(all().filter(e=>!state.sheet||e.sheetId===state.sheet).map(e=>e.supplier).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
  if(state.supplier&&!suppliers.includes(state.supplier))state.supplier='';
  element.innerHTML=`<div class="price-intro"><div><span class="eyebrow">PRICE LIBRARY</span><h2>找到产品，也找到准确的报价。</h2><p>${products} 款产品 · ${count} 条规格报价 · ${state.catalog.sheets.length} 个子表</p></div><div class="price-sync">价格表更新于 <strong>${date(state.catalog.fetchedAt)}</strong></div></div>
   <div class="price-sources" aria-label="价格子表筛选"><button data-price-sheet="" class="${!state.sheet?'active':''}"><span>全部子表</span><strong>${count}<small> 条报价</small></strong></button>${state.catalog.sheets.map((s,i)=>`<button data-price-sheet="${esc(s.id)}" class="${state.sheet===s.id?'active':''}" style="--price-accent:${['var(--blue)','var(--purple)','var(--green)'][i%3]}"><span>${esc(s.title)}</span><strong>${s.entries}<small> 条报价</small></strong></button>`).join('')}</div>
   <article class="panel price-library"><div class="price-search"><label class="search-wrap">${icon('search')}<input id="price-search" type="search" placeholder="搜索产品名称、品牌、厂家、规格…" aria-label="搜索价格" value="${esc(state.search)}"></label><span class="price-search-hint">支持多个关键词，用空格分开</span></div><div class="price-filters"><label>厂家<select id="price-supplier" aria-label="价格厂家筛选"><option value="">全部厂家</option>${suppliers.map(v=>`<option value="${esc(v)}" ${state.supplier===v?'selected':''}>${esc(v)}</option>`).join('')}</select></label><label>直播价<select id="price-status" aria-label="报价完整状态"><option value="">全部报价</option><option value="priced" ${state.status==='priced'?'selected':''}>已填直播价</option><option value="missing" ${state.status==='missing'?'selected':''}>直播价待补</option></select></label><label>排序<select id="price-sort" aria-label="价格排序">${[['source','原表顺序'],['name','产品名称'],['price-asc','直播价从低到高'],['price-desc','直播价从高到低']].map(([v,t])=>`<option value="${v}" ${state.sort===v?'selected':''}>${t}</option>`).join('')}</select></label><button class="button quiet" data-price-reset>重置筛选</button></div><div id="price-selection"></div><div id="price-results" aria-live="polite"></div></article>
   <p class="section-note">${priced} 条已填直播价，${count-priced} 条直播价待补。每行对应原表的一条规格报价，同名产品的不同机制和价格分别保留。价格明细可查看结算、运费和原表备注。</p><div class="proposal-note"><strong>按你的模板，一键下载提报表</strong><p>勾选所需规格，点击“生成提报表”。发货城市优先使用原表，缺失时可补充；现货库存留空，可在“补充提报信息”填写；默认混场、全国，其余指定字段填“\\”。公司、品牌和售后等默认填写；产品图片及付款比例图直接嵌入 Excel，可离线查看。</p><p class="price-photo-note">${state.catalog.imageInfo?.matched||0} / ${count} 条报价已匹配产品图片。图片来自已保存的价格表副本及已核验产品原图；在线刷新更新文字和价格。未匹配的产品可在“补充提报信息”上传图片，用于本次下载。</p></div>`;
  renderResults();
 }
 function renderResults(){
  const rows=matched(),pages=Math.max(1,Math.ceil(rows.length/15));state.page=Math.max(1,Math.min(state.page,pages));
  const current=rows.slice((state.page-1)*15,state.page*15),checked=current.length&&current.every(e=>state.selected.has(e.id));
  element.querySelector('#price-selection').innerHTML=`<div class="price-selection"><div><strong>${rows.length} 条结果</strong><span>已选 ${state.selected.size} 条规格</span><button data-price-only class="${state.onlySelected?'active':''}">${state.onlySelected?'查看全部结果':'只看已选'}</button>${state.selected.size?'<button data-price-clear>清空已选</button>':''}</div><div><button class="button outline small" data-price-edit-selected ${state.selected.size?'':'disabled'}>补充提报信息</button><button class="button primary small" data-price-export ${state.selected.size?'':'disabled'}>${icon('download')} 生成提报表${state.selected.size?`（${state.selected.size}）`:''}</button></div></div>`;
  element.querySelector('#price-results').innerHTML=`<div class="price-table-scroll"><table class="price-table"><thead><tr><th class="price-check"><input type="checkbox" id="price-select-page" aria-label="选择本页全部规格" ${checked?'checked':''}></th><th>产品与直播机制</th><th class="num">直播价</th><th class="num">裸价<small>不含运</small></th><th class="num">含运价</th><th>来源 / 厂家</th><th>操作</th></tr></thead><tbody>${current.map(e=>`<tr data-price-row="${esc(e.id)}" class="${state.selected.has(e.id)?'is-selected':''}"><td class="price-check"><input type="checkbox" data-price-select="${esc(e.id)}" aria-label="选择 ${esc(e.name)} ${esc(e.mechanism)}" ${state.selected.has(e.id)?'checked':''}></td><td><div class="price-product-cell">${photoMarkup(e)}<div class="price-product-copy"><button class="price-product-name" data-price-detail="${esc(e.id)}">${esc(e.name)}</button><div class="price-mechanism">${esc(e.mechanism||'直播机制待补')}</div>${e.notes?`<div class="price-row-note">${esc(e.notes)}</div>`:''}</div></div></td><td class="num price-live">${price(e.livePrice)}</td><td class="num">${price(e.barePrice)}</td><td class="num">${price(e.deliveredPrice)}</td><td class="price-source-cell"><span class="chip">${esc(e.sheetTitle)}</span><small>${esc(proposalValues(e).D||'厂家名称待补')}</small>${e.shippingCity?`<small class="price-shipping-city">发货：${esc(e.shippingCity)}</small>`:''}</td><td><div class="price-row-actions"><button data-price-detail="${esc(e.id)}">价格明细 ↗</button><button data-price-edit="${esc(e.id)}">补充提报信息</button><button data-price-single="${esc(e.id)}">下载提报表 ↓</button></div></td></tr>`).join('')||'<tr><td colspan="7" class="no-results">没有找到匹配报价，试试减少关键词或重置筛选。</td></tr>'}</tbody></table></div><div class="table-footer"><span>${rows.length?`${(state.page-1)*15+1}–${Math.min(state.page*15,rows.length)}`:'0'} / ${rows.length} 条 · 可跨页勾选</span><div class="pager"><button data-price-prev ${state.page<=1?'disabled':''} aria-label="价格上一页">‹</button><span>${state.page} / ${pages}</span><button data-price-next ${state.page>=pages?'disabled':''} aria-label="价格下一页">›</button></div></div>`;
  const select=element.querySelector('#price-select-page');select.indeterminate=current.some(e=>state.selected.has(e.id))&&!checked;
 }
 function detail(entry){
  dialog.innerHTML=`<div class="dialog-head"><div><span class="eyebrow">PRICE DETAILS</span><h2>${esc(entry.name)}</h2><p>${esc(entry.sheetTitle)} · 原表第 ${entry.row} 行</p></div><button class="dialog-close" data-price-close aria-label="关闭">×</button></div><div class="dialog-body">${photo(entry)?`<div class="price-detail-product">${photoMarkup(entry,'large')}<div><strong>${esc(proposalValues(entry).E||'品牌待补')}</strong><p>${esc(proposalValues(entry).D||'厂家待补')}</p></div></div>`:''}<div class="price-detail-hero"><div><small>直播价</small><strong>${price(entry.livePrice)}</strong></div><div><small>裸价</small><strong>${price(entry.barePrice)}</strong></div><div><small>含运价</small><strong>${price(entry.deliveredPrice)}</strong></div></div><dl class="price-detail-fields">${entry.fields.map(f=>`<div><dt>${esc(f.label)}</dt><dd>${typeof f.value==='number'?(f.key==='margin'?`${(f.value*100).toFixed(2)}%`:['quantity'].includes(f.key)?f.value:price(f.value)):esc(f.value||'待补')}</dd></div>`).join('')}</dl><div class="dialog-actions"><span class="text-muted">保留原表报价，网站不修改源文档</span><button class="button outline" data-price-edit="${esc(entry.id)}">补充提报信息</button><button class="button primary" data-price-single="${esc(entry.id)}">${icon('download')} 下载提报表</button></div></div>`;if(!dialog.open)dialog.showModal();
 }
 function edit(entries){
  if(!entries.length)return;
  const first=entries[0],values=proposalValues(first,state.drafts[first.id]),moneyCols=new Set(['K','L','M']),images=new Set(['H','U','AC']);
  dialog.innerHTML=`<div class="dialog-head"><div><span class="eyebrow">PRODUCT SUBMISSION</span><h2>补充提报信息</h2><p>${entries.length>1?`批量补充 ${entries.length} 条规格；只改动填写过的字段，产品名称、机制和价格分别保留。`:esc(first.name)+' · '+esc(first.mechanism)}</p></div><button class="dialog-close" data-price-close aria-label="关闭">×</button></div><form id="proposal-form" class="dialog-body"><div class="proposal-form-hint">发货城市按原表自动填写，缺失时可补充；现货库存留空。不同产品的原表地址分别保留，可手动修改。补充信息仅用于本次下载，不改写企业微信原表。</div>${entries.length===1?`<div class="proposal-photo-editor"><div id="proposal-photo-preview">${photo(first)?`<img src="${esc(photo(first).dataUrl)}" alt="${esc(first.name)} 产品图片">`:'<span>产品图片待补</span>'}</div><div><strong>产品图片 · 自动嵌入提报表</strong><p>可上传或更换此条规格的图片，仅用于本次下载。</p><label class="button outline small">${photo(first)?'更换图片':'上传图片'}<input id="proposal-photo-upload" type="file" accept="image/jpeg,image/png" aria-label="上传产品图片"></label></div></div>`:''}<details class="proposal-payment"><summary>付款比例 · 默认嵌入你提供的比例表图片</summary><div id="proposal-payment-preview">正在加载图片…</div></details><div class="proposal-fields">${proposalColumns.filter(([c])=>c!=='O'&&!images.has(c)&&(entries.length===1||!['D','E','F','G','I','J','K','L','M'].includes(c))).map(([c,label])=>`<label class="${['B','S'].includes(c)?'proposal-priority':''}"><span>${esc(label)}${['B','S'].includes(c)&&entries.some(e=>{const v=proposalValues(e,state.drafts[e.id])[c];return v===null||v===undefined||v==='';})?'<em>待补充</em>':''}</span><input name="${c}" data-proposal-field="${c}" ${moneyCols.has(c)||c==='S'?'type="number" step="any"':'type="text"'} value="${esc(entries.length===1?values[c]??'':entries.every(e=>proposalValues(e,state.drafts[e.id])[c]===values[c])?values[c]??'':'')}" placeholder="${c==='B'?'填写发货城市':c==='S'?'填写现货库存':'留空可在下载后补充'}"></label>`).join('')}</div><p class="section-note">产品图片和付款比例图会随文件下载；产品手卡可下载后补充。毛利率按（直播价 − 含运价）÷ 直播价自动计算。未填写或直播价为零时留空。</p><div class="dialog-actions"><span class="text-muted">保留模板全部 32 列和类目子表</span><button type="submit" class="button outline" name="action" value="save">保存补充信息</button><button type="submit" class="button primary" name="action" value="download">${icon('download')} 保存并下载</button></div></form>`;
  const preview=dialog.querySelector('#proposal-payment-preview');getTemplate().then(t=>{if(preview.isConnected)preview.innerHTML=`<img src="${esc(t.paymentImage.dataUrl)}" alt="付款比例表">`;}).catch(error=>{if(preview.isConnected)preview.textContent=error.message;});
  dialog.querySelector('#proposal-photo-upload')?.addEventListener('change',async event=>{
   const file=event.target.files[0];if(!file)return;
   const buttons=[...dialog.querySelectorAll('button[type="submit"]')];buttons.forEach(b=>b.disabled=true);
   try{state.photos[first.id]=await uploadPhoto(file);dialog.querySelector('#proposal-photo-preview').innerHTML=`<img src="${esc(state.photos[first.id].dataUrl)}" alt="${esc(first.name)} 产品图片">`;renderResults();toast('图片已补充，将嵌入此条规格的提报表。');}catch(error){toast(error.message);}finally{buttons.forEach(b=>b.disabled=false);event.target.value='';}
  });
  const dirty=new Set();dialog.querySelector('form').addEventListener('input',event=>{if(event.target.dataset.proposalField)dirty.add(event.target.name);});
  dialog.querySelector('form').addEventListener('submit',event=>{
   event.preventDefault();const form=new FormData(event.target);
   for(const entry of entries){const draft={...state.drafts[entry.id]};for(const col of dirty){const value=String(form.get(col)??'').trim();draft[col]=(moneyCols.has(col)||col==='S')&&value!==''?Number(value):value;}state.drafts[entry.id]=draft;}
   dialog.close();if(event.submitter?.value==='download')download(entries);else toast('补充信息已保存，可生成提报表。');
  });if(!dialog.open)dialog.showModal();
 }
 async function download(entries){
  if(!entries.length){toast('请先勾选需要提报的规格');return;}
  const buttons=[...document.querySelectorAll('[data-price-export],[data-price-single]')];buttons.forEach(b=>b.disabled=true);
  try{
   const template=await getTemplate(),bytes=createProposalWorkbook(entries,template,state.drafts,{...state.catalog.images,...state.photos}),url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})),a=document.createElement('a');
   a.href=url;a.download=`柏悦臻选产品提报表_${new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'})}_${entries.length}条.xlsx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);toast(`已生成 ${entries.length} 条规格提报表，${entries.filter(photo).length} 张产品图及付款比例图已嵌入。`);
  }catch(error){toast(error.message||'提报表生成失败，请重试。');}finally{buttons.forEach(b=>b.disabled=false);renderResults();}
 }
 function click(event){
  const t=event.target.closest('button');if(!t)return;
  const find=id=>all().find(e=>e.id===id);
  if(t.dataset.priceSheet!==undefined){state.sheet=t.dataset.priceSheet;state.supplier='';state.page=1;render();}
  if(t.hasAttribute('data-price-reset')){Object.assign(state,{search:'',sheet:'',supplier:'',status:'',sort:'source',onlySelected:false,page:1});render();}
  if(t.hasAttribute('data-price-only')){state.onlySelected=!state.onlySelected;state.page=1;renderResults();}
  if(t.hasAttribute('data-price-clear')){state.selected.clear();renderResults();}
  if(t.hasAttribute('data-price-prev')){state.page--;renderResults();}
  if(t.hasAttribute('data-price-next')){state.page++;renderResults();}
  if(t.hasAttribute('data-price-export'))download(selected());
  if(t.hasAttribute('data-price-edit-selected'))edit(selected());
  if(t.hasAttribute('data-price-close'))dialog.close();
  if(t.dataset.priceDetail){const e=find(t.dataset.priceDetail);if(e)detail(e);}
  if(t.dataset.priceEdit){const e=find(t.dataset.priceEdit);if(e)edit([e]);}
  if(t.dataset.priceSingle){const e=find(t.dataset.priceSingle);if(e)download([e]);}
 }
 element.addEventListener('click',click);dialog.addEventListener('click',click);
 element.addEventListener('input',event=>{if(event.target.id==='price-search'){state.search=event.target.value;state.page=1;renderResults();}});
 element.addEventListener('change',event=>{
  const t=event.target;
  if(t.dataset.priceSelect){t.checked?state.selected.add(t.dataset.priceSelect):state.selected.delete(t.dataset.priceSelect);renderResults();}
  if(t.id==='price-select-page'){for(const e of matched().slice((state.page-1)*15,state.page*15))t.checked?state.selected.add(e.id):state.selected.delete(e.id);renderResults();}
  const field={'price-supplier':'supplier','price-status':'status','price-sort':'sort'}[t.id];if(field){state[field]=t.value;state.page=1;renderResults();}
 });
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 return {update};
}
