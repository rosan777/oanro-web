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
reduced.addEventListener('change',updateMotion);
document.addEventListener('visibilitychange',updateMotion);
updateMotion();
const steps=document.querySelector('.steps'), nodes=document.querySelectorAll('.request-line circle');
function updateRoute(){
 const index=[...steps.children].findIndex(button=>button.getAttribute('aria-pressed')==='true');
 nodes.forEach((node,i)=>node.classList.toggle('active',i===index));
}
new MutationObserver(updateRoute).observe(steps,{childList:true,subtree:true,attributeFilter:['aria-pressed']});
updateRoute();
