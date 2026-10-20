// STEP149 Vercel Node Serverless API: server-side Supabase Admin API only.
// Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel Environment Variables.
const BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DOMAIN = 'users.ktx-hoc-mon.app'; // internal Auth identifier only; no email is sent
const cors = { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' };
const respond=(res,code,payload)=>{
 res.statusCode=code;
 for(const [name,value] of Object.entries(cors))res.setHeader(name,value);
 return res.end(JSON.stringify(payload));
};
const validUsername=s=>typeof s==='string' && /^[a-z][a-z0-9._-]{2,31}$/.test(s);
const safeArr=(v,choices)=>Array.isArray(v)&&v.length<=20&&v.every(x=>choices.includes(x));
async function sb(path,method='GET',body,token=KEY){
 const r=await fetch(`${BASE}${path}`,{method,headers:{apikey:KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json',Prefer:'return=representation'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const t=await r.text();let val;try{val=JSON.parse(t)}catch{val={message:t.slice(0,250)}};
 if(!r.ok){const e=new Error(val.msg||val.message||val.error_description||val.error||`HTTP ${r.status}`);e.status=r.status;throw e}return val;
}
module.exports=async function(req,res){
 if(req.method!=='POST')return respond(res,405,{error:'Chỉ hỗ trợ POST'});
 if(!BASE||!KEY)return respond(res,503,{error:'Server chưa cấu hình SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY'});
 try{
  const bearer=req.headers.authorization||'';
  if(!/^Bearer\s+\S+$/.test(bearer))return respond(res,401,{error:'Cần đăng nhập quản trị'});
  const jwt=bearer.replace(/^Bearer\s+/,'');
  const user=await sb('/auth/v1/user','GET',undefined,jwt);
  if(!user||!user.id)return respond(res,401,{error:'Phiên đăng nhập không hợp lệ'});
  const rows=await sb(`/rest/v1/app_accounts?user_id=eq.${encodeURIComponent(user.id)}&select=role,enabled`);
  if(!Array.isArray(rows)||rows.length!==1||rows[0].role!=='admin'||rows[0].enabled!==true)return respond(res,403,{error:'Chỉ tài khoản Admin đang hoạt động được tạo nhân viên'});
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  const {username,password,display_name,role,ktx,days}=body;
  if(!validUsername(username))return respond(res,400,{error:'Tên đăng nhập: 3–32 ký tự thường, bắt đầu bằng chữ, chỉ gồm a-z, 0-9, dấu chấm, gạch dưới và gạch ngang'});
  if(typeof password!=='string'||password.length<12||password.length>128)return respond(res,400,{error:'Mật khẩu ban đầu phải dài 12–128 ký tự'});
  if(typeof display_name!=='string'||display_name.trim().length<2||display_name.length>100)return respond(res,400,{error:'Họ và tên không hợp lệ'});
  if(!['manager','staff','guard','viewer'].includes(role))return respond(res,400,{error:'Vai trò không hợp lệ; không tạo Admin từ form thường'});
  if(!safeArr(ktx,['KTX 1','KTX 2'])||!safeArr(days,['Dãy 1','Dãy 2','Dãy 3','Dãy 4','Dãy 5','Dãy 6']))return respond(res,400,{error:'Phạm vi KTX/Dãy không hợp lệ'});
  const email=`${username}@${DOMAIN}`;
  let newUser=null;
  try {
   const auth=await sb('/auth/v1/admin/users','POST',{email,password,email_confirm:true,user_metadata:{display_name:display_name.trim(),username,change_password_required:true}});
   newUser=auth.user||auth;
   if(!newUser.id)throw new Error('Supabase Auth không trả về user ID');
   // An Auth trigger may already have inserted the corresponding app_accounts row.
   // PATCH first avoids duplicate primary keys from inserting the same user_id twice.
   const profile={email,display_name:display_name.trim(),role,ktx,days,enabled:true,updated_at:new Date().toISOString()};
   const filter=`/rest/v1/app_accounts?user_id=eq.${encodeURIComponent(newUser.id)}`;
   let records=await sb(filter,'PATCH',profile);
   if(!Array.isArray(records))throw new Error('Phản hồi hồ sơ tài khoản không hợp lệ');
   if(records.length===0){
    try{
     records=await sb('/rest/v1/app_accounts','POST',{user_id:newUser.id,...profile});
    }catch(insertError){
     // A concurrently running auth trigger can create the row after the first PATCH.
     if(!/duplicate key|23505|unique constraint/i.test(insertError.message||''))throw insertError;
     records=await sb(filter,'PATCH',profile);
    }
   }
   if(!Array.isArray(records)||records.length!==1||records[0].user_id!==newUser.id){
    throw new Error('Không lưu được phân quyền tài khoản chính xác; vui lòng kiểm tra trigger và app_accounts RLS');
   }
   return respond(res,201,{ok:true,user_id:newUser.id,username,role});
  }catch(e){
   if(newUser&&newUser.id){try{await sb(`/auth/v1/admin/users/${encodeURIComponent(newUser.id)}`,'DELETE')}catch(rollback){console.error('ACCOUNT_ROLLBACK_FAILED',newUser.id,rollback.message)}}
   throw e;
  }
 }catch(e){console.error('ADMIN_CREATE_FAILED',e.message);return respond(res,[400,401,403,409].includes(e.status)?e.status:500,{error:e.message||'Tạo tài khoản thất bại'})}
};
