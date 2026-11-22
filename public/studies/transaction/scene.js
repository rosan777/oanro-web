const cv=document.querySelector('canvas'), gl=cv.getContext('webgl',{antialias:true,alpha:true});
let yaw=-.55,pitch=.44,zoom=1,manual=0,target=0,lift=0,frame=0,focus=0,lost=false,program;
const vertex=`attribute vec3 p,n,col;attribute float layer,metal;uniform vec4 view;uniform vec2 size;uniform float spread,focusY;varying vec3 normal,base,world,eye;varying float gloss,which;uniform vec3 recordState;
void main(){world=p+vec3(0.,max(0.,layer+1.)*spread,0.);if(metal<0.){float state=layer<.5?recordState.x:layer<1.5?recordState.y:recordState.z;world.y+=state<.5?-0.10:0.;}vec3 v=world-vec3(0.,focusY,0.);float c=cos(view.x),s=sin(view.x),a=cos(view.y),b=sin(view.y);float d=-s*v.x+c*v.z;vec3 camera=vec3(c*v.x+s*v.z,a*v.y-b*d,b*v.y+a*d);float distance=12.-camera.z;gl_Position=vec4(camera.xy*view.z*size,(distance-7.)*.8,distance);eye=normalize(vec3(-s*a,b,c*a)*12.+vec3(0.,focusY,0.)-world);normal=n;base=col;if(metal<0.){float state=layer<.5?recordState.x:layer<1.5?recordState.y:recordState.z;base=state<.5?vec3(.15):state<1.5?vec3(.80,.51,.18):vec3(.62,.84,.54);}gloss=abs(metal);which=layer;}`;
const fragment=`precision mediump float;varying vec3 normal,base,world,eye;varying float gloss,which;uniform vec3 recordState;uniform float active;
void main(){vec3 N=normalize(normal),V=normalize(eye),L=normalize(vec3(-.6,.92,.58));float diffuse=max(dot(N,L),0.);vec3 R=reflect(-V,N);float strip=smoothstep(.66,.93,dot(R,normalize(vec3(-.42,.79,.44))));float rim=pow(1.-max(dot(N,V),0.),3.);float grain=sin(world.x*155.+world.z*17.)*.016*gloss;vec3 color=base*(.44+.58*diffuse+.12*N.y+grain)+vec3(.89,.88,.97)*(pow(max(dot(N,normalize(L+V)),0.),mix(18.,74.,gloss))*.46+strip*.23*gloss+rim*.09);color+=base*.09*(1.-step(.1,abs(which-active)));gl_FragColor=vec4(color,1.);}`;
const verts=[];let group=-1;
function face(a,b,c,color,m){const u=b.map((v,i)=>v-a[i]),v=c.map((q,i)=>q-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(...n)||1;for(const p of [a,b,c])verts.push(...p,...n.map(x=>x/l),...color,group,m)}
const titanium=[.55,.54,.64],graphite=[.19,.185,.23],violet=[.49,.36,.72],amber=[.77,.62,.32],teal=[.29,.54,.55],chrome=[.74,.75,.76];
function solid(x,y,z,w,d,h,color,m=.6,round=.15,segments=4){
 const r=Math.min(w/2,d/2,round),ring=[];
 for(let j=0;j<4;j++){let cx=(j===0||j===3?1:-1)*(w/2-r),cz=(j<2?1:-1)*(d/2-r);for(let i=0;i<=segments;i++){let a=(j+i/segments)*Math.PI/2;ring.push([x+cx+r*Math.cos(a),z+cz+r*Math.sin(a)])}}
 const bevel=Math.min(.045,h*.2,w*.05,d*.05),rings=[[0,bevel],[bevel,0],[h-bevel,0],[h,bevel]].map(([dy,inset])=>ring.map(([u,v])=>[x+(u-x)*(1-2*inset/w),y+dy,z+(v-z)*(1-2*inset/d)]));
 for(let i=0;i<ring.length;i++){let j=(i+1)%ring.length;for(let k=0;k<3;k++){const a=rings[k][i],b=rings[k+1][i],c=rings[k+1][j],e=rings[k][j];face(a,b,c,color,m);face(a,c,e,color,m)}face([x,y+h,z],rings[3][j],rings[3][i],color,m);face([x,y,z],rings[0][i],rings[0][j],color,m)}
}
solid(0,-1.05,0,5.3,3.05,.25,graphite);solid(0,-.83,0,5.1,2.89,.09,titanium);
for(const x of [-2.28,2.28])for(const z of [-1.12,1.12]){solid(x,-.74,z,.14,.14,1.05,chrome,.95,.07);solid(x,.31,z,.22,.22,.065,graphite,.6,.11)}
const palette=[violet,amber,teal];
for(let i=0;i<3;i++){group=i;let y=-.67+i*.28;solid(0,y,0,4.26,2.12,.20,palette[i]);solid(0,y+.20,0,3.96,1.88,.045,graphite);
 for(let col=0;col<4;col++)for(let row=0;row<2;row++){let x=-1.38+col*.89,z=-.44+row*.82;solid(x,y+.25,z,.66,.52,.06,palette[i],.35,.055);for(let k=0;k<4;k++)solid(x-.20+k*.13,y+.31,z,.028,.33,.018,chrome,.85,.008,1)}
 for(let pin=0;pin<5;pin++)solid(.65+pin*.17,y+.245,.81,.10,.12,.09,palette[i],-.35,.02);
 for(let k=0;k<12;k++)solid(-1.65+k*.15,y+.025,1.06,.08,.025,.09,amber,.85,.008,1)}
group=3;solid(0,.25,0,4.98,2.79,.22,titanium,.9);solid(0,.47,0,4.42,2.3,.05,graphite);
for(let i=0;i<18;i++)solid(-1.74+i*.205,.52,0,.11,1.80,.13,titanium,.92,.045);
for(const x of [-2.23,2.23])for(const z of [-1.1,1.1]){solid(x,.47,z,.18,.18,.055,chrome,1,.09);solid(x,.525,z,.09,.022,.008,graphite,.3,.006,1)}
function init(){if(!gl)return false;const compile=(type,text)=>{const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return false;gl.useProgram(program);const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.STATIC_DRAW);
 for(const [name,len,offset] of [['p',3,0],['n',3,3],['col',3,6],['layer',1,9],['metal',1,10]]){const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,len,gl.FLOAT,false,44,offset*4)}
 gl.enable(gl.DEPTH_TEST);return true}
