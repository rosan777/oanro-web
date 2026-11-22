'use strict';
const $=id=>document.getElementById(id),A=document.body.dataset.mode==='A',bn=()=> $('lang').value==='bn',t=(a,b)=>bn()?b:a;
let step=0,part=0,timer=0,paint=()=>{},rendererLabel='',syncCamera=()=>{};
const os=matchMedia('(prefers-reduced-motion: reduce)'),quiet=()=>os.matches||$('reduce').checked;
if(new URLSearchParams(location.search).get('lang')==='bn') $('lang').value='bn';
function story(){
 const abort=$('case').value==='abort',retry=$('case').value==='retry';
 const rows=[
 [t('Stage','প্রস্তুতি'),t('Stage the booking','বুকিং প্রস্তুত করুন'),t('The service opens a transaction for slot S-08. Booking B-041 is tentative. Other readers cannot see it yet.','সার্ভিস S-08 স্লটের জন্য লেনদেন খোলে। B-041 বুকিংটি এখনও অন্য পাঠকের কাছে দৃশ্যমান নয়।'),0],
 [t('Pair','জোড়া'),t('Pair the records','রেকর্ড দুটি জুড়ুন'),t('The same transaction stages event E-041 in the outbox. The event refers to B-041. Neither record is durable yet.','একই লেনদেনে আউটবক্সে E-041 ইভেন্ট রাখা হয়। সেটি B-041 বুকিং নির্দেশ করে। কোনোটিই এখনও স্থায়ী নয়।'),1],
 [t('Commit','কমিট'),abort?t('Roll both back','দুটিই বাতিল করুন'):t('Commit both records','দুটি রেকর্ড সংরক্ষণ'),abort?t('The slot constraint rejects this reservation. The transaction rolls back both provisional rows.','স্লটের শর্তে বুকিং প্রত্যাখ্যাত হয়েছে। লেনদেনের দুটি অস্থায়ী রেকর্ডই বাতিল হয়।'):t('One database commit makes B-041 and E-041 durable together. The booking can now be returned to the browser.','একটি কমিট B-041 ও E-041 একসঙ্গে স্থায়ী করে। এখন ব্রাউজারকে বুকিং ফেরত দেওয়া যায়।'),0],
 [t('Relay','রিলে'),t('Relay the event','ইভেন্ট পাঠান'),t('The relay reads committed E-041. The queue hands it to the worker. Every delivery carries the same event ID.','রিলে সংরক্ষিত E-041 পড়ে। কিউ সেটি ওয়ার্কারকে দেয়। প্রতিবার একই ইভেন্ট আইডি থাকে।'),1],
 [t('Deliver','ডেলিভারি'),t('Record one delivery','একটি ডেলিভারি লিখুন'),t('The provider accepts E-041 as its idempotency key. The worker saves a completed receipt. A replay of the same key identifies this send.','প্রদানকারী E-041 পুনরাবৃত্তি ঠেকানোর কী হিসেবে গ্রহণ করে। ওয়ার্কার সম্পন্ন ডেলিভারির রসিদ লেখে। একই কী আগের কাজটি শনাক্ত করে।'),2],
 [retry?t('Retry','পুনঃচেষ্টা'):t('Confirm','নিশ্চিত'),retry?t('Recover a lost acknowledgment','হারানো স্বীকৃতি পুনরুদ্ধার'):t('Acknowledge the event','ইভেন্টের স্বীকৃতি দিন'),retry?t('The acknowledgment timed out after the receipt was saved. On redelivery the worker finds E-041 complete, skips the send, and acknowledges the queue.','রসিদ সংরক্ষণের পর স্বীকৃতির সময়সীমা পেরিয়েছে। ইভেন্ট আবার এলে ওয়ার্কার রসিদ দেখে পুনরায় না পাঠিয়ে কিউকে স্বীকৃতি দেয়।'):t('The queue accepts the acknowledgment. The booking has one event and one completed notification.','কিউ স্বীকৃতি গ্রহণ করে। বুকিংটির একটি ইভেন্ট ও একটি সম্পন্ন নোটিফিকেশন আছে।'),2]];
 return abort?rows.slice(0,3):rows;
}
function records(){
 const rolled=$('case').value==='abort'&&step===2;
 return [t('Booking','বুকিং'),t('Outbox','আউটবক্স'),t('Receipt','রসিদ')].map((name,i)=>({name,id:['B-041','E-041','ACK/E-041'][i],state:(rolled||step<[0,1,4][i])?t('Empty','খালি'):step<2?t('Staged','অস্থায়ী'):i===2?t('Complete','সম্পন্ন'):t('Committed','সংরক্ষিত')}));
}
function halt(){clearInterval(timer);timer=0}
function btn(parent,fn){const b=document.createElement('button');b.onclick=fn;parent.appendChild(b);return b}
function go(n,announce=true){step=Math.max(0,Math.min(n,story().length-1));part=story()[step][3];syncCamera();render();if(announce)$('status').textContent=$('title').textContent}
function inspect(i){halt();part=i;syncCamera();render();$('status').textContent=$('explain').textContent}
function render(){
 const rows=story(),current=rows[step],r=records();
 document.documentElement.lang=bn()?'bn':'en';document.documentElement.dataset.theme=$('theme').value;
 $('headline').textContent=A?t('Inside the commit.','কমিটের ভেতরে।'):t('The transaction ledger.','লেনদেনের খতিয়ান।');
 $('kicker').textContent=A?t('Web development / A · Precision cutaway','ওয়েব ডেভেলপমেন্ট / A · কাটঅ্যাওয়ে'):t('Web development / C · Inspection plate','ওয়েব ডেভেলপমেন্ট / C · পরিদর্শন চিত্র');
 $('figtitle').textContent=A?t('TRANSACTION CARTRIDGE','লেনদেন কার্ট্রিজ'):t('SECTION / B-041','বিভাগ / B-041');$('renderer').textContent=rendererLabel;
 $('phase').textContent=String(step+1).padStart(2,'0')+' / '+String(rows.length).padStart(2,'0');$('title').textContent=current[1];$('copy').textContent=current[2];
 $('ledger').replaceChildren();r.forEach(v=>{const k=document.createElement('dt'),s=document.createElement('dd');k.textContent=v.name;s.textContent=v.state;$('ledger').append(k,s)});
 $('inspect-label').textContent=t('Inspect a carrier','রেকর্ড দেখুন');r.forEach((v,i)=>{const b=$('parts').children[i];b.textContent=(i+1)+' '+v.name;b.setAttribute('aria-pressed',i===part)});
 $('explain').textContent=r[part].id+' · '+[t('Slot S-08 and the request key identify the reservation.','স্লট S-08 ও অনুরোধ কী বুকিং শনাক্ত করে।'),t('E-041 references B-041. Only committed events can leave the database.','E-041 বুকিং B-041 নির্দেশ করে। শুধু সংরক্ষিত ইভেন্ট বাইরে যায়।'),t('The completed receipt is keyed by event ID. It survives a lost acknowledgment.','রসিদটি ইভেন্ট আইডি দিয়ে রাখা হয়। স্বীকৃতি হারালেও রসিদ থাকে।')][part];
 $('case-label').textContent=t('Trace scenario','পরিস্থিতি');[t('Lost acknowledgment','হারানো স্বীকৃতি'),t('Normal delivery','স্বাভাবিক ডেলিভারি'),t('Slot conflict / rollback','স্লট সংঘাত / বাতিল')].forEach((v,i)=>$('case').options[i].textContent=v);
 Array.from($('steps').children).forEach((b,i)=>{b.hidden=i>=rows.length;if(!b.hidden)b.textContent=(i+1)+'  '+rows[i][0];if(step===i)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')});
 $('play').textContent=timer?t('Ⅱ Pause','Ⅱ বিরতি'):step===rows.length-1?t('↻ Replay','↻ আবার চালান'):t('▶ Play trace','▶ চালান');$('play').disabled=quiet();
 $('scrub').max=rows.length-1;$('scrub').value=step;$('scrub-label').textContent=t('Trace','ধাপ');$('reduce-label').textContent=t('Reduce motion','কম গতি');$('review').textContent=t('Back to service','সেবায় ফিরুন');$('review').href=(bn()?'/bn':'')+'/services/web#transaction-study';['System','Light','Dark'].forEach((s,i)=>$('theme').options[i].textContent=t(s,['সিস্টেম','হালকা','গাঢ়'][i]));if(A)$('cut-label').textContent=t('Open shell','খোলস খুলুন');paint();
}
for(let i=0;i<6;i++)btn($('steps'),()=>{halt();go(i)});
for(let i=0;i<3;i++)btn($('parts'),()=>inspect(i));
$('play').onclick=()=>{if(timer)halt();else{if(step===story().length-1)go(0);timer=setInterval(()=>{if(step+1>=story().length-1)halt();go(step+1)},2600)}render()};
$('case').onchange=()=>{halt();go(0)};$('scrub').oninput=e=>{halt();go(+e.target.value)};
$('lang').onchange=$('theme').onchange=render;$('reduce').onchange=()=>{halt();syncCamera();render()};os.addEventListener('change',()=>{halt();syncCamera();render()});document.addEventListener('visibilitychange',()=>{if(document.hidden){halt();render()}});render();
