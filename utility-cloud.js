/* STEP175 – user initiated Cloud backup, no automatic overwrite. */
(()=>{'use strict';
const modules={'so-tang-giam.html':'ktx_ledger167_v1','cosovatchat.html':'ktx_step169_cosovatchat','vs-vpp.html':'ktx_step169_vs-vpp','vipham-ncc.html':'ktx_step169_vipham-ncc','pccc.html':'ktx_step169_pccc'};
const moduleKey=modules[location.pathname.split('/').pop()];if(!moduleKey)return;
const status=document.createElement('div');status.style.cssText='font:12px/1.5 Arial,sans-serif;color:#28486e;margin:8px 0;white-space:pre-wrap';status.setAttribute('role','status');
const bar=document.createElement('div');bar.style.cssText='display:flex;gap:8px;flex-wrap:wrap;padding:10px;background:#eaf3ff;border:1px solid #cbdcf4;border-radius:12px;margin:10px 0';
function button(s){const b=document.createElement('button');b.type='button';b.textContent=s;b.style.cssText='padding:9px 12px;border-radius:8px;border:1px solid #a5bee3;background:#fff;color:#2054a0;font-weight:700;cursor:pointer';bar.append(b);return b}
const check=button('Kiểm tra Cloud'),push=button('Đưa lên Cloud'),pull=button('Tải từ Cloud');bar.append(status);
const target=document.querySelector('.toolbar')||document.querySelector('main')||document.body;target.insertAdjacentElement('afterend',bar);
let cachedVersion=null,cachedAt=null;
function read(){const raw=localStorage.getItem(moduleKey)||'[]';const data=JSON.parse(raw);if(!Array.isArray(data))throw Error('Dữ liệu cục bộ không phải danh sách');return data}
async function context(){
 const parentWindow=window.parent;
 if(parentWindow===window||typeof parentWindow.syncClient!=='function')throw Error('Hãy mở tiện ích từ ứng dụng KTX sau khi đăng nhập');
 const sb=parentWindow.syncClient();if(!sb)throw Error('Chưa cấu hình Supabase');
 const {data:auth,error:authError}=await sb.auth.getUser();if(authError||!auth.user)throw Error('Phiên đăng nhập đã hết hạn');
 const {data:account,error:accountError}=await sb.from('app_accounts').select('role,enabled').eq('user_id',auth.user.id).single();
 if(accountError||!account?.enabled||account.role!=='admin')throw Error('Chỉ Admin được chuyển dữ liệu tiện ích lên/xuống Cloud trong STEP175');
 return sb;
}
async function fetchRow(sb){const {data,error}=await sb.from('ktx_utility_snapshots').select('module_key,revision,updated_at,rows').eq('module_key',moduleKey).maybeSingle();if(error)throw error;return data}
function note(t){status.textContent=t}
async function inspect(){const sb=await context();const local=read(),remote=await fetchRow(sb);cachedVersion=remote?.revision??null;cachedAt=remote?.updated_at??null;note('Trên máy: '+local.length+' dòng | Cloud: '+(remote?.rows?.length??'chưa có')+' dòng | Phiên bản: '+(remote?.revision??'—')+' | Sửa: '+(remote?.updated_at??'—'));return{sb,local,remote}}
async function action(task){[check,push,pull].forEach(b=>b.disabled=true);try{await task()}catch(e){note('LỖI: '+(e?.message||String(e)))}finally{[check,push,pull].forEach(b=>b.disabled=false)}}
check.onclick=()=>action(inspect);
push.onclick=()=>action(async()=>{
 const {sb,local,remote}=await inspect();
 if(!local.length&&remote?.rows?.length)throw Error('Bảo vệ dữ liệu: không đưa danh sách rỗng lên đè dữ liệu Cloud');
 const message='ĐƯA LÊN CLOUD\nTrên máy: '+local.length+' dòng\nCloud: '+(remote?.rows?.length??0)+' dòng.\nViệc này thay thế bản Cloud của tiện ích. Tiếp tục?';
 if(!confirm(message))return;
 const {data:auth}=await sb.auth.getUser();let result;
 if(remote){result=await sb.from('ktx_utility_snapshots').update({rows:local,revision:remote.revision+1,updated_by:auth.user.id,updated_at:new Date().toISOString()}).eq('module_key',moduleKey).eq('revision',remote.revision).select('revision').maybeSingle();
 if(!result.error&&!result.data)throw Error('Cloud đã đổi từ máy khác. Kiểm tra lại trước khi ghi');
 }else{result=await sb.from('ktx_utility_snapshots').insert({module_key:moduleKey,rows:local,revision:1,updated_by:auth.user.id}).select('revision').single()}
 if(result.error)throw result.error;cachedVersion=result.data?.revision??null;note('Đã ghi lên Cloud và xác nhận phiên bản '+cachedVersion+' ('+local.length+' dòng).');
});
pull.onclick=()=>action(async()=>{
 const {sb,local,remote}=await inspect();if(!remote)throw Error('Cloud chưa có bản dữ liệu cho tiện ích');
 if(!Array.isArray(remote.rows))throw Error('Cloud trả về dữ liệu không hợp lệ');
 if(!confirm('TẢI TỪ CLOUD\nCloud: '+remote.rows.length+' dòng; trên máy: '+local.length+' dòng.\nThao tác này thay thế dữ liệu cục bộ, KHÔNG thay đổi Cloud. Tiếp tục?'))return;
 const backupKey=moduleKey+'_before_pull_'+Date.now();try{localStorage.setItem(backupKey,JSON.stringify(local));localStorage.setItem(moduleKey,JSON.stringify(remote.rows))}catch(e){throw Error('Không đủ dung lượng bộ nhớ; chưa làm mới dữ liệu: '+e.message)}
 note('Đã lấy '+remote.rows.length+' dòng từ Cloud; đã giữ bản cũ trên máy. Đang cập nhật màn hình.');location.reload();
});
})();