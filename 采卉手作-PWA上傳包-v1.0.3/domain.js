/* 采卉手作 · versioned, relational local data model. No network dependencies. */
(function(root){
'use strict';
const KEY='caihui-craft-manager-v1';
const STATUS=['未開課','準備招生','招生中','已成班','已額滿','已完成','取消'];
const MATERIALS=['布料裁切','棉繩','車線','配件','材料分裝','樣品','縫紉機','剪刀','尺','熨斗'];
const PREP=['已確認課程主題','已完成作品樣品','已拍作品照片','已確認2小時可完成','已確認材料成本','已準備材料包','已確認工具','已完成教學流程','已設定招生人數','已確認場地'];
const uid=()=>globalThis.crypto?.randomUUID?.()||('id-'+Date.now()+'-'+Math.random().toString(36).slice(2));
const date=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const clone=x=>JSON.parse(JSON.stringify(x));
const fail=m=>{throw new Error(m)};
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&date(new Date(x+'T12:00:00'))===x;
const amount=x=>Number.isFinite(x)&&x>=0&&x<=1000000;
const active=(db,cid)=>db.enrollments.filter(e=>e.sessionId===cid&&!e.cancelled);
const kit=(db,c)=>db.materialKits.find(k=>k.id===c.kitId);
const status=(db,c)=>['未開課','準備招生','已成班','已額滿','已完成','取消'].includes(c.status)?c.status:active(db,c.id).length>=c.capacity?'已額滿':active(db,c.id).length>=c.minimum?'已成班':'招生中';
const packageEnrollments=(db,p)=>db.enrollments.filter(e=>e.packageId===p.id&&!e.cancelled);
const used=(db,p)=>packageEnrollments(db,p).filter(e=>e.attended).length;
const relatedPayments=(db,e)=>db.payments.filter(p=>!p.void&&(p.enrollmentId===e.id||(e.packageId&&p.packageId===e.packageId)));
const paid=(db,e)=>relatedPayments(db,e).every(p=>p.paid);
function blank(){return {schemaVersion:1,revision:0,templates:[],sessions:[],students:[],enrollments:[],payments:[],packages:[],materialKits:[],createdAt:new Date().toISOString()}}
function template(db,name,level,low,high,price,cost,index){const k={id:uid(),name:name+'材料包',contents:['表布、裡布、棉繩','花布、鋪棉、車線','表布、裡布、配件','帆布、提把、車線'][index],cost,price};db.materialKits.push(k); const t={id:uid(),name,level,difficulty:level==='零基礎'?'★ 簡單':'★★ 入門',description:'用喜歡的布色，慢慢完成生活裡的小美好。小班教學，依每位學員的步調練習。',tools:'縫紉機、剪刀、尺、熨斗（店內提供）',notes:'',start:'13:00',end:'15:00',minimum:2,capacity:4,kitId:k.id,photo:'',reference:`$${low}–${high}`};db.templates.push(t);return t}
function seed(today=date()){
const db=blank(); const ts=[template(db,'束口收納袋','零基礎',100,150,150,80,0),template(db,'布杯墊','零基礎',80,120,120,60,1),template(db,'面紙套','初階',120,180,180,100,2),template(db,'簡易提袋','初階',180,250,250,150,3)];
let d=new Date(today+'T12:00:00');d.setDate(d.getDate()+(2-d.getDay()+7)%7);const tue=date(d);d.setDate(d.getDate()+2);const thu=date(d);
for(let i=0;i<2;i++){let k={...clone(kit(db,ts[i])),id:uid(),demo:true};db.materialKits.push(k);db.sessions.push({...clone(ts[i]),id:uid(),templateId:ts[i].id,kitId:k.id,date:i?thu:tue,status:'招生中',materials:MATERIALS.map(()=>i?false:true),prep:PREP.map(()=>true),demo:true})}
['王小姐','陳小姐','林小姐'].forEach((name,i)=>{let s={id:uid(),name,nickname:'',phone:'',lineName:name,notes:'示範學員，可於設定移除。',demo:true};db.students.push(s);enroll(db,{studentId:s.id,sessionIds:[db.sessions[0].id],plan:'single',paid:i<2,materialNote:['粉色','綠色','米色'][i],demo:true,purchasedAt:today})});return db;
}
function enroll(db,input){
const {studentId,sessionIds,plan}=input;
if(!db.students.some(s=>s.id===studentId))fail('請先選擇學員');
if(!Array.isArray(sessionIds)||new Set(sessionIds).size!==sessionIds.length)fail('請選擇不同的課程');
let pkg=null;
if(plan==='pair'&&sessionIds.length!==2)fail('兩堂方案必須指定兩堂課');
if(plan==='single'&&sessionIds.length!==1)fail('單堂方案請選一堂課');
if(!['single','pair','existing'].includes(plan))fail('方案無效');
if(plan==='existing'){pkg=db.packages.find(p=>p.id===input.packageId&&p.studentId===studentId);if(!pkg||sessionIds.length!==1||packageEnrollments(db,pkg).length>=2)fail('此方案沒有可補選的名額')}
for(const id of sessionIds){const c=db.sessions.find(c=>c.id===id);if(!c||['取消','已完成','未開課','已額滿'].includes(c.status))fail('課程尚未開放或已結束');if(active(db,id).length>=c.capacity)fail(c.name+' 已額滿');if(active(db,id).some(e=>e.studentId===studentId))fail('這位學員已報名此課程')}
const when=input.purchasedAt||date();if(!validDate(when))fail('購買日期無效');
if(plan==='pair'){pkg={id:uid(),studentId,purchasedAt:when,totalSessions:2,price:800,demo:!!input.demo};db.packages.push(pkg);db.payments.push({id:uid(),studentId,packageId:pkg.id,enrollmentId:null,kind:'tuition',amount:800,paid:!!input.paid,paidAt:input.paid?when:null,createdAt:when,void:false,demo:!!input.demo})}
let result=[];
for(const sid of sessionIds){const c=db.sessions.find(c=>c.id===sid),k=kit(db,c);const e={id:uid(),studentId,sessionId:sid,packageId:pkg?.id||null,attended:false,cancelled:false,materialNote:input.materialNote||'',notes:input.notes||'',materialCost:k.cost,materialPrice:k.price,createdAt:when,demo:!!input.demo};db.enrollments.push(e);result.push(e);
for(const [kind,value] of (pkg?[['material',k.price]]:[['tuition',500],['material',k.price]])){db.payments.push({id:uid(),studentId,packageId:null,enrollmentId:e.id,kind,amount:value,paid:!!input.paid,paidAt:input.paid?when:null,createdAt:when,void:false,demo:!!input.demo})}}
return result;
}
function setPaid(db,eid,value){const e=db.enrollments.find(e=>e.id===eid);if(!e||e.cancelled)fail('報名已取消');for(const p of relatedPayments(db,e)){if(p.paid!==value){p.paid=value;p.paidAt=value?date():null}}}
function cancel(db,eid){const e=db.enrollments.find(e=>e.id===eid);if(!e||e.cancelled)return;e.cancelled=true;e.attended=false;db.payments.filter(p=>p.enrollmentId===eid&&!p.paid).forEach(p=>p.void=true)}
function stats(db,month){const cs=db.sessions.filter(c=>c.date.startsWith(month)&&!['取消','未開課'].includes(c.status));const es=db.enrollments.filter(e=>!e.cancelled&&cs.some(c=>c.id===e.sessionId));const ps=db.payments.filter(p=>p.paid&&!p.void&&p.paidAt?.startsWith(month));const tuition=ps.filter(p=>p.kind==='tuition').reduce((a,p)=>a+p.amount,0),material=ps.filter(p=>p.kind==='material').reduce((a,p)=>a+p.amount,0),cost=es.reduce((a,e)=>a+e.materialCost,0);return {courses:cs.length,students:es.length,tuition,material,cost,profit:material-cost,total:tuition+material,outstanding:db.payments.filter(p=>!p.paid&&!p.void).reduce((a,p)=>a+p.amount,0)}}
function removeDemo(db){
// Keep any demo record referenced by real work, to protect added registrations.
const keepE=db.enrollments.filter(e=>!e.demo);const keepS=new Set(keepE.map(e=>e.studentId)),keepC=new Set(keepE.map(e=>e.sessionId)),keepP=new Set(keepE.map(e=>e.packageId));
db.enrollments=db.enrollments.filter(e=>!e.demo);db.payments=db.payments.filter(p=>!p.demo||keepP.has(p.packageId)||keepE.some(e=>e.id===p.enrollmentId));db.packages=db.packages.filter(p=>!p.demo||keepP.has(p.id));db.sessions=db.sessions.filter(c=>!c.demo||keepC.has(c.id));db.students=db.students.filter(s=>!s.demo||keepS.has(s.id));const ids=new Set([...db.templates,...db.sessions].map(c=>c.kitId));db.materialKits=db.materialKits.filter(k=>!k.demo||ids.has(k.id));for(const group of ['sessions','students','packages','payments','materialKits'])db[group].forEach(x=>delete x.demo);
}
function validate(raw){
const d=clone(raw);if(!d||d.schemaVersion!==1)fail('不支援的備份版本');
const groups=['templates','sessions','students','enrollments','payments','packages','materialKits'];
for(const g of groups){if(!Array.isArray(d[g])||d[g].length>20000)fail('備份缺少資料表：'+g);const ids=new Set();for(const x of d[g]){if(!x||typeof x.id!=='string'||!/^[-A-Za-z0-9_]{1,100}$/.test(x.id)||ids.has(x.id))fail('備份含無效或重複 ID');ids.add(x.id)}}
const has=(g,id)=>d[g].some(x=>x.id===id);const str=(o,k,max=20000)=>{if(typeof o[k]!=='string'||o[k].length>max)fail('備份欄位無效：'+k)};
for(const k of d.materialKits){str(k,'name');str(k,'contents');if(!amount(k.cost)||!amount(k.price))fail('材料金額無效')}
for(const c of [...d.templates,...d.sessions]){for(const k of ['name','level','difficulty','description','tools','notes','photo'])str(c,k,k==='photo'?500000:20000);if(!c.name.trim()||!has('materialKits',c.kitId))fail('課程或材料關聯無效');if(c.photo&&!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(c.photo))fail('照片格式無效');if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.end)||c.start>=c.end)fail('課程時間無效');if(!Number.isInteger(c.minimum)||!Number.isInteger(c.capacity)||c.minimum<1||c.capacity<c.minimum||c.capacity>100)fail('人數設定無效')}
for(const c of d.sessions){if(!validDate(c.date)||!STATUS.includes(c.status))fail('課程日期或狀態無效');for(const [k,len] of [['materials',10],['prep',10]])if(!Array.isArray(c[k])||c[k].length!==len||c[k].some(x=>typeof x!=='boolean'))fail('檢查清單無效');if(active(d,c.id).length>c.capacity)fail('報名超出課程人數上限')}
for(const s of d.students){for(const k of ['name','nickname','phone','lineName','notes'])str(s,k);if(!s.name.trim())fail('學員姓名不可空白')}
for(const p of d.packages){if(!has('students',p.studentId)||p.totalSessions!==2||p.price!==800||!validDate(p.purchasedAt)||packageEnrollments(d,p).length>2)fail('兩堂方案資料無效')}
const duplicates=new Set();for(const e of d.enrollments){if(!has('students',e.studentId)||!has('sessions',e.sessionId)||!amount(e.materialCost)||!amount(e.materialPrice)||typeof e.cancelled!=='boolean'||typeof e.attended!=='boolean')fail('報名關聯無效');str(e,'materialNote');str(e,'notes');if(e.packageId&&!d.packages.some(p=>p.id===e.packageId&&p.studentId===e.studentId))fail('報名方案關聯無效');if(!e.cancelled){const key=e.studentId+'|'+e.sessionId;if(duplicates.has(key))fail('同一學員重複報名');duplicates.add(key)}}
for(const p of d.payments){if(!has('students',p.studentId)||!['tuition','material'].includes(p.kind)||!amount(p.amount)||typeof p.paid!=='boolean'||typeof p.void!=='boolean'||!validDate(p.createdAt)||(p.paid&&!validDate(p.paidAt))||p.paid&&p.void)fail('付款紀錄無效');if(p.packageId){if(p.enrollmentId||!d.packages.some(x=>x.id===p.packageId&&x.studentId===p.studentId)||p.kind!=='tuition'||p.amount!==800)fail('方案付款無效')}else if(!d.enrollments.some(e=>e.id===p.enrollmentId&&e.studentId===p.studentId))fail('付款報名關聯無效')}
for(const p of d.packages)if(d.payments.filter(x=>x.packageId===p.id).length!==1)fail('方案費重複或缺漏');
for(const e of d.enrollments){const ps=d.payments.filter(p=>p.enrollmentId===e.id);if(ps.filter(p=>p.kind==='material').length!==1||ps.filter(p=>p.kind==='tuition').length!==(e.packageId?0:1))fail('報名費用重複或缺漏');if(ps.some(p=>p.amount!==(p.kind==='tuition'?500:e.materialPrice)))fail('報名費用不一致')}
if(!Number.isInteger(d.revision)||d.revision<0)fail('資料版本無效');return d;
}
root.Craft={KEY,STATUS,MATERIALS,PREP,uid,date,clone,validDate,blank,seed,kit,active,status,used,packageEnrollments,relatedPayments,paid,enroll,setPaid,cancel,stats,removeDemo,validate};
if(typeof module!=='undefined')module.exports=root.Craft;
})(typeof window==='undefined'?globalThis:window);
