import * as T from './three.module.min.js';
import {RoundedBoxGeometry} from './RoundedBoxGeometry.js';
const el=id=>document.getElementById(id), area=el('scene'), reduced=matchMedia('(prefers-reduced-motion:reduce)');
const bn = new URLSearchParams(location.search).get("lang") === "bn";
const labels = {
  "Run booking": "বুকিং চালান",
  "Appearance": "থিম",
  "System": "সিস্টেম",
  "Light": "হালকা",
  "Dark": "গাঢ়",
  "↶ Rotate": "↶ ঘোরান",
  "Inspect components": "যন্ত্রাংশ দেখুন",
  "Component": "যন্ত্রাংশ",
  "Separate layers": "স্তর আলাদা করুন",
  "View lid": "ঢাকনা দেখুন",
  "View keyboard": "কিবোর্ড দেখুন",
  "Rotate view": "দৃশ্য ঘোরান",
  "Move component": "যন্ত্রাংশ সরান",
  "Reset layout": "বিন্যাস ফিরিয়ে আনুন",
  "Test retry": "আবার চেষ্টা করুন",
  "Drag a component to move it. Drag the background to rotate.": "সরাতে যন্ত্রাংশটি টানুন। ঘোরাতে পটভূমি টানুন।",
  "Pause": "বিরতি",
  "Resume": "আবার চালান",
  "Laptop": "ল্যাপটপ",
  "Identity gateway": "পরিচয় গেটওয়ে",
  "Application server": "অ্যাপ সার্ভার",
  "Transaction store": "লেনদেনের তথ্যভান্ডার",
  "Request": "অনুরোধ",
  "Authorize": "অনুমোদন",
  "Commit": "সংরক্ষণ",
  "Response": "উত্তর",
  "Ready to book. Run the booking to follow a request.": "প্রস্তুত। অনুরোধটি অনুসরণ করতে বুকিং চালান।",
  "Retry R-041 → existing booking B-041. The service returns the saved result without reserving a second slot.": "পুনরায় R-041 পাঠালে আগের বুকিং B-041 ফেরত আসে। দ্বিতীয়বার সময় সংরক্ষিত হয় না।",
  "Booking system model. Component controls are available under Inspect components.": "বুকিং মডেল। নিয়ন্ত্রণ পেতে যন্ত্রাংশ দেখুন খুলুন।",
  "The browser submits the selected slot with request key R-041. The screen follows this same booking throughout the trace.": "ব্রাউজার R-041 চাবিসহ নির্বাচিত সময় পাঠায়। স্ক্রিনে একই বুকিং অনুসরণ করা হয়।",
  "The gateway verifies the session signature, checks its expiry and passes the verified identity to the application.": "গেটওয়ে সেশনের স্বাক্ষর ও মেয়াদ যাচাই করে পরিচয়টি অ্যাপে পাঠায়।",
  "The booking service checks slot availability and starts a transaction. A repeated key resolves to the original booking.": "সার্ভার সময়টি খালি কি না দেখে লেনদেন শুরু করে। একই চাবিতে আগের বুকিং পাওয়া যায়।",
  "The layers represent the write-ahead log, booking row, outbox row and durable commit. Separation is a logical cutaway of the transaction.": "স্তরগুলোতে লগ, বুকিং, আউটবক্স এবং স্থায়ী সংরক্ষণ দেখানো হয়েছে।",
  "The browser sends slot 09:30 with request key R-041.": "ব্রাউজার R-041 চাবিসহ ০৯:৩০ সময়টি পাঠায়।",
  "The gateway verifies the session and forwards the booking to the application.": "গেটওয়ে সেশন যাচাই করে অনুরোধটি অ্যাপে পাঠায়।",
  "The application commits booking B-041 and its outbox event in one database transaction.": "এক লেনদেনে B-041 বুকিং ও আউটবক্সের তথ্য সংরক্ষিত হয়।",
  "The server returns 201 Created. The laptop displays confirmation B-041.": "সার্ভার 201 Created পাঠায়। ল্যাপটপে B-041 নিশ্চিতকরণ দেখা যায়।"
};
const tr = value => bn ? labels[value] ?? value : value;
if (bn) {
  document.documentElement.lang = "bn";
  document.title = "বুকিং মডেল · OANRO";
  for (const option of el("theme").options) option.value = option.textContent;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const key = node.textContent.trim();
    if (labels[key]) node.textContent = node.textContent.replace(key, labels[key]);
  }
  el("orbit-cue").title = "ঘোরাতে পটভূমি টানুন অথবা বোতাম চাপুন";
}
const parts=[tr("Laptop"),tr("Identity gateway"),tr("Application server"),tr("Transaction store")];
const descriptions=[tr("The browser submits the selected slot with request key R-041. The screen follows this same booking throughout the trace."),tr("The gateway verifies the session signature, checks its expiry and passes the verified identity to the application."),tr("The booking service checks slot availability and starts a transaction. A repeated key resolves to the original booking."),tr("The layers represent the write-ahead log, booking row, outbox row and durable commit. Separation is a logical cutaway of the transaction.")];
const stages=[tr("Request"),tr("Authorize"),tr("Commit"),tr("Response")], focus=[0,1,3,0];
const messages=[tr("The browser sends slot 09:30 with request key R-041."),tr("The gateway verifies the session and forwards the booking to the application."),tr("The application commits booking B-041 and its outbox event in one database transaction."),tr("The server returns 201 Created. The laptop displays confirmation B-041.")];
const routes=[[0,1],[1,2],[2,3],[3,2,1,0]], colors=[0xc0ddff,0xf4c376,0x8be5c1,0xb3b8ff];
let stage=0,selected=0,amount=0,spread=0,yaw=.16,pitch=.46,timer=null,epoch=0,renderer,redraw=()=>{},retry=false;
let running=false,pausedAt=null,ready=true;
const legDuration=3800;
function stop(){clearTimeout(timer);running=false;pausedAt=null;timer=null;timer=null;el('run').textContent=tr("Run booking")}
function inspect(i){selected=i;el('part').value=i;el('description').textContent=descriptions[i];el('anchor').textContent=parts[i];document.querySelectorAll('#fallback button').forEach((b,j)=>b.setAttribute('aria-pressed',i===j));redraw()}
function setStage(i){ready=false;stage=i;retry=false;epoch=performance.now();amount=i===2?.95:0;el('explode').value=amount*100;inspect(focus[i]);el('status').textContent=messages[i];document.querySelectorAll('.steps button').forEach((b,j)=>b.setAttribute('aria-pressed',i===j));redraw()}
parts.forEach((name,i)=>el('part').add(new Option(name,i)));
stages.forEach((name,i)=>{let b=document.createElement('button');b.textContent='0'+(i+1)+'　'+name;b.onclick=()=>{stop();setStage(i)};document.querySelector('.steps').append(b)});
function nextLeg(){
 if(stage===3){stop();redraw();return}
 setStage(stage+1);timer=setTimeout(nextLeg,legDuration)
}
el('run').onclick=()=>{
 if(running&&pausedAt===null){clearTimeout(timer);pausedAt=performance.now();el('run').textContent=tr("Resume");redraw();return}
 if(pausedAt!==null){epoch+=performance.now()-pausedAt;pausedAt=null}
 else{running=true;setStage(0)}
 el('run').textContent=tr("Pause");timer=setTimeout(nextLeg,Math.max(0,legDuration-(performance.now()-epoch)));redraw()
};
function resetBooking(){stop();setStage(0);ready=true;el('status').textContent=tr("Ready to book. Run the booking to follow a request.");document.querySelectorAll('.steps button').forEach(b=>b.setAttribute('aria-pressed','false'));redraw()}
el('retry').onclick=()=>{stop();setStage(3);retry=true;el('status').textContent=tr("Retry R-041 \u2192 existing booking B-041. The service returns the saved result without reserving a second slot.");redraw()};
el('part').onchange=e=>inspect(+e.target.value);
el('explode').oninput=e=>{stop();amount=+e.target.value/100;inspect(3)};
const appearance = new URLSearchParams(location.search).get("appearance");
el("theme").value = appearance === "dark" ? "Dark" : appearance === "light" ? "Light" : "System";
const dark=matchMedia('(prefers-color-scheme:dark)');function theme(){document.body.classList.toggle('dark',el('theme').value==='Dark'||(el('theme').value==='System'&&dark.matches))}el('theme').onchange=theme;dark.onchange=theme;theme();resetBooking();
try{renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'})}catch{}
function diagram(){el('fallback').hidden=false;el('fallback').replaceChildren();for(const [i,p] of parts.entries()){let b=document.createElement('button');b.textContent=p;b.onclick=()=>inspect(i);el('fallback').append(b)}el('anchor').hidden=true;for(const id of ['explodeLabel','turn','move','reset','hint'])el(id).hidden=true;inspect(selected)}
if(!renderer)diagram();else build();
function build(){
 const scene=new T.Scene(), camera=new T.OrthographicCamera(), root=new T.Group();scene.add(root);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.13;area.prepend(renderer.domElement);
 const canvas=renderer.domElement;canvas.setAttribute('aria-label',tr("Booking system model. Component controls are available under Inspect components."));
 const integrated=area.hasAttribute("data-integrated");
 scene.background=integrated?null:new T.Color(0x282d31);
 const lighting=new T.Scene();lighting.background=new T.Color(0x434b51);
 for(const [x,y,z,w,h,intensity] of [[-4,6,2,7,4,5],[3,2,-4,2,6,4],[2,5,3,5,.6,3]]){
 const panel=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color().setScalar(intensity),side:T.DoubleSide}));panel.position.set(x,y,z);panel.lookAt(0,0,0);lighting.add(panel)}
 const pm=new T.PMREMGenerator(renderer);const env=pm.fromScene(lighting);scene.environment=env.texture;pm.dispose();
 scene.add(new T.HemisphereLight(0xf4f6ff,0x31383c,1.4));
 const key=new T.DirectionalLight(0xfff0da,3.3);key.position.set(-4,8,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-5,right:5,top:5,bottom:-5});key.shadow.normalBias=.018;scene.add(key);
 const material=(color,metalness=.6,roughness=.34)=>new T.MeshStandardMaterial({color,metalness,roughness});
 const alloy=material(0xb1b5b6,.92,.27),darkMetal=material(0x353b41,.8),black=material(0x12171a,.36),board=material(0x274d41,.4),gold=material(0xc09756,.8),rim=material(0x818d94,.85);
 const light=c=>new T.MeshBasicMaterial({color:c});
 const indicators=parts.map(()=>new T.MeshStandardMaterial({color:0x38574a,emissive:0x000000}));
 const geometries=new Map();
 function mesh(parent,g,m,x,y,z){let obj=new T.Mesh(g,m);obj.position.set(x,y,z);obj.castShadow=true;obj.receiveShadow=true;parent.add(obj);return obj}
 function box(p,x,y,z,w,h,d,m,r=0){let k=[w,h,d,r].join('/');if(!geometries.has(k))geometries.set(k,r?new RoundedBoxGeometry(w,h,d,2,r):new T.BoxGeometry(w,h,d));return mesh(p,geometries.get(k),m,x,y,z)}
 function cyl(p,x,y,z,r,h,m){let k='c'+r+'/'+h;if(!geometries.has(k))geometries.set(k,new T.CylinderGeometry(r,r,h,64));return mesh(p,geometries.get(k),m,x,y,z)}
 function group(parent,x,y,z){let g=new T.Group();g.position.set(x,y,z);parent.add(g);return g}
 const floor=box(scene,0,-.16,0,180,.28,180,material(0x383f44,.12,.64));
 if(integrated){floor.material=new T.ShadowMaterial({opacity:.22});floor.castShadow=false;floor.receiveShadow=true}
 const home=[[-2.15,0,.58],[-.35,0,-1.85],[2.08,0,-1.75],[1.48,0,1.20]];
 const units=home.map((pos,i)=>{let g=group(root,...pos);g.userData.unit=i;if(area.hasAttribute("data-compact"))g.scale.setScalar(.92);return g});
 const rearFill=new T.DirectionalLight(0xdde8ff,2.1);rearFill.position.set(-3,4,-6);scene.add(rearFill);
 const midnight=material(0x243145,.82,.36), seam=material(0x3d4b5e,.84,.28);
 const laptop=units[0];laptop.rotation.y=.29;
 // Exterior proportions of the 13-inch enclosure, scaled to the system scene.
 const chassisWidth=2.7, scale=chassisWidth/30.41, chassisDepth=21.5*scale;
 function shell(parent,width,depth,radius,thickness,finish){
   const x=width/2,z=depth/2,r=radius,path=new T.Shape();
   path.moveTo(-x+r,-z);path.lineTo(x-r,-z);path.quadraticCurveTo(x,-z,x,-z+r);
   path.lineTo(x,z-r);path.quadraticCurveTo(x,z,x-r,z);path.lineTo(-x+r,z);path.quadraticCurveTo(-x,z,-x,z-r);
   path.lineTo(-x,-z+r);path.quadraticCurveTo(-x,-z,-x+r,-z);
   return mesh(parent,new T.ExtrudeGeometry(path,{depth:thickness,bevelSize:.004,bevelThickness:.003,bevelSegments:3,curveSegments:12}),finish,0,0,0);
 }
 const deck=shell(laptop,chassisWidth,chassisDepth,.094,.063,midnight);deck.rotation.x=-Math.PI/2;deck.position.y=.018;
 for(const x of [-1.04,1.04])for(const z of [-.70,.70])cyl(laptop,x,.009,z,.093,.016,black);
 const hinge=cyl(laptop,0,.093,-.87,.033,2.04,black);hinge.rotation.z=Math.PI/2;
 const keyRows=[
   ['esc','☀','☼','▥','⌕','♩','☾','◂◂','▷','▸▸','◁','◃','▷',''],
   ['~','1','2','3','4','5','6','7','8','9','0','–','=','delete'],
   ['tab','Q','W','E','R','T','Y','U','I','O','P','[',']','∖'],
   ['caps','A','S','D','F','G','H','J','K','L',';',"'","return"],
   ['shift','Z','X','C','V','B','N','M',',','.','/','shift'],
   ['fn','⌃','⌥','⌘',' ','⌘','⌥','←','↕','→']
 ];
 const sizes={esc:1.35,delete:1.6,tab:1.5,caps:1.8,return:1.8,shift:2.2,' ':5.4,'⌘':1.3};
 const keys=document.createElement('canvas');keys.width=1536;keys.height=640;
 const glyph=keys.getContext('2d');glyph.textAlign='center';glyph.textBaseline='middle';
 const keyWidth=2.43,keyDepth=.99,rowPitch=keyDepth/6;
 keyRows.forEach((row,r)=>{
   const sum=row.reduce((v,k)=>v+(sizes[k]||1),0);let cursor=0;
   for(const symbol of row){
     const width=(sizes[symbol]||1)/sum,center=cursor+width/2;
     const x=(center-.5)*keyWidth,z=-.74+r*rowPitch;
     box(laptop,x,.092,z,width*keyWidth-.015,.021,rowPitch-.018,black,.009);
     if(r===0&&!symbol)cyl(laptop,x,.104,z,.045,.004,seam);
     glyph.fillStyle='#f5f9ff';glyph.font=(symbol.length>2?'25':'35')+'px system-ui';
     glyph.shadowColor='#c5dcff';glyph.shadowBlur=2;
     glyph.fillText(symbol,center*keys.width,(r+.5)*keys.height/6);
     cursor+=width;
   }
 });
 const labelMap=new T.CanvasTexture(keys);
 const legends=mesh(laptop,new T.PlaneGeometry(keyWidth,keyDepth),new T.MeshBasicMaterial({map:labelMap,toneMapped:false,transparent:true,depthWrite:false}),0,.106,-.74+2.5*rowPitch);
 legends.rotation.x=-Math.PI/2;legends.castShadow=false;
 for(const z of [-.51,-.30])box(laptop,-1.355,.051,z,.008,.024,.084,black,.007);
 box(laptop,-1.355,.051,-.74,.008,.026,.175,black,.008);
 const jack=cyl(laptop,1.355,.052,-.66,.016,.009,black);jack.rotation.z=Math.PI/2;
 box(laptop,0,.084,.54,1.15,.003,.65,seam,.002);
 box(laptop,0,.087,.54,1.138,.003,.638,midnight,.002);
 const lid=group(laptop,0,.089,-.895);lid.rotation.x=-.20;
 const cover=shell(lid,2.69,1.88,.091,.024,midnight);cover.position.set(0,.94,-.018);
 box(lid,0,.94,.012,2.66,1.85,.014,black,.006);
 // Reflective lid inlay, constructed in its outward-facing local plane.
 const badge=group(lid,0,.95,-.023);badge.rotation.y=Math.PI;
 const fruit=new T.Shape();fruit.moveTo(.01,.105);
 fruit.bezierCurveTo(-.07,.14,-.14,.105,-.147,.025);
 fruit.bezierCurveTo(-.16,-.055,-.086,-.173,-.043,-.155);
 fruit.bezierCurveTo(.005,-.135,.019,-.138,.054,-.151);
 fruit.bezierCurveTo(.092,-.169,.136,-.090,.145,-.059);
 fruit.bezierCurveTo(.072,-.036,.075,.032,.137,.067);
 fruit.bezierCurveTo(.105,.119,.060,.13,.01,.105);
 const leaf=new T.Shape();leaf.moveTo(.008,.127);leaf.bezierCurveTo(.003,.17,.038,.210,.087,.218);leaf.bezierCurveTo(.09,.178,.054,.127,.008,.127);
 const polish=material(0x6a788a,.82,.14);mesh(badge,new T.ShapeGeometry([fruit,leaf],32),polish,0,0,0);
 const paper=document.createElement('canvas');
 paper.width=1536;paper.height=900;
 const ink=paper.getContext('2d'),texture=new T.CanvasTexture(paper);
 ink.scale(2,2);
 texture.colorSpace=T.SRGBColorSpace;
 texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 labelMap.anisotropy=texture.anisotropy;
 mesh(lid,new T.PlaneGeometry(2.58,1.677),new T.MeshBasicMaterial({map:texture,toneMapped:false}),0,.973,.022);
 const glass=mesh(lid,new T.PlaneGeometry(2.60,1.69),new T.MeshPhysicalMaterial({
   color:0x17222b,roughness:.12,metalness:.08,clearcoat:1,clearcoatRoughness:.08,
   transparent:true,opacity:.055,depthWrite:false
 }),0,.973,.026);
 glass.castShadow=false;
 // The live DOM panel uses the same three projected corners as the display glass.
 const terminal=document.createElement('div');terminal.id='native-terminal';terminal.hidden=true;
 terminal.innerHTML='<header>Visual Studio Code <span class="power-state" aria-label="Battery 78 percent">78% ▰</span></header><div class="tab">TERMINAL　·　zsh</div><code></code><output></output>';
 area.append(terminal);
 box(lid,0,1.804,.031,.24,.059,.013,black,.014);
 const lens=cyl(lid,0,1.802,.04,.009,.007,rim);lens.rotation.x=Math.PI/2;
 box(laptop,0,.078,.952,.36,.012,.012,darkMetal,.009);
 const screenRows=[
   ['$ book 09:30','→ POST /bookings'],
   ['$ auth R-041','✓ Session valid'],
   ['$ commit B-041','✓ Rows saved'],
   ['201 Created','✓ Booking B-041']
 ];
 function screen(cursor){
   const [command,result]=ready?['$ booking','Ready to send']:retry?['200 OK','↳ Saved B-041']:screenRows[stage];
   terminal.querySelector('code').textContent=command;
   terminal.querySelector('output').textContent=result;
   ink.fillStyle='#17191e';ink.fillRect(0,0,768,450);
   ink.fillStyle='#292d36';ink.fillRect(0,0,768,64);
   ink.fillStyle='#e4ecee';ink.font='500 37px monospace';ink.fillText('VS Code / Terminal',26,46);ink.fillStyle='#b6e9c4';ink.fillText('78%',612,46);
   ink.fillStyle='#ffffff';ink.font='600 67px monospace';ink.fillText(command,24,201);
   ink.fillStyle='#abf2c8';ink.font='600 61px monospace';ink.fillText(result,24,322);
   if(cursor)ink.fillRect(27,360,28,6);
   texture.needsUpdate=true;
 }
 function server(id,w){let p=units[id];box(p,0,.24,0,w,.44,1.18,darkMetal,.06);box(p,0,.26,.59,w-.05,.37,.045,alloy,.018);
 for(let j=0;j<13;j++)box(p,-w*.38+j*.067,.27,.622,.031,.17,.018,black,.006);
 for(let j=0;j<2;j++){box(p,w*.22+j*.25,.25,.625,.20,.145,.027,black);box(p,w*.22+j*.25,.208,.642,.13,.028,.01,gold)}
 box(p,-w*.36,.38,.625,.2,.028,.015,indicators[id]);for(let x of [-1,1])for(let z of [-1,1])cyl(p,x*(w/2-.12),.47,z*.45,.034,.022,rim);
 let tray=group(p,0,.48,0);box(tray,0,.01,0,w-.19,.055,1.0,board,.025);
 for(let j=0;j<10;j++)box(tray,-w*.27+j*.047,.15,-.05,.027,.25,.67,alloy);
 for(let j=0;j<4;j++){box(tray,w*.21,.08,-.31+j*.20,.39,.085,.125,black);box(tray,w*.21,.129,-.31+j*.20,.26,.012,.04,gold)}
 if(id===2){
   for(const x of [-.53,.36]){
     box(p,x,.25,.643,.77,.205,.03,black,.012);
     box(p,x-.08,.25,.662,.41,.048,.022,rim,.01);
     box(p,x+.27,.26,.666,.036,.031,.012,indicators[id]);
   }
 }
 if(id===1){
   const copper=material(0xb6774c,.85,.28);
   box(tray,-.26,.065,-.04,.72,.065,.83,copper,.018);
   const power=cyl(p,.04,.25,.643,.068,.032,black);power.rotation.x=Math.PI/2;
   const led=cyl(p,.04,.25,.666,.032,.008,indicators[id]);led.rotation.x=Math.PI/2;
   for(let i=0;i<2;i++)for(let j=0;j<6;j++)box(p,w*.22+i*.25-.065+j*.026,.245,.646,.012,.044,.013,gold);
   const vents=new T.InstancedMesh(new T.CylinderGeometry(.023,.023,.018,6),black,54);
   const cell=new T.Object3D();cell.rotation.x=Math.PI/2;
   for(let i=0;i<54;i++){cell.position.set(-.79+(i%18)*.048+Math.floor(i/18)%2*.017,.20+Math.floor(i/18)*.048,.637);cell.updateMatrix();vents.setMatrixAt(i,cell.matrix)}
   p.add(vents);
 }
 return tray}
 const gateway=server(1,1.78),app=server(2,2.15);
 const layers=[],db=units[3];cyl(db,0,.12,0,.78,.23,darkMetal);
 for(let i=0;i<4;i++){const g=group(db,0,.28+i*.154,0);layers.push(g);cyl(g,0,0,0,.74,.105,i%2?alloy:darkMetal);cyl(g,0,.062,0,.69,.018,i===1?board:rim);cyl(g,0,.078,0,.34,.022,black);cyl(g,0,.094,0,.15,.035,alloy);
 if(i===0){for(let j=0;j<7;j++)box(g,-.37+j*.115,.11,.19,.07,.035,.29,gold)}
 if(i===1){box(g,0,.106,.14,.81,.033,.43,board,.024);for(let j=0;j<3;j++)box(g,-.25+j*.25,.149,.14,.18,.051,.27,black,.012)}
 if(i===2){for(let j=0;j<3;j++){box(g,0,.11,.31-j*.216,.86,.045,.14,board,.02);box(g,.31,.14,.31-j*.216,.12,.02,.07,gold)}}
 if(i===3){const ring=mesh(g,new T.TorusGeometry(.48,.022,8,64),indicators[3],0,.091,0);ring.rotation.x=Math.PI/2}
 for(let j=0;j<12;j++){let a=j*Math.PI/6;let mark=box(g,Math.cos(a)*.58,.078,Math.sin(a)*.58,.12,.012,.025,j%3?black:gold);mark.rotation.y=-a}
 }
 for(const angle of [.55,2.65,4.6]){
   const x=.665*Math.cos(angle),z=.665*Math.sin(angle);
   for(const layer of layers){cyl(layer,x,.081,z,.035,.025,alloy);box(layer,x,.095,z,.037,.006,.008,black)}
 }
 const dbBand=cyl(db,0,.25,0,.766,.033,indicators[3]);void dbBand;
 function contact(g,x,z){let pin=cyl(g,x,.09,z,.045,.12,gold);return pin}
 for(let g of [gateway,app])for(let z of [-.35,.35])contact(g,.65,z);
 const captions=['WAL','Booking','Outbox',tr("Commit")];const pins=captions.map(text=>{let node=document.createElement('span');node.className='layer-name';node.textContent=text;area.append(node);return node});
 const cables=[],pairs=[[1,2],[2,3]];
 const point=i=>i===0?laptop.localToWorld(new T.Vector3(1.37,.095,-.62)):units[i].position.clone().add(new T.Vector3(0,.095,0));
 function curve(a,b){let p=point(a),q=point(b);let mid=p.clone().lerp(q,.48);mid.x+=.25;return new T.CatmullRomCurve3([p,mid,q])}
 function wire(){for(let m of cables){scene.remove(m);m.geometry.dispose()}cables.length=0;for(let [a,b] of pairs){let m=new T.Mesh(new T.TubeGeometry(curve(a,b),22,.025,7,false),black);scene.add(m);cables.push(m)}}wire();
 const bead=mesh(scene,new T.SphereGeometry(.071,18,12),light(colors[0]),0,0,0);
 const anchor=new T.Vector3(),target=new T.Vector3(0,.55,0);let raf=0,last=0,visible=true,stamp='',drag=null;
 const lidButton=el('lid-view');lidButton.hidden=false;
 function showLid(back){
   laptop.rotation.y=.29+(back?Math.PI:0);
   lidButton.textContent=back?tr("View keyboard"):tr("View lid");
   lidButton.setAttribute('aria-pressed',String(back));
   schedule();
 }
 lidButton.onclick=()=>{stop();inspect(0);showLid(lidButton.getAttribute('aria-pressed')!=='true')};
 // Conservative footprints include the open lid in either orientation.
 const radii=[1.73,1.10,1.25,.80];
 function moveUnit(id,x,z){
   const origin=units[id].position;
   const dx=T.MathUtils.clamp(x,-2.9,2.9)-origin.x,dz=T.MathUtils.clamp(z,-2,2)-origin.z;
   const length=dx*dx+dz*dz;
   if(!length)return;
   for(const [i,other] of units.entries()){
     if(i===id)continue;
     const t=T.MathUtils.clamp(((other.position.x-origin.x)*dx+(other.position.z-origin.z)*dz)/length,0,1);
     if(Math.hypot(origin.x+t*dx-other.position.x,origin.z+t*dz-other.position.z)<radii[id]+radii[i]+.03)return;
   }
   origin.x+=dx;origin.z+=dz;wire();schedule()
 }
 let arrival=performance.now();
 area.addEventListener('studio-arrival',()=>{arrival=performance.now();schedule()});
 function schedule(){if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(render)}redraw=schedule;
 function render(t){raf=0;let dt=Math.min(.08,(t-last)/1000);last=t;let age=Math.max(0,(pausedAt??t)-epoch)/1000;
 const entering=integrated&&!reduced.matches&&t-arrival<1300;
 units.forEach((u,i)=>{const v=entering?1-T.MathUtils.smoothstep(t-arrival,300+i*105,850+i*105):0;u.position.y=.32*v});
 spread=reduced.matches?amount:T.MathUtils.damp(spread,amount,9,dt);layers.forEach((g,i)=>{g.position.y=.28+i*(.154+spread*.36);g.rotation.y=spread*i*.11});
 const lift=reduced.matches?1:Math.min(1,age*2);gateway.position.y=.48+(stage===1?.24*lift:0);app.position.y=.48+(stage===2?.15*lift:0);
 indicators.forEach((m,i)=>{m.emissive.setHex(i===focus[stage]?colors[stage]:0x113526);m.emissiveIntensity=.8});
 let path=routes[stage],phase=reduced.matches?1:Math.min(1,Math.max(0,age-.55)/2.95),seg=phase*(path.length-1),idx=Math.min(path.length-2,Math.floor(seg));
 bead.visible=running;bead.scale.setScalar(reduced.matches?1:T.MathUtils.smoothstep(age,0,.55));area.dataset.signal=running?(pausedAt!==null?'paused':'travelling'):'idle';
 bead.position.copy(curve(path[idx],path[idx+1]).getPoint(seg-idx));bead.position.y+=.075;bead.material.color.setHex(colors[stage]);
 let sig=[stage,retry,ready,Math.floor(Math.min(age,2)*3)%2].join();if(sig!==stamp){screen(!reduced.matches&&age<2&&Math.floor(age*3)%2,age);stamp=sig}
 let w=area.clientWidth,h=area.clientHeight,aspect=w/h,half=Math.max(2.12,3.73/aspect);camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.near=.1;camera.far=110;
 camera.position.set(12*Math.sin(yaw)*Math.cos(pitch),12*Math.sin(pitch),12*Math.cos(yaw)*Math.cos(pitch)).add(target);
 camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 const height=[2.04,1.04,1.0,1.08+spread*1.04][selected];anchor.copy(units[selected].position);anchor.y+=height;anchor.project(camera);
 terminal.hidden=units.some((u,i)=>Math.hypot(u.position.x-home[i][0],u.position.z-home[i][2])>.01)||Math.cos(yaw-laptop.rotation.y)<.96||Math.abs(pitch-.46)>.17;
 if(!terminal.hidden){
   lid.updateWorldMatrix(true,false);
   const corner=(x,y)=>{const v=lid.localToWorld(new T.Vector3(x,y,.028)).project(camera);return {x:(v.x+1)*w/2,y:(1-v.y)*h/2}};
   const a=corner(-1.29,1.8115),b=corner(1.29,1.8115),c=corner(-1.29,.1345);
   terminal.style.transform='matrix('+[(b.x-a.x)/480,(b.y-a.y)/480,(c.x-a.x)/280,(c.y-a.y)/280,a.x,a.y].join(',')+')';
 }
 let tag=el('anchor');tag.hidden=false;tag.style.left=Math.max(61,Math.min(w-66,(anchor.x+1)*w/2))+'px';tag.style.top=Math.max(44,Math.min(h-6,(1-anchor.y)*h/2))+'px';
 pins.forEach((p,i)=>{p.hidden=selected!==3||spread<.55;if(p.hidden)return;let v=layers[i].getWorldPosition(new T.Vector3());v.x+=.76;v.project(camera);p.style.left=Math.min(w-46,(v.x+1)*w/2)+'px';p.style.top=(1-v.y)*h/2+'px'});
 renderer.render(scene,camera);if(entering)schedule();if(!reduced.matches&&((running&&pausedAt===null&&age<3.8)||(!running&&age<2.1)||Math.abs(spread-amount)>.001))schedule()}
 function resize(){const pixels=area.clientWidth*area.clientHeight;renderer.setPixelRatio(Math.min(3,Math.max(1.5,devicePixelRatio),Math.sqrt(3200000/Math.max(1,pixels))));renderer.setSize(area.clientWidth,area.clientHeight,false);schedule()}new ResizeObserver(resize).observe(area);
 new IntersectionObserver(([v])=>{visible=v.isIntersecting;if(visible)schedule()}).observe(area);document.addEventListener('visibilitychange',schedule);
 const ray=new T.Raycaster(),uv=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,1,0),0);
 function cast(e){let r=canvas.getBoundingClientRect();uv.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(uv,camera)}
 function ground(){return ray.ray.intersectPlane(plane,new T.Vector3())}
 canvas.onpointerdown=e=>{cast(e);let hit=ray.intersectObjects(units,true)[0]?.object;while(hit&&hit.userData.unit===undefined)hit=hit.parent;const id=hit?.userData.unit;if(id!==undefined)inspect(id);drag={id,x:e.clientX,y:e.clientY,at:ground(),origin:id===undefined?null:units[id].position.clone()};canvas.setPointerCapture(e.pointerId)};
 canvas.onpointermove=e=>{if(!drag)return;if(drag.id===undefined){yaw-=(e.clientX-drag.x)*.009;pitch=T.MathUtils.clamp(pitch+(e.clientY-drag.y)*.006,.24,1.15);drag.x=e.clientX;drag.y=e.clientY}else{cast(e);let at=ground();if(!at||!drag.at)return;let p=drag.origin.clone().add(at.sub(drag.at));moveUnit(drag.id,p.x,p.z)}schedule()};
 canvas.onlostpointercapture=()=>drag=null;
 el('turn').onclick=()=>{yaw+=.35;schedule()};el('move').onclick=()=>{let p=units[selected].position;moveUnit(selected,home[selected][0]+(p.x===home[selected][0]?.48:0),p.z)};
 el('reset').onclick=()=>{showLid(false);home.forEach((p,i)=>units[i].position.set(...p));yaw=.16;pitch=.46;wire();resetBooking()};
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();visible=false;cancelAnimationFrame(raf);canvas.hidden=true;terminal.hidden=true;lidButton.hidden=true;redraw=()=>{};diagram()});resize()
}
