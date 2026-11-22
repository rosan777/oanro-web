const store=document.querySelector('#store'),buttons=[...document.querySelectorAll('#palettes button')];
function setFlow(num){store.dataset.flow=num;buttons.forEach(b=>b.setAttribute('aria-pressed',b.dataset.flow===num))}
const query=new URL(location.href).searchParams.get('flow');
setFlow(buttons.some(b=>b.dataset.flow===query)?query:'1');
buttons.forEach(b=>b.onclick=()=>{setFlow(b.dataset.flow);document.querySelector('#store-pop').click()});
document.querySelectorAll('.goods img').forEach((img,i)=>{img.style.setProperty('--cycle',(4.9+i%4*.6)+'s');img.style.setProperty('--delay',(1.35+Math.abs(i-4.5)*.23)+'s');img.style.setProperty('--lean',i%2?'-.65deg':'.65deg')});
buttons.forEach(b=>b.addEventListener('click',()=>{for(const a of store.getAnimations({subtree:true}))if(a.animationName==='glass-forward')a.currentTime=0}));
