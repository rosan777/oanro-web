
export function mount(root, signal) {
document.querySelector('#orbit-cue').onclick=()=>document.querySelector('#turn').click();
const steps=document.querySelector('.steps'),labels=document.querySelectorAll('.branch-labels button');
labels.forEach((button,i)=>button.onclick=()=>steps.children[i]?.click());
function sync(){labels.forEach((button,i)=>{const on=steps.children[i]?.getAttribute('aria-pressed')==='true';button.classList.toggle('on',on);button.setAttribute('aria-pressed',String(on))})}
const labelsObserver = new MutationObserver(sync);labelsObserver.observe(steps,{subtree:true,childList:true,attributeFilter:['aria-pressed']});sync();
signal.addEventListener("abort",()=>labelsObserver.disconnect(),{once:true});
const goods=root.querySelector('.goods');
if(!goods)return;
const items=[...goods.children],mobile=matchMedia('(max-width:600px)'),reduce=matchMedia('(prefers-reduced-motion:reduce)');
let animations=[];
function bloom(play=true){animations.forEach(a=>a.cancel());animations=[];
items.forEach((img,i)=>{const x=mobile.matches?10+i%5*20:items.length===1?50:6+i*88/(items.length-1),y=mobile.matches?(i<5?24:77):(i%2?34:69);
img.style.left=x+'%';img.style.top=y+'%';img.style.transform='translate(-50%,-50%)';
if(play&&!reduce.matches){const dx=(50-x)*goods.clientWidth/100,dy=(100-y)*goods.clientHeight/100;
animations.push(img.animate([{opacity:0,transform:'translate(-50%,-50%) translate('+dx+'px,'+dy+'px) scale(.15)'},{offset:.72,opacity:1,transform:'translate(-50%,-56%) scale(1.05)'},{transform:img.style.transform}],{duration:1350,delay:Math.abs(i-4.5)*230,fill:'backwards',easing:'cubic-bezier(.18,.72,.22,1)'}))}})}
bloom(false);mobile.onchange=()=>bloom(false);reduce.onchange=()=>bloom(false);document.querySelector('#store-pop').onclick=()=>bloom();
const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){bloom();observer.disconnect()}},{threshold:.45});observer.observe(goods);

signal.addEventListener("abort",()=>observer.disconnect(),{once:true});
signal.addEventListener("abort",()=>{animations.forEach(a=>a.cancel())},{once:true});
}
