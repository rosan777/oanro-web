const diagram=$('diagram');
diagram.parentElement.classList.add('plate');
rendererLabel='SVG · 2D';
function plate(){
 const r=records(),rolled=$('case').value==='abort'&&step===2;
 const line='var(--line)',ink='var(--ink)',accent='var(--accent)';
 let art='<defs><pattern id="dots" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".7" fill="var(--mut)" opacity=".33"/></pattern><pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 5L5 0" stroke="var(--mut)" stroke-width=".8"/></pattern></defs><rect width="620" height="425" fill="url(#dots)"/>';
 art+='<path d="M67 68H551M67 63v10m484-10v10" stroke="'+line+'"/><text x="70" y="58" fill="'+accent+'" font-size="11">'+t('TRANSACTION SECTION','লেনদেনের অংশ')+'</text>';
 r.forEach((v,i)=>{
 const y=84+i*81,color=part===i?accent:ink;
 art+='<g data-record="'+i+'" style="cursor:pointer"><rect x="66" y="'+y+'" width="485" height="63" rx="4" fill="var(--card)" stroke="'+color+'" stroke-width="'+(part===i?2:1)+'"/><rect x="74" y="'+(y+7)+'" width="28" height="49" fill="url(#hatch)" opacity=".5"/><circle cx="106" cy="'+(y+31)+'" r="14" fill="var(--bg)" stroke="'+color+'"/><text x="106" y="'+(y+35)+'" text-anchor="middle" fill="'+color+'" font-size="12">0'+(i+1)+'</text><text x="134" y="'+(y+25)+'" font-size="18" font-weight="700" fill="'+ink+'">'+v.name+'</text><text x="134" y="'+(y+46)+'" font-size="12" fill="var(--mut)">'+v.id+'</text><path d="M369 '+(y+10)+'v43" stroke="'+line+'"/><text x="388" y="'+(y+36)+'" fill="'+color+'" font-size="14">'+v.state+'</text></g>';
 });
 art+='<g fill="none" stroke="'+accent+'" stroke-width="2"><path d="M62 112H47v82h15"/><path d="M554 197h17v81h-16" stroke-dasharray="'+(step>=4?'0':'3 5')+'"/></g>';
 const caption=rolled?t('ROLLBACK · 0 durable records','রোলব্যাক · স্থায়ী রেকর্ড ০'):step>=2?t('COMMIT · booking + event durable','কমিট · বুকিং ও ইভেন্ট স্থায়ী'):t('OPEN · provisional transaction','খোলা · অস্থায়ী লেনদেন');
 art+='<rect x="66" y="338" width="485" height="44" fill="var(--sel)" rx="3"/><text x="83" y="365" fill="'+ink+'" font-size="14">'+caption+'</text>';
 diagram.innerHTML=art;diagram.querySelectorAll('[data-record]').forEach(g=>g.onclick=()=>inspect(+g.dataset.record));
}
paint=plate;render();
