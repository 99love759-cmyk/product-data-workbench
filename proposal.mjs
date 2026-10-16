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
export function proposalValues(entry,overrides={}){
 const ylj=entry.sheetTitle==='悦龄集',xy=entry.sheetTitle?.startsWith('星跃');
 const values={A:'混场',B:entry.shippingCity||'',C:'全国',D:ylj?'四川万鑫未来科技有限公司':xy?'四川风驰星跃电子商务有限公司':entry.supplier||'',E:ylj?'悦龄集':entry.brand||'',F:entry.category||'',G:entry.name,I:entry.nature||'',J:entry.mechanism||'',N:'\\',R:'\\',S:'',W:'\\',X:'\\',Y:'\\',Z:'\\',AA:'\\',AB:'\\',
 P:'比如偏远地区一个收货地址xx斤以下，加收xx费用',Q:'1≥单量',
 AD:'30天',AE:'门店-云仓-工厂（注意云仓只能中转点货，不具备任何保管货物完整和冷藏冷冻功能）',AF:'以产品笔记为准'};
 for(const [col,field] of [['K','livePrice'],['L','barePrice'],['M','deliveredPrice']])values[col]=typeof entry[field]==='number'?entry[field]:'';
 // Settlement per smallest unit and per order are not a dropshipping quotation.
 return {...values,...overrides};
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
