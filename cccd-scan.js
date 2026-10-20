/* STEP161 – local-only Vietnamese citizen-ID QR helper. No raw QR payload leaves the device. */
(()=>{
'use strict';
const form=document.querySelector('#attForm')||document.querySelector('#form')||document.querySelector('form');
if(!form)return;
const isAttendance=!!document.querySelector('#attForm');
const target=form.querySelector('input[name="worker_name"]')||document.querySelector('#name');
if(!target)return;
const wrap=document.createElement('section');wrap.className='cccdscan';
wrap.innerHTML=`<div class="cccd-head"><strong>Quét CCCD để điền nhanh</strong><span>Đọc mã QR trên thẻ CCCD · xử lý trực tiếp trên thiết bị</span></div><div class="cccd-controls"><button type="button" id="cccdCamera">📷 Quét bằng camera</button><label class="cccd-upload">🖼 Chọn ảnh mã QR<input type="file" id="cccdPhoto" accept="image/*" hidden></label><button type="button" id="cccdStop" hidden>Dừng camera</button></div><video id="cccdVideo" playsinline muted hidden></video><div id="cccdResult" role="status" aria-live="polite">Mã nhân viên và các thông tin chưa có trên CCCD vẫn phải nhập thủ công.</div>`;
form.insertBefore(wrap,form.firstElementChild);
const css=document.createElement('style');css.textContent=`.cccdscan{border:1px solid #bbd4f8;border-radius:14px;padding:14px;background:#f2f7ff;margin:12px 0 16px}.cccd-head{display:flex;flex-wrap:wrap;align-items:center;gap:7px 12px}.cccd-head strong{font-size:14px;color:#154eac}.cccd-head span{font-size:11px;color:#526a8b}.cccd-controls{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.cccd-controls button,.cccd-upload{display:inline-flex;align-items:center;justify-content:center;width:auto;margin:0;min-height:38px;padding:9px 12px;border-radius:9px;background:#216be0;color:white;cursor:pointer;font-size:12px;font-weight:700}.cccd-controls #cccdStop{background:#64748b}.cccd-upload{background:#e3eeff;color:#144eac;border:1px solid #b9d4fa}#cccdVideo{width:100%;max-height:280px;object-fit:contain;background:#111;border-radius:10px;margin-top:10px}#cccdResult{font-size:12px;color:#425a7c;margin-top:10px;white-space:pre-wrap}`;document.head.appendChild(css);
const info=wrap.querySelector('#cccdResult'),video=wrap.querySelector('#cccdVideo'),cam=wrap.querySelector('#cccdCamera'),stopBtn=wrap.querySelector('#cccdStop');
let stream=null,running=false;
const setMsg=(m,err=false)=>{info.textContent=m;info.style.color=err?'#b42342':'#425a7c'};
const setField=(el,val)=>{if(el&&val){el.value=val;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}};
const qrFormat=(raw)=>{
 const v=String(raw||'').trim();
 // The common VN CCCD QR payload is CCCD|oldID|fullName|DDMMYYYY|sex|address|DDMMYYYY.
 const p=v.split('|').map(x=>x.trim());
 if(p.length<6||!/^[0-9]{12}$/.test(p[0]))throw Error('Đây không phải QR CCCD định dạng được hỗ trợ.');
 const birth=p[3];let dob='';
 if(/^\d{8}$/.test(birth)){const d=birth.slice(0,2),m=birth.slice(2,4),y=birth.slice(4);const date=new Date(`${y}-${m}-${d}T00:00:00`);if(date.getFullYear()===+y&&date.getMonth()===+m-1&&date.getDate()===+d)dob=`${d}/${m}/${y}`}
 return {cccd:p[0],name:p[2],dob,gender:/^nam|male$/i.test(p[4])?'Nam':/^nữ|nu|female$/i.test(p[4])?'Nữ':'',address:p[5]||''};
};
function applyText(text){let d;try{d=qrFormat(text)}catch(e){setMsg(e.message,true);return false}
 setField(target,d.name);if(!isAttendance){setField(document.getElementById('cccd'),d.cccd);setField(document.getElementById('dob'),d.dob);setField(document.getElementById('gender'),d.gender);setField(document.getElementById('address'),d.address)}
 setMsg(isAttendance?'Đã điền họ tên từ QR CCCD. Vui lòng nhập mã nhân viên, chọn KTX và xác nhận trước khi gửi.':'Đã điền những trường đọc được từ CCCD. Vui lòng kiểm tra kỹ thông tin và điền các trường còn thiếu trước khi gửi.');stop();return true;
}
async function loadDecoder(){if('BarcodeDetector'in window){try{const fmt=await BarcodeDetector.getSupportedFormats();if(fmt.includes('qr_code'))return 'native'}catch(e){}}
 if(window.jsQR)return 'jsqr';await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';s.onload=resolve;s.onerror=()=>reject(Error('Không tải được thư viện đọc mã QR.'));document.head.appendChild(s)});return 'jsqr'}
let backend=null;
async function decodeCanvas(canvas){if(backend==='native'){const det=new BarcodeDetector({formats:['qr_code']});const codes=await det.detect(canvas);return codes[0]?.rawValue||''}
 const ctx=canvas.getContext('2d',{willReadFrequently:true});const image=ctx.getImageData(0,0,canvas.width,canvas.height);return window.jsQR(image.data,image.width,image.height)?.data||''}
function stop(){running=false;if(stream){stream.getTracks().forEach(x=>x.stop());stream=null}video.srcObject=null;video.hidden=true;stopBtn.hidden=true}
stopBtn.onclick=()=>{stop();setMsg('Đã dừng quét.')} ;window.addEventListener('pagehide',stop);
cam.onclick=async()=>{try{if(!navigator.mediaDevices?.getUserMedia)throw Error('Trình duyệt không hỗ trợ camera trên trang này.');backend=await loadDecoder();stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});video.srcObject=stream;video.hidden=false;stopBtn.hidden=false;await video.play();running=true;setMsg('Đưa mã QR trên CCCD vào giữa khung hình.');const canvas=document.createElement('canvas');const tick=async()=>{if(!running)return;try{if(video.readyState>=2){const scale=Math.min(1,900/video.videoWidth);canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);const code=await decodeCanvas(canvas);if(code&&applyText(code))return}}catch(e){}if(running)requestAnimationFrame(tick)};requestAnimationFrame(tick)}catch(e){stop();setMsg('Không mở được camera: '+(e.message||e)+'. Anh có thể chọn ảnh QR hoặc nhập thủ công.',true)}};
wrap.querySelector('#cccdPhoto').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{backend=await loadDecoder();const bitmap=await createImageBitmap(f);const canvas=document.createElement('canvas');const scale=Math.min(1,1800/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();const value=await decodeCanvas(canvas);if(!value)throw Error('Không đọc được mã QR trong ảnh.');applyText(value)}catch(err){setMsg(err.message||String(err),true)}finally{e.target.value=''}};
})();
