export const cloud=document.querySelector('meta[name="data-mode"]')?.content==='cloud';
export const remoteSource=cloud&&Boolean(document.querySelector('meta[name="data-api-url"]')?.content);
const apiBase=remoteSource?document.querySelector('meta[name="data-api-url"]').content.replace(/\/$/,''):'';
const snapshotURL=new URL('./snapshot.json',import.meta.url);
// Remove credentials left by the previous password-protected site. The current
// published snapshot opens directly in a fresh browser with no stored access.
try{sessionStorage.removeItem('product-workbench-access-v1');}catch{}

async function jsonRequest(url,options){
  try{
    const response=await fetch(url,{cache:'no-store',...options});
    if(!response.ok)throw Error();
    return await response.json();
  }catch{throw Error(cloud?'无法读取云端数据，请检查网络后重试。':'无法连接本机服务，请重新打开启动文件。');}
}

async function snapshot(){
  const url=new URL(snapshotURL);url.searchParams.set('v',Date.now());
  const data=await jsonRequest(url);
  if(!Array.isArray(data?.records)||!Array.isArray(data.products)||!data.fetchedAt)throw Error('云端数据格式不完整，请稍后刷新重试。');
  if(data.priceCatalog?.imageFiles?.length){
   const images=await Promise.all(data.priceCatalog.imageFiles.map(name=>{
    if(!/^product-photos-\d+\.json$/.test(name))throw Error('产品图片索引无效。');
    return jsonRequest(new URL(name,snapshotURL));
   }));
   data.priceCatalog.images=Object.assign({},...images);
  }
  return {data,status:{running:false,error:null,message:'已载入云端最新发布数据'}};
}
async function apiRequest(path,options){
 try{
  const response=await fetch(remoteSource?apiBase+path:'.'+path,{cache:'no-store',signal:AbortSignal.timeout(20000),...options});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'云端更新服务暂不可用，请稍后重试。');
  return result;
 }catch(error){throw Error(remoteSource?(error.message==='Failed to fetch'||error.name==='TimeoutError'?'无法连接云端更新服务，请检查网络后重试。':error.message):'无法连接本机服务，请重新打开启动文件。');}
}
export async function requestData(){
 if(!cloud||remoteSource){
  try{
   const payload=await apiRequest('/api/data');
   if(!payload.data?.fetchedAt||!Array.isArray(payload.data.records)||!Array.isArray(payload.data.products))throw Error('云端返回的数据不完整。');
   return payload;
  }catch(error){
   if(!remoteSource)throw error;
   const saved=await snapshot();return {...saved,status:{...saved.status,error:`${error.message} 已载入上次发布的数据。`}};
  }
 }
 return snapshot();
}
export async function requestStatus(){return cloud&&!remoteSource?{running:false,error:null}:apiRequest('/api/status');}
export async function requestRefresh(scope='all'){
  if(cloud&&!remoteSource)return requestData();
  return apiRequest('/api/refresh'+(scope==='all'?'':'?scope='+encodeURIComponent(scope)),{method:'POST',headers:{'X-Product-Dashboard':'1'}});
}
