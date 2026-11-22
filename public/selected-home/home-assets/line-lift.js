const h=document.querySelector('#hero-headline'),phrases=[...h.children],buttons=[...document.querySelectorAll('button[data-finish]')],reduce=matchMedia('(prefers-reduced-motion:reduce)');
let index=0,timer,animations=[];
function schedule(){
 clearTimeout(timer);
 if(!reduce.matches&&!document.hidden&&!h.matches(':hover,:focus'))timer=setTimeout(()=>show((index+1)%phrases.length),2800+phrases[index].childElementCount*210)
}
function show(i){
 animations.forEach(a=>a.cancel());animations=[];index=i;
 phrases.forEach((p,j)=>p.setAttribute('aria-hidden',i!==j));
 if(!reduce.matches){
 const words=[...phrases[i].children],rows=[...new Set(words.map(w=>w.offsetTop))];
 words.forEach(w=>{
 const delay=rows.indexOf(w.offsetTop)*110;
 animations.push(w.animate([{opacity:0,transform:'translateY(.22em)'},{opacity:1,transform:'none'}],{duration:290,delay,fill:'backwards',easing:'cubic-bezier(.2,.75,.3,1)'}));
 if(h.dataset.finish)animations.push(w.animate([{backgroundPosition:'var(--start,0 0)'},{backgroundPosition:'var(--end,4px 0)'}],{duration:950,delay,fill:'both',easing:'ease-out'}))
 })
 }schedule()
}
if(buttons.length){
 function pick(n){h.dataset.finish=n;buttons.forEach(b=>b.setAttribute('aria-pressed',b.dataset.finish===n));show(index)}
 const mode=new URL(location.href).searchParams.get('finish');pick(buttons.some(b=>b.dataset.finish===mode)?mode:'1');
 buttons.forEach(b=>b.onclick=()=>pick(b.dataset.finish));document.querySelector('#again').onclick=()=>show(index)
}else show(0);
for(const ev of ['focus','blur','mouseenter','mouseleave'])h.addEventListener(ev,schedule);
document.addEventListener('visibilitychange',schedule);reduce.addEventListener('change',()=>show(0))
