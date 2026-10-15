export const cloud=document.querySelector('meta[name="data-mode"]')?.content==='cloud';
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

export async function requestData(){
  if(!cloud)return jsonRequest('./api/data');
  const url=new URL(snapshotURL);url.searchParams.set('v',Date.now());
  const data=await jsonRequest(url);
  if(!Array.isArray(data?.records)||!Array.isArray(data.products)||!data.fetchedAt)throw Error('云端数据格式不完整，请稍后刷新重试。');
  return {data,status:{running:false,error:null,message:'已载入云端最新发布数据'}};
}
export async function requestStatus(){return cloud?{running:false,error:null}:jsonRequest('./api/status');}
export async function requestRefresh(){
  if(cloud)return requestData();
  return jsonRequest('./api/refresh',{method:'POST',headers:{'X-Product-Dashboard':'1'}});
}
