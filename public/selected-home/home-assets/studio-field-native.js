
export function mount(root, signal) {
const field=document.querySelector('#studio-field');
const toggle=document.querySelector('#field-toggle');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
let paused=false;
function updateMotion(){
 field.toggleAttribute('data-paused',paused||document.hidden||reduced.matches);
 if(!toggle)return;
 toggle.disabled=reduced.matches;
 toggle.textContent=reduced.matches?'Reduced motion':paused?'Resume background':'Pause background';
}
if(toggle)toggle.onclick=()=>{paused=!paused;updateMotion()};
reduced.addEventListener('change',updateMotion,{signal});
document.addEventListener('visibilitychange',updateMotion,{signal});
updateMotion();
const steps=document.querySelector('.steps'), nodes=document.querySelectorAll('.request-line circle');
function updateRoute(){
 const index=[...steps.children].findIndex(button=>button.getAttribute('aria-pressed')==='true');
 nodes.forEach((node,i)=>node.classList.toggle('active',i===index));
}
const observer = new MutationObserver(updateRoute);observer.observe(steps,{childList:true,subtree:true,attributeFilter:['aria-pressed']});
updateRoute();

signal.addEventListener("abort",()=>observer.disconnect(),{once:true});
}
