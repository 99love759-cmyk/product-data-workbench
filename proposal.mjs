// The public site fills a prepared copy of the supplied template in the browser.
// No upload or local server is needed to download an Excel workbook.
export const proposalColumns=[
 ['A','场次属性'],['B','发货城市'],['C','可直播城市（精确到区）'],['D','签合同的厂家公司名称'],['E','品牌'],['F','品类'],
 ['G','品牌 + 产品名称'],['H','产品图片'],['I','产品性质'],['J','直播机制（规格 + 数量）'],['K','直播价'],['L','裸价（不含运不含税）'],
 ['M','含运价（含运不含税）'],['N','一键代发价格'],['O','毛利率（自动计算）'],['P','偏远运费加收与物流'],['Q','按含运价结算的单量条件'],
 ['R','产品 69 码'],['S','现货库存'],['T','发货是否混发'],['U','产品手卡'],['V','背书与卖点'],['W','助播'],['X','助播身份证人像面'],
 ['Y','助播身份证国徽面'],['Z','商务对接人'],['AA','商家对接人'],['AB','商家电话'],['AC','付款比例'],['AD','售后期'],['AE','退货方案'],['AF','有效期与保质期']
];
export const proposalImageColumns=new Set(['H','U','X','Y','AC']);
export const proposalCategories=['悦龄集商品（不限类目）','美妆护肤','食品饮料','日用百货','食疗滋补','家居家纺','医疗健康','厨卫家电','鞋服箱包','珠宝首饰'];
const categoryText=value=>String(value??'').normalize('NFKC').replace(/\s+/g,'').trim();
const sourceCategoryRules=[
 ['美妆护肤',/美妆|护肤|个护|化妆|美容/],['食品饮料',/食品|饮料|饮品|零食|粮油|调味/],
 ['日用百货',/日用|百货|家清|清洁|洗涤|日化/],['食疗滋补',/食疗|滋补|营养保健|保健食品/],
 ['家居家纺',/家居|家纺|床品|布艺/],['医疗健康',/医疗|健康|医药|器械/],
 ['厨卫家电',/厨卫|家电|厨具|电器/],['鞋服箱包',/鞋|服饰|服装|箱包/],['珠宝首饰',/珠宝|首饰|饰品|玉石/]
];
// Product use precedes ingredients and brand words: 洗衣粉 is not food,
// 维生素E乳 is skincare, and 阿胶水晶枣 is a snack rather than an 阿胶块.
const productCategoryRules=[
 ['珠宝首饰',/手串|手链|项链|吊坠|平安扣|金镶玉|玉髓|和田玉|翡翠|玛瑙|戒指|耳环|耳钉|玉镯|珠宝|首饰|翠云如意/],
 ['鞋服箱包',/丝袜|冰袖|内衣|内裤|衬衫|羽绒服|外套|裤子|运动鞋|拖鞋|皮鞋|袜子|围巾|皮带|背包|手提包|旅行箱|行李箱/],
 ['家居家纺',/床单|被套|被芯|棉被|枕头|枕芯|枕套|毛巾|浴巾|地毯|窗帘|床垫|沙发|桌椅|靠垫/],
 ['日用百货',/洗衣|凝珠|除螨|清洁|油污净|管道|速通粉|疏通|洁厕|果蔬净|洗洁|蚊香|牙膏|牙刷|漱口|梳子|水杯|杯子|手提袋|纸巾|垃圾袋|保鲜袋|手机贴|钱币|香炉|檀香|沉香|泡洗粉|搓泥宝/],
 ['美妆护肤',/洗面|洁面|面霜|面膜|护肤|护手|补水|保湿|精华|维生素e乳|嫩肤乳|身体乳|sod|花露水|凡士林|舒缓棒|洗发|护发|沐浴|香皂|羊脂皂|口红|眉笔|粉底|防晒/iu],
 ['医疗健康',/医疗|血压计|血糖|体温计|制氧|轮椅|医用|创可贴|纱布|退热|止痛|牙痛宁|口腔抑菌喷|护眼贴|眼贴|冰敷眼罩|蒸汽眼罩|颈肩贴|鼻舒贴|三伏贴|消暑贴|养护贴|足贴|足部护理|清足护理|脚汗|脚臭|发热护膝|热敷|舒腹宝|痔康|肛门|竹叶清.*抑菌液/],
 ['厨卫家电',/打粉机|破壁机|榨汁机|电饭|电热水壶|烧水壶|空气炸锅|电磁炉|烤箱|冰箱|洗衣机|油烟机|热水器|电风扇|吸尘器|剃须刀|钛筷|筷子|炒锅|蒸锅|餐具|菜刀|砧板/],
 ['日用百货',/眼镜|老视镜|墨镜/],
 ['食品饮料',/奶枣|水晶枣|金丝枣|虎皮枣|红枣圈|山楂条|山楂糕|小米酥|饼|粽子|奶贝|奶片|威化|紫薯软干|红薯片|润喉糖|罐头|鹌鹑蛋|鸡蛋|火腿|面条|龙须面|长寿面|芹菜面|枸杞面|苦瓜.*面|粉丝|腐竹|豆皮|木耳|海带丝|糯米笋|调味|料酒|米醋|陈醋|有机醋|蚝油|沙拉汁|凉拌汁|沙司|香油|亚麻籽油|玉米油|稻米油|火麻油|酱油|辣椒|孜然|五香粉|椒盐|胡椒粉|花椒粉|鸡精|土鸡鲜精|松茸鲜|味极鲜|炖肉王|十全味香|饮料|豆浆粉|纯牛奶|全脂乳粉|牛奶粉|核桃粉|藕粉|百合粉|玉米糊|燕麦|玉米片|小麦胚芽|奶粉伴侣|大麦若叶|白桦树汁|沙棘原浆|葡萄酒|枸杞酒|代用茶/],
 ['食疗滋补',/阿胶|人参|西洋参|红参|黄芪|党参|黄精|虫草|灵芝|燕窝|石斛|五黑|八珍|养元粉|气血|茯苓粉|茯苓.*膏|百合膏|枇杷膏|化橘红膏|元气膏|胶原|蛋白肽|蛋白粉|免疫球蛋白|舒养粉|高钙|液体钙|益生菌|益生元|牛初乳|凝胶糖果|胶囊|金银花|芹菜籽粉|芹籽硒养粉|黄瓜籽粉|枸杞原浆|枸杞|黑芝麻丸/],
 ['食品饮料',/茶|饮品|饮料|谷物|杂粮|芝麻粉|蔬菜/],['日用百货',/礼盒|包装盒/]
];
export function proposalCategory(entry){
 const raw=String(entry.category??'').trim(),normalized=categoryText(raw);
 const exact=proposalCategories.find(c=>categoryText(c)===normalized);
 if(exact)return {value:exact,source:'原表品类'};
 const sourceMatch=sourceCategoryRules.find(([,rule])=>rule.test(normalized));
 if(sourceMatch)return {value:sourceMatch[0],source:'原表品类匹配'};
 if(/悦龄集/.test(entry.sheetTitle||'')||categoryText(entry.brand)==='悦龄集')return {value:proposalCategories[0],source:'悦龄集品牌匹配'};
 for(const [text,source] of [[entry.name,'产品名称匹配'],[entry.mechanism,'产品规格匹配']]){
  const match=productCategoryRules.find(([,rule])=>rule.test(categoryText(text)));
  if(match)return {value:match[0],source};
 }
 return {value:raw,source:raw?'原表品类':'暂未识别'};
}
// Categories belong to the product, so a row reorder, quote or pack-size change
// must not assign a saved correction to a different product.
export function proposalProductKey(entry){return JSON.stringify([entry.sheetTitle,entry.brand,entry.name].map(categoryText));}
export function proposalValues(entry,overrides={}){
 const ylj=entry.sheetTitle==='悦龄集',xy=entry.sheetTitle?.startsWith('星跃');
 const values={A:'混场',B:entry.shippingCity||'',C:'全国',D:ylj?'四川万鑫未来科技有限公司':xy?'四川风驰星跃电子商务有限公司':entry.supplier||'',E:ylj?'悦龄集':entry.brand||'',F:proposalCategory(entry).value,G:entry.name,I:entry.nature||'',J:entry.mechanism||'',N:'\\',R:'\\',S:'',W:'\\',X:'\\',Y:'\\',Z:'\\',AA:'\\',AB:'\\',
 P:'比如偏远地区一个收货地址xx斤以下，加收xx费用',Q:'1≥单量',
 AD:'30天',AE:'门店-云仓-工厂（注意云仓只能中转点货，不具备任何保管货物完整和冷藏冷冻功能）',AF:'以产品笔记为准'};
 for(const [col,field] of [['K','livePrice'],['L','barePrice'],['M','deliveredPrice']])values[col]=typeof entry[field]==='number'?entry[field]:'';
 // Settlement per smallest unit and per order are not a dropshipping quotation.
 return {...values,...overrides,F:overrides.F||values.F};
}
export function proposalFilename(entries,overrides={}){
 const names=[...new Set(entries.map(entry=>String(proposalValues(entry,overrides[entry.id]).G||entry.name||'').replace(/[^\p{L}\p{N}]/gu,'')))].join('');
 const encoder=new TextEncoder();let stem='',bytes=5;
 // Leave room for the Excel extension within the usual 255-byte filename limit.
 for(const char of `柏悦臻选产品提报表${names}`){const size=encoder.encode(char).length;if(bytes+size>255)break;stem+=char;bytes+=size;}
 return `${stem}.xlsx`;
}
const xml=value=>String(value??'').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function dataRow(entry,index,styles,overrides){
 const values=proposalValues(entry,overrides),row=index+3;
 return `<row r="${row}" ht="190" customHeight="1">${proposalColumns.map(([col])=>{
  const style=styles[col]===undefined?'':` s="${styles[col]}"`,ref=`${col}${row}`;
  if(col==='O'){
   const k=values.K,m=values.M,margin=typeof k==='number'&&typeof m==='number'&&k!==0?(k-m)/k:null;
   return `<c r="${ref}"${style}${margin===null?' t="str"':''}><f>IF(OR(K${row}="",M${row}="",K${row}=0),"",(K${row}-M${row})/K${row})</f><v>${margin===null?'':margin}</v></c>`;
  }
  const value=values[col];
  if(typeof value==='number'&&Number.isFinite(value))return `<c r="${ref}"${style}><v>${value}</v></c>`;
  if(value===undefined||value===null||value==='')return `<c r="${ref}"${style}/>`;
  return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
 }).join('')}</row>`;
}
const encoder=new TextEncoder();
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let crc=0xffffffff;for(const b of bytes)crc=crcTable[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
function block(size){const bytes=new Uint8Array(size);return {bytes,view:new DataView(bytes.buffer)};}
// Stored ZIP entries keep this small exporter independent of third-party CDNs.
export function zipFiles(files){
 const chunks=[],central=[];let offset=0;
 for(const file of files){
  const name=encoder.encode(file.path),data=typeof file.content==='string'?encoder.encode(file.content):file.content,crc=crc32(data);
  const local=block(30+name.length);local.view.setUint32(0,0x04034b50,true);local.view.setUint16(4,20,true);local.view.setUint16(6,0x800,true);local.view.setUint16(12,0x21,true);local.view.setUint32(14,crc,true);local.view.setUint32(18,data.length,true);local.view.setUint32(22,data.length,true);local.view.setUint16(26,name.length,true);local.bytes.set(name,30);
  chunks.push(local.bytes,data);
  const dir=block(46+name.length);dir.view.setUint32(0,0x02014b50,true);dir.view.setUint16(4,20,true);dir.view.setUint16(6,20,true);dir.view.setUint16(8,0x800,true);dir.view.setUint16(14,0x21,true);dir.view.setUint32(16,crc,true);dir.view.setUint32(20,data.length,true);dir.view.setUint32(24,data.length,true);dir.view.setUint16(28,name.length,true);dir.view.setUint32(42,offset,true);dir.bytes.set(name,46);central.push(dir.bytes);offset+=local.bytes.length+data.length;
 }
 const centralSize=central.reduce((n,b)=>n+b.length,0),end=block(22);end.view.setUint32(0,0x06054b50,true);end.view.setUint16(8,files.length,true);end.view.setUint16(10,files.length,true);end.view.setUint32(12,centralSize,true);end.view.setUint32(16,offset,true);
 const bytes=new Uint8Array(offset+centralSize+22);let at=0;for(const chunk of [...chunks,...central,end.bytes]){bytes.set(chunk,at);at+=chunk.length;}return bytes;
}
function embeddedImage(image){
 if(!image)return null;
 const match=/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(image.dataUrl||'');
 if(!match||!Number.isFinite(image.width)||!Number.isFinite(image.height)||image.width<=0||image.height<=0)throw Error('产品图片格式无效，请重新补图。');
 return {...image,extension:match[1]==='jpeg'?'jpg':'png',bytes:Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0))};
}
function workbookPictures(entries,template,images){
 const media=[],relationships=[],anchors=[],known=new Map();let index=0;
 const add=(input,col,row,maxWidth,maxHeight)=>{
  const image=embeddedImage(input);if(!image)return;
  let asset=known.get(image.dataUrl);
  if(!asset){asset={id:`rIdImage${media.length+1}`,path:`xl/media/proposal-${media.length+1}.${image.extension}`};known.set(image.dataUrl,asset);media.push({path:asset.path,content:image.bytes});relationships.push(`<Relationship Id="${asset.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${asset.path.split('/').at(-1)}"/>`);}
  const ratio=Math.min(maxWidth/image.width,maxHeight/image.height),w=Math.round(image.width*ratio),h=Math.round(image.height*ratio),id=++index;
  // A picture belongs to its product row and moves with that row in Excel.
  anchors.push(`<xdr:oneCellAnchor><xdr:from><xdr:col>${col}</xdr:col><xdr:colOff>${Math.round((maxWidth-w)/2+6)*9525}</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>${Math.round((maxHeight-h)/2+6)*9525}</xdr:rowOff></xdr:from><xdr:ext cx="${w*9525}" cy="${h*9525}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${id}" name="${col===7?'产品图片':'付款比例'} ${row+1}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="${asset.id}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${w*9525}" cy="${h*9525}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`);
 };
 entries.forEach((entry,i)=>{add(images[entry.id]||images[entry.imageId],7,i+2,130,240);add(template.paymentImage,28,i+2,345,240);});
 if(!anchors.length)return [];
 return [...media,{path:'xl/drawings/proposal.xml',content:`<?xml version="1.0" encoding="UTF-8"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${anchors.join('')}</xdr:wsDr>`},{path:'xl/drawings/_rels/proposal.xml.rels',content:`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships.join('')}</Relationships>`}];
}
export function createProposalWorkbook(entries,template,overrides={},images={}){
 if(!entries.length)throw Error('请先勾选需要提报的产品规格。');
 if(!Array.isArray(template?.parts)||!template.sheetPath||!template.rowStyles)throw Error('提报模板未完整加载，请重试。');
 const rows=entries.map((entry,i)=>dataRow(entry,i,template.rowStyles,overrides[entry.id])).join(''),last=entries.length+2;
 const pictures=workbookPictures(entries,template,images);
 const files=template.parts.map(part=>{
  let content=part.text;
  if(part.path===template.sheetPath){
   const header=(content.match(/<sheetData[^>]*>([\s\S]*?)<\/sheetData>/)||[])[1]?.match(/<row\b[^>]*\br="[12]"[^>]*>[\s\S]*?<\/row>/g)?.join('');
   if(!header)throw Error('提报模板表头不完整，请重试。');
   content=content.replace(/<sheetData[^>]*>[\s\S]*?<\/sheetData>/,`<sheetData>${header}${rows}</sheetData>`)
    .replace(/<dimension ref="[^"]+"\s*\/>/,`<dimension ref="A1:AF${last}"/>`)
    .replace(/(<autoFilter\b[^>]*ref=")[^"]+("[^>]*>)/,`$1A2:AF${last}$2`)
    .replace(/sqref="([A-Z]+)3:([A-Z]+)10"/g,(_,a,b)=>`sqref="${a}3:${b}${last}"`);
   if(pictures.length)content=content.replace('</worksheet>','<drawing xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rIdProposalPictures"/></worksheet>');
  }
  if(part.path==='[Content_Types].xml'&&pictures.length)content=content.replace('</Types>','<Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="png" ContentType="image/png"/><Override PartName="/xl/drawings/proposal.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>');
  if(part.path==='xl/workbook.xml')content=content.replace(/('?(?:提报表)'?!\$A\$2:\$[A-Z]+\$)10/g,`$1${last}`);
  return {path:part.path,content:content??Uint8Array.from(atob(part.base64),c=>c.charCodeAt(0))};
 });
 if(pictures.length)files.push({path:'xl/worksheets/_rels/sheet1.xml.rels',content:'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdProposalPictures" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/proposal.xml"/></Relationships>'},...pictures);
 return zipFiles(files);
}
