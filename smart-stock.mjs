import {estimateStock,stockIndex,stockSuggestions,resolveStockTarget} from './stock-engine.mjs?v=27';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>v==null?'—':Number(v).toLocaleString('zh-CN',{maximumFractionDigits:0});
const pct=v=>v==null?'—':(v*100).toLocaleString('zh-CN',{maximumFractionDigits:2})+'%';
const defaults=()=>({name:'',choiceId:'',audience:'',buffer:10,referenceKey:'',mechanismKey:'',quoteId:'',customRate:'',quantities:{},stock:{}});
const storageKey='workbench-smart-stock-v1';
export function createSmartStock({element,csvDownload,toast,photo}){
 let data=null,plan=defaults(),result=null,open=false,active=-1,matches=[],composing=false,renderedData=null,legacy=null;
 try{const saved=JSON.parse(localStorage.getItem(storageKey));if(saved&&typeof saved.name==='string')plan={...plan,...saved};else legacy=JSON.parse(localStorage.getItem('yue-stock-plan-v2'));}catch{}
 const $=id=>element.querySelector('#'+id);
 const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(plan));}catch{}};
 function shell(){
  element.innerHTML=`<div class="smart-stock-layout"><section class="panel smart-stock-inputs"><div class="smart-stock-heading"><span class="smart-step">01</span><div><h2>这次卖什么</h2><p>卖过的自动用历史，新品自动找同类。</p></div></div><label class="sr-only" for="smart-product">产品名称</label><div class="smart-picker"><input id="smart-product" type="text" value="${esc(plan.name)}" placeholder="输入产品，例如藕粉、百合粉" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="smart-product-list" autocomplete="off" enterkeyhint="next"><button id="smart-picker-toggle" type="button" aria-label="展开产品选择" tabindex="-1">⌄</button><div id="smart-product-menu" class="smart-product-menu" hidden><div id="smart-product-list" role="listbox" aria-label="匹配产品"></div><button id="smart-use-new" type="button"></button></div></div><div id="smart-match" class="smart-match" aria-live="polite"></div><div class="smart-stock-heading smart-second-step"><span class="smart-step">02</span><div><h2>直播间多少人</h2><p>填写本次预计峰值在线人数。</p></div></div><label class="sr-only" for="smart-audience">预计峰值在线人数</label><div class="smart-audience-wrap"><input id="smart-audience" type="number" min="1" step="1" inputmode="numeric" value="${esc(plan.audience)}" placeholder="例如 1000"><span>人</span></div><p class="smart-auto-hint">输入后直接计算，无需选择计算模式。</p><details id="smart-settings" class="smart-settings"><summary>更多设置 <span>规格 · 库存 · 安全余量</span></summary><div id="smart-settings-content"></div><button id="smart-reset" class="button quiet small" type="button">恢复默认设置</button></details></section><div id="smart-result" class="smart-stock-output" aria-live="polite" aria-atomic="true"></div></div>`;
  $('smart-settings').addEventListener('toggle',()=>{open=$('smart-settings').open;});
  $('smart-product').addEventListener('focus',()=>suggest());
  $('smart-product').addEventListener('compositionstart',()=>composing=true);
  $('smart-product').addEventListener('compositionend',()=>{composing=false;inputProduct();});
  refresh();
 }
 function inputProduct(){
  if(composing)return;
  Object.assign(plan,{name:$('smart-product').value,choiceId:'',referenceKey:'',mechanismKey:'',quoteId:'',quantities:{},stock:{},customRate:''});
  refresh();suggest();
 }
 function suggest(){
  const query=$('smart-product').value;matches=stockSuggestions(data,query);active=-1;
  $('smart-product-list').innerHTML=matches.map((p,i)=>`<button id="smart-option-${i}" type="button" role="option" aria-selected="${p.id===plan.choiceId}" data-smart-choice="${i}">${photo(p)}<span><strong>${esc(p.name)}</strong><small>${p.sold?`已售卖 · ${p.sessionCount} 场有效历史`:'产品目录 · 暂无本品历史'}${p.group?' · '+esc(p.group):''}</small></span></button>`).join('')||'<p class="smart-no-match">没有同名产品，可继续输入新品名称。</p>';
  $('smart-use-new').hidden=!query.trim();$('smart-use-new').textContent=`使用“${query.trim()}”自动匹配历史 / 同类`;
  $('smart-product-menu').hidden=false;$('smart-product').setAttribute('aria-expanded','true');$('smart-product').removeAttribute('aria-activedescendant');
  positionMenu();
 }
 function positionMenu(){
  const menu=$('smart-product-menu');if(!menu||menu.hidden)return;
  const rect=$('smart-product').getBoundingClientRect(),viewport=window.visualViewport,top=viewport?.offsetTop||0,bottom=top+(viewport?.height||innerHeight),below=bottom-rect.bottom-12,above=rect.top-top-12;
  const up=below<150&&above>below;menu.dataset.side=up?'above':'below';menu.style.maxHeight=`${Math.max(80,Math.min(310,up?above:below))}px`;
 }
 function closeMenu(){if(!$('smart-product-menu'))return;$('smart-product-menu').hidden=true;$('smart-product').setAttribute('aria-expanded','false');$('smart-product').removeAttribute('aria-activedescendant');active=-1;}
 function choose(index){const p=matches[index];if(!p)return;Object.assign(plan,{name:p.name,choiceId:p.id,referenceKey:'',mechanismKey:'',quoteId:'',customRate:'',quantities:{},stock:{}});$('smart-product').value=p.name;closeMenu();refresh();$('smart-audience').focus();}
 function renderSettings(){
  const target=result.target,refs=stockIndex(data).filter(p=>p.sold&&p.sessionCount&&p.id!==target.id),mechanisms=target.mechanisms||[],quotes=target.catalog||[];
  $('smart-settings-content').innerHTML=`${mechanisms.length?`<label class="field"><span>本次售卖规格</span><select id="smart-mechanism">${mechanisms.map(m=>`<option value="${esc(m.mechanismKey)}" ${result.mechanismKey===m.mechanismKey?'selected':''}>${esc(m.mechanism)}</option>`).join('')}</select></label>`:quotes.length?`<label class="field"><span>产品目录规格</span><select id="smart-quote"><option value="">自动 / 默认数量</option>${quotes.map(q=>`<option value="${esc(q.id)}" ${q.id===plan.quoteId?'selected':''}>${esc(q.mechanism||q.name)}${typeof q.livePrice==='number'?' · ¥'+q.livePrice:''}</option>`).join('')}</select></label>`:''}<p class="smart-spec-note">${esc(result.quantityNote||'选择产品后可调整每单数量。')}</p>${result.components.map((c,i)=>`<div class="smart-component-setting"><strong>${esc(c.name)}</strong><div class="two-fields"><label class="field"><span>每单数量</span><input data-smart-quantity="${i}" type="number" inputmode="numeric" min="1" step="1" value="${esc(c.quantity)}"></label><label class="field"><span>可用库存</span><input data-smart-stock="${i}" type="number" inputmode="numeric" min="0" step="1" value="${esc(c.stock)}"></label></div></div>`).join('')}<label class="field"><span>安全余量（%）</span><input id="smart-buffer" type="number" min="0" max="200" value="${esc(plan.buffer)}"></label>${(target.sessionCount||0)<3?`<label class="field"><span>同类参考</span><select id="smart-reference"><option value="">自动推荐用途相近商品</option>${refs.map(p=>`<option value="${esc(p.key)}" ${p.key===plan.referenceKey?'selected':''}>${esc(p.name)} · ${esc(p.group)}</option>`).join('')}</select><small>自动匹配最多 3 款同类；手动选择后只参考所选商品。</small></label>`:''}<label class="field"><span>手动转化率（%，可选）</span><input id="smart-rate" type="number" min="0" step="any" value="${esc(plan.customRate)}" placeholder="留空自动估算"><small>手动输入会覆盖系统估算，并标明为手动假设。</small></label>`;
  $('smart-settings').open=open;
 }
 function refresh(settings=true){
  result=estimateStock(data,plan);save();
  const t=result.target,hasName=Boolean(t.name),refs=result.references;
  $('smart-match').innerHTML=!hasName?'可输入搜索，也可点击下拉选择。':t.ambiguous?'发现多个同名产品，请从下拉列表选择。':t.sold?`<span class="smart-match-dot"></span><strong>已匹配本品</strong> · ${t.sessionCount} 场有效历史${t.bundle?' · 组合品':''}`:refs.length?`<span class="smart-match-dot"></span><strong>自动参考${esc(t.category||'相近商品')}</strong> · ${refs.length} 款已售商品`:'暂无可靠同类，可在更多设置中补选参考。';
  const componentRows=result.components.map(c=>`<div class="smart-stock-item"><div><strong>${esc(c.name)}</strong><small>每单 ${fmt(c.quantity)} 件 · 含余量 ${fmt(c.target)} 件 · 库存 ${fmt(c.stock)} 件</small></div><b>${fmt(c.purchase)}<small>件</small></b></div>`).join('');
  const manual=result.source==='手动假设',usedRefs=!manual&&result.source!=='本品历史'?refs:[];
  $('smart-result').innerHTML=`${result.error?`<article class="panel smart-empty"><span class="smart-empty-icon">${hasName?'↗':'✦'}</span><h2>${!hasName?'备多少，直接看':!plan.audience&&result.rate!==null?'再填人数，即可出结果':'还需要一点信息'}</h2><p>${esc(result.error)}</p>${hasName&&result.rate===null?'<button id="smart-open-settings" type="button" class="button outline small">选择参考商品</button>':''}</article>`:`<article class="smart-stock-hero"><div class="smart-hero-top"><span>本次建议备货${result.components.length>1?' · 组件合计':''}</span><span class="smart-estimate-tag">${esc(result.source)}</span></div><div class="smart-purchase">${fmt(result.purchase)}<small>件</small></div><p>含 ${fmt(result.buffer)}% 安全余量，已扣减可用库存</p><div class="smart-hero-metrics"><div><span>预计订单</span><strong>${fmt(result.expectedOrders)}<small> 单</small></strong></div><div><span>参考转化率</span><strong>${pct(result.rate)}</strong></div><div><span>峰值在线人数</span><strong>${fmt(result.audience)}<small> 人</small></strong></div></div>${result.lowEvidence?'<div class="smart-evidence-note">试算建议 · 历史较少或使用同类参考，实际售卖可能有明显波动。</div>':''}</article><article class="panel smart-stock-list"><div class="smart-list-title"><h2>${t.bundle?'按组合组件准备':'备货清单'}</h2><button id="smart-export" class="button outline small">导出清单</button></div>${componentRows}<p class="smart-spec-note">${esc(result.mechanism)}。${esc(result.quantityNote)}</p><button id="smart-edit" type="button">调整规格、库存和余量 ↗</button></article>`}${hasName&&!t.ambiguous?`<details class="panel smart-basis"><summary>为什么建议这个数量 <span>${esc(result.source||'等待参考')}</span></summary><div class="smart-basis-content"><p>${manual?'本次使用手动转化率，历史与同类基准不参与当前计算。':result.notes.map(esc).join(' ')}</p>${usedRefs.length?`<h3>采用的参考商品</h3>${usedRefs.map(p=>`<div class="smart-reference-card"><strong>${esc(p.name)}</strong><span>${esc(p.reason)} · ${esc(p.group)}</span><small>${p.sessionCount} 场有效历史 · 基准转化率 ${pct(p.rate)}${p.bundle?' · 参考为组合订单，赠品不带入新品备货':''}</small></div>`).join('')}`:''}<p>预计订单 = 向上取整（峰值在线人数 × 参考转化率）。各组件分别计算：向上取整（预计订单 × 每单数量 × 安全系数），再减库存，最低为 0。</p><p>历史覆盖全部直播间和售卖规格；同日期、时间、主播合并为一场。样本少的折减和融合是备货规则，不是统计置信保证。</p><p>源数据更新时间：${esc(data.fetchedAt?new Date(data.fetchedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'未知')}</p>${!manual?`<div class="smart-history-evidence">${[...(t.history?[t]:[]),...usedRefs].map(p=>`<h3>${esc(p.name)} · ${p.sessionCount} 场</h3>${(p.history?.samples||[]).map(s=>`<div><span>${esc(s.date)} ${esc(s.time)} · ${esc(s.anchor)}<small>${esc(s.rooms.join('、'))} · ${fmt(s.orders)} 单 / ${fmt(s.peak)} 人</small></span><b>${pct(s.rate)}</b></div>`).join('')}`).join('')}</div>`:''}</div></details>`:''}`;
  if(settings)renderSettings();
 }
 element.addEventListener('input',event=>{
  const t=event.target;if(t.id==='smart-product'){inputProduct();return;}
  const fields={'smart-audience':'audience','smart-buffer':'buffer','smart-rate':'customRate'};
  if(fields[t.id]){plan[fields[t.id]]=t.value;refresh(false);return;}
  const index=t.dataset.smartQuantity??t.dataset.smartStock,c=result?.components[Number(index)];
  if(index!==undefined&&c){plan[t.dataset.smartQuantity!==undefined?'quantities':'stock'][c.name]=t.value;refresh(false);}
 });
 element.addEventListener('change',event=>{
  const t=event.target,fields={'smart-mechanism':'mechanismKey','smart-quote':'quoteId','smart-reference':'referenceKey'};
  if(fields[t.id]){plan[fields[t.id]]=t.value;plan.quantities={};plan.customRate='';refresh();}
 });
 element.addEventListener('click',event=>{
  const t=event.target.closest('button');if(!t)return;
  if(t.dataset.smartChoice!==undefined){choose(Number(t.dataset.smartChoice));return;}
  if(t.id==='smart-use-new'){closeMenu();$('smart-audience').focus();return;}
  if(t.id==='smart-picker-toggle'){$('smart-product').focus();suggest();return;}
  if(['smart-edit','smart-open-settings'].includes(t.id)){open=true;$('smart-settings').open=true;$('smart-settings').scrollIntoView({behavior:'smooth',block:'center'});return;}
  if(t.id==='smart-reset'){const {name,choiceId,audience}=plan;plan={...defaults(),name,choiceId,audience};refresh();return;}
  if(t.id==='smart-export'&&!result.error){
   const rows=[['产品',result.target.name],['备货依据',result.source],['峰值在线人数',result.audience],['参考转化率',pct(result.rate)],['预计订单',result.expectedOrders],['安全余量',result.buffer+'%'],['源数据时间',data.fetchedAt],['计算说明',result.source==='手动假设'?'手动输入转化率':result.notes.join(' ')],[],['参考商品','业务','有效场次','商品基准转化率'],...(result.source!=='本品历史'&&result.source!=='手动假设'?result.references.map(p=>[p.name,p.group,p.sessionCount,pct(p.rate)]):[]),[],['组件','每单数量','需求数量','含余量备货','库存','需补备货'],...result.components.map(c=>[c.name,c.quantity,c.demand,c.target,c.stock,c.purchase])];
   csvDownload(result.target.name+'备货清单.csv',rows);toast('已导出备货数量和计算依据');
  }
 });
 element.addEventListener('keydown',event=>{
  if(event.target.id!=='smart-product'||composing||event.isComposing)return;
  if(event.key==='Escape'){closeMenu();return;}
  if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();if($('smart-product-menu').hidden)suggest();active=matches.length?(active+(event.key==='ArrowDown'?1:-1)+matches.length)%matches.length:-1;for(const [i,n] of [...$('smart-product-list').children].entries())n.classList.toggle('is-active',i===active);if(active>=0){$('smart-product').setAttribute('aria-activedescendant','smart-option-'+active);$('smart-option-'+active).scrollIntoView({block:'nearest'});}return;}
  if(event.key==='Enter'){event.preventDefault();if(active>=0)choose(active);else{closeMenu();$('smart-audience').focus();}}
 });
 document.addEventListener('pointerdown',event=>{if(!event.target.closest('.smart-picker'))closeMenu();});
 element.addEventListener('focusout',()=>queueMicrotask(()=>{if(!document.activeElement?.closest('.smart-picker'))closeMenu();}));
 window.addEventListener('resize',positionMenu,{passive:true});window.visualViewport?.addEventListener('resize',positionMenu,{passive:true});
 return {
  update(next){data=next;if(!data)return;if(renderedData===data&&$('smart-product'))return;
   if(legacy){const p=stockIndex(data).find(p=>p.key===legacy.productKey);if(legacy.audience||legacy.targetName){plan={...defaults(),...legacy,name:legacy.mode==='similar'?legacy.targetName:p?.name||'',choiceId:legacy.mode==='similar'?'':p?.id||'',referenceKey:legacy.mode==='similar'?legacy.referenceKey||'':''};}legacy=null;}
   const focused=element.contains(document.activeElement)?document.activeElement.id:'',selection=focused==='smart-product'?[$('smart-product').selectionStart,$('smart-product').selectionEnd]:null;
   renderedData=data;shell();if(focused&&$(focused)){$(focused).focus();if(selection)$(focused).setSelectionRange(...selection);}
  },
  planFor(key){if(!data)return;const p=stockIndex(data).find(p=>p.key===key);if(p){plan={...defaults(),name:p.name,choiceId:p.id};renderedData=null;}}
 };
}