function fallback(){lost=true;rendererLabel='GPU unavailable';document.querySelector('.pins').hidden=true;let a=$('alternative');if(!a){a=document.createElement('a');a.id='alternative';a.className='link';a.href='C.html';a.textContent='Open inspection plate / পরিদর্শন চিত্র';a.style.cssText='position:absolute;left:12%;top:45%;color:var(--ink)';cv.parentNode.append(a)}render()}
const pins=document.querySelector('.pins');for(let i=0;i<3;i++){let b=btn(pins,()=>inspect(i));b.textContent=i+1}
function invalidate(){if(!frame&&!lost)frame=requestAnimationFrame(draw)}
function draw(){frame=0;if(lost)return;const w=cv.clientWidth,h=cv.clientHeight,d=Math.min(devicePixelRatio,2);if(cv.width!==Math.round(w*d)||cv.height!==Math.round(h*d)){cv.width=Math.round(w*d);cv.height=Math.round(h*d)}
 const dest=+$('cut').value*.009;const f=quiet()?1:.16;lift+=(dest-lift)*f;focus+=(target-focus)*f;
 const s=Math.min(w/7.25,h/7.45)*zoom,fy=.05+lift*1.8+focus;
 gl.viewport(0,0,cv.width,cv.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 const u=name=>gl.getUniformLocation(program,name);gl.uniform4f(u('view'),yaw,pitch,s*24,0);gl.uniform2f(u('size'),1/w,1/h);gl.uniform1f(u('spread'),lift);gl.uniform1f(u('focusY'),fy);gl.uniform1f(u('active'),part);const rolled=$('case').value==='abort'&&step===2;gl.uniform3f(u('recordState'),rolled?0:step<2?1:2,rolled||step<1?0:step<2?1:2,step<4?0:2);gl.drawArrays(gl.TRIANGLES,0,verts.length/11);
 records().forEach((r,i)=>{const x=(i-1)*1.10,y=-.55+i*.28+(i+1)*lift-fy,z=1.12,depth=-Math.sin(yaw)*x+Math.cos(yaw)*z,k=12*s/(12-Math.sin(pitch)*y-Math.cos(pitch)*depth),b=pins.children[i];b.style.left=w/2+(Math.cos(yaw)*x+Math.sin(yaw)*z)*k+'px';b.style.top=h/2-(Math.cos(pitch)*y-Math.sin(pitch)*depth)*k+'px';b.setAttribute('aria-pressed',i===part);b.setAttribute('aria-label',r.name)});
 if(Math.abs(dest-lift)+Math.abs(target-focus)>.002)invalidate()
}
syncCamera=()=>{target=(part-1)*.21;$('cut').value=[54,77,92][part];invalidate()};paint=invalidate;
$('cut').oninput=invalidate;$('left').onclick=()=>{yaw-=.22;invalidate()};$('right').onclick=()=>{yaw+=.22;invalidate()};$('plus').onclick=()=>{zoom=Math.min(1.4,zoom+.1);invalidate()};$('minus').onclick=()=>{zoom=Math.max(.65,zoom-.1);invalidate()};$('home').onclick=()=>{yaw=-.55;pitch=.44;zoom=1;target=0;$('cut').value=65;invalidate()};
let drag=null;cv.onpointerdown=e=>{cv.setPointerCapture(e.pointerId);drag=[e.clientX,e.clientY,yaw,pitch]};cv.onpointermove=e=>{if(drag){yaw=drag[2]+(e.clientX-drag[0])*.008;pitch=Math.min(1.1,Math.max(.12,drag[3]+(e.clientY-drag[1])*.005));invalidate()}};cv.onpointerup=cv.onpointercancel=()=>drag=null;
cv.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback()});cv.addEventListener('webglcontextrestored',()=>{if(init()){lost=false;$('alternative')?.remove();pins.hidden=false;rendererLabel='WEBGL';render()}});
try{if(init()){rendererLabel='WEBGL';render()}else fallback()}catch{fallback()}new ResizeObserver(invalidate).observe(cv);
