export const cloud=document.querySelector('meta[name="data-mode"]')?.content==='cloud';
const snapshotURL=new URL('./snapshot.json',import.meta.url);
const keyStore='product-workbench-access-v1';
let cloudData=null;
const decode=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
const encode=bytes=>btoa(String.fromCharCode(...bytes));

async function decrypt(envelope,bytes){
  const key=await crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['decrypt']);
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(envelope.iv)},key,decode(envelope.ciphertext));
  const data=JSON.parse(new TextDecoder().decode(plain));
  if(!Array.isArray(data.records)||!data.fetchedAt)throw Error('数据格式不完整。');
  return data;
}

async function unlock(envelope){
  if(envelope.version!==1||envelope.iterations!==310000||envelope.kdf!=='PBKDF2-SHA256')throw Error('数据版本不兼容，请重新打开网站。');
  try{
    const saved=JSON.parse(sessionStorage.getItem(keyStore));
    if(saved?.salt===envelope.salt)return await decrypt(envelope,decode(saved.key));
  }catch{}
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.className='access-dialog';
    dialog.innerHTML='<form><div class="access-mark">▥</div><h2>产品数据工作台</h2><p>输入访问密码，查看产品表现与备货建议。</p><label for="access-password">访问密码</label><input id="access-password" name="password" type="password" autocomplete="current-password" maxlength="128" required placeholder="请输入分享人提供的密码"><p class="access-error" role="alert"></p><button class="button primary" type="submit">进入工作台</button><small>数据更新后会自动载入；本页不需要分享人的电脑在线。</small></form>';
    dialog.addEventListener('cancel',e=>e.preventDefault());
    document.body.append(dialog);dialog.showModal();
    const form=dialog.querySelector('form'),button=form.querySelector('button'),input=form.querySelector('input'),error=form.querySelector('.access-error');
    form.addEventListener('submit',async event=>{
      event.preventDefault();button.disabled=true;button.textContent='正在打开…';error.textContent='';
      try{
        const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(input.value),'PBKDF2',false,['deriveBits']);
        const bytes=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:decode(envelope.salt),iterations:envelope.iterations,hash:'SHA-256'},material,256));
        const data=await decrypt(envelope,bytes);
        try{sessionStorage.setItem(keyStore,JSON.stringify({salt:envelope.salt,key:encode(bytes)}));}catch{}
        input.value='';dialog.close();dialog.remove();resolve(data);
      }catch{error.textContent='密码不正确，或数据暂时未完整加载，请重试。';button.disabled=false;button.textContent='进入工作台';input.focus();}
    });
  });
}

async function jsonRequest(url,options){
  const response=await fetch(url,{cache:'no-store',...options});
  if(!response.ok)throw Error(cloud?'无法读取云端数据，请检查网络后重试。':'无法连接本机服务，请重新打开启动文件。');
  return response.json();
}

export async function requestData(){
  if(!cloud)return jsonRequest('./api/data');
  const url=new URL(snapshotURL);url.searchParams.set('v',Date.now());
  const envelope=await jsonRequest(url);
  cloudData=await unlock(envelope);
  return {data:cloudData,status:{running:false,error:null,message:'已载入云端最新发布数据'}};
}
export async function requestStatus(){return cloud?{running:false,error:null}:jsonRequest('./api/status');}
export async function requestRefresh(){
  if(cloud)return requestData();
  return jsonRequest('./api/refresh',{method:'POST',headers:{'X-Product-Dashboard':'1'}});
}
