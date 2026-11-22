const query = new URLSearchParams(location.search);
const bn = query.get("lang") === "bn";
const t = (en, bangla) => bn ? bangla : en;
const models = {
  systems: [
    [t("Available", "মজুত"), t("Orders check the shelf before requesting the last unit.", "তাকে একটি পণ্য আছে। দুটি অর্ডারই পণ্যটি চাইতে পারে।")],
    [t("Reserve", "সংরক্ষণ"), t("The reservation ledger holds the last unit for order A.", "অর্ডার A পণ্যটি সংরক্ষণ করেছে। অর্ডার B-এর জন্য মজুত শূন্য।")],
    [t("Dispatch", "পাঠান"), t("Order A’s unit is packed, then sent to dispatch.", "সংরক্ষিত পণ্যটি পাঠানোর স্থানে গেছে। শুধু অর্ডার A পণ্যটি পায়।")],
  ],
  app: [
    [t("Edit offline", "অফলাইনে লিখুন"), t("The handset saves the offline edit in its local cache.", "সংযোগ বিচ্ছিন্ন অবস্থায় পরিবর্তনটি ফোনে সংরক্ষিত হয়।")],
    [t("Queue update", "সারিতে রাখুন"), t("The pending queue holds the edit until the network returns.", "সংযোগ ফিরে আসা পর্যন্ত আপডেটটি ফোনের সারিতে থাকে।")],
    [t("Synchronize", "সিঙ্ক করুন"), t("The API writes to the sync store and clears the pending edit.", "সার্ভার আপডেটটি নিশ্চিত করেছে। অপেক্ষমাণ সারি এখন খালি।")],
  ],
  strategy: [
    [t("Current system", "বর্তমান ব্যবস্থা"), t("The router sends traffic to the current service.", "ট্রাফিকের দুটি পথই পুরোনো সেবায় যায়।")],
    [t("Canary", "সীমিত স্থানান্তর"), t("The router splits test traffic to the candidate while metrics are checked.", "একটি পরীক্ষামূলক পথ নতুন সেবায় যায়। অন্যটি পুরোনো সেবায় থাকে।")],
    [t("Roll back", "আগের ব্যবস্থায় ফিরুন"), t("Rollback sends traffic back to the current service.", "পরীক্ষামূলক পথ পুরোনো সেবায় ফিরেছে। নতুন সেবাটি আলাদা থাকে।")],
  ],
};
const systemTheme = matchMedia("(prefers-color-scheme: dark)");
const appearanceRoot = parent.document.documentElement;
function applyTheme() {
  const appearance = appearanceRoot.dataset.appearance || "system";
  document.body.classList.toggle("dark", appearance === "dark" || (appearance === "system" && systemTheme.matches));
}
const themeObserver = new MutationObserver(applyTheme);
themeObserver.observe(appearanceRoot, {attributes:true,attributeFilter:["data-appearance"]});
systemTheme.addEventListener("change",applyTheme);
window.addEventListener("pagehide",()=>themeObserver.disconnect(),{once:true});
applyTheme();

const kind = query.get("model");
const states = models[kind] || models.systems;
document.documentElement.lang = bn ? "bn" : "en";
const canvas = document.querySelector("canvas");

const note = document.querySelector("#note");
const rotate = document.querySelector("#rotate");

rotate.textContent = t("↶ Rotate", "↶ ঘোরান");
rotate.title = rotate.ariaLabel = t("Rotate view", "দৃশ্য ঘোরান");
let step = 0, draw = () => {};
function show(i) {
  step = i;
  note.textContent = states[i][1];
  canvas.setAttribute("aria-label", states[i][1]);
  draw();
}
const motion = matchMedia("(prefers-reduced-motion: reduce)");
let visible = false;
let refreshSignals = () => {};
new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; refreshSignals(); }).observe(canvas);
setInterval(() => {
  if (visible && !document.hidden && !motion.matches) show((step + 1) % states.length);
}, 3600);
show(0);
try {
  const T = await import("./three.module.min.js");
  const renderer = new T.WebGLRenderer({canvas, alpha:true, antialias:true});
  renderer.setPixelRatio(Math.min(3, Math.max(devicePixelRatio, 1.5)));
  const scene = new T.Scene(), group = new T.Group();
  scene.add(group, new T.HemisphereLight(0xfff6ff, 0x71858a, 2));
  const lamp = new T.DirectionalLight(0xffffff, 2.2);
  lamp.position.set(3, 5, 4);
  scene.add(lamp);
  const camera = new T.PerspectiveCamera(37,1,.1,100);
  let yaw = .38, pitch = .55;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  const metal = 0x8398a7, dark = 0x263746, violet = 0xc4a8e6;
  const mint = 0x92d4bb, gold = 0xe6b765, white = 0xe5ebf1;
  const material = new Map();
  const {RoundedBoxGeometry} = await import("./RoundedBoxGeometry.js");
  function mesh(geometry, color, parent, x, y, z) {
    if (!material.has(color)) {
      material.set(color, new T.MeshStandardMaterial({color, roughness:.42, metalness:.24}));
    }
    const part = new T.Mesh(geometry, material.get(color));
    part.position.set(x,y,z);
    parent.add(part);
    return part;
  }
  function block(parent,x,y,z,w,h,d,color) {
    return mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.16),color,parent,x,y,z);
  }
  function module(x,z) {
    const unit = new T.Group();
    unit.position.set(x,0,z);
    group.add(unit);
    block(unit,0,.07,0,1.25,.14,.94,dark);
    block(unit,0,.146,0,1.13,.018,.82,metal);
    for (const x of [-.49,.49]) {
      for (const z of [-.34,.34]) {
        mesh(new T.CylinderGeometry(.032,.032,.014,12),white,unit,x,.159,z);
      }
    }
    for(let j=0;j<7;j++)block(unit,(j-3)*.104,.08,.473,.053,.027,.009,0x111a24);
    return unit;
  }
  function stack(parent, count, color) {
    for(let i=0;i<count;i++){
      const y=.24+i*.19;
      block(parent,0,y,0,.94,.16,.66,color);
      block(parent,-.21,y,.338,.4,.039,.025,dark);
      for(let j=0;j<3;j++)block(parent,.19+j*.083,y,.343,.042,.043,.026,j===2?mint:white);
    }
  }
  function database(parent) {
    for(let i=0;i<3;i++){
      mesh(new T.CylinderGeometry(.34,.34,.115,32),i===2?metal:dark,parent,0,.22+i*.132,0);
      mesh(new T.CylinderGeometry(.34,.34,.025,32),mint,parent,0,.27+i*.132,0);
    }
    mesh(new T.CylinderGeometry(.22,.22,.023,32),dark,parent,0,.56,0);
    mesh(new T.TorusGeometry(.22,.019,9,32),white,parent,0,.585,0).rotation.x=-Math.PI/2;
    mesh(new T.CylinderGeometry(.095,.095,.02,24),mint,parent,0,.581,0);
  }
  function panel(parent,color) {
    block(parent,0,.48,-.12,.95,.57,.11,dark);
    block(parent,0,.49,-.053,.81,.43,.025,metal);
    for(let i=0;i<5;i++)block(parent,(i-2)*.135,.37+i*.044,-.035,.072,.11+i*.054,.025,i===4?color:dark);
  }
  const modules = [[-1.55,-1.14],[0,-1.14],[1.55,-1.14],[-.83,.83],[.83,.83]].map(([x,z])=>module(x,z));
  let order;
  if (kind === "app") {
    const [phone, cache, api, queue, store] = modules;
    block(phone,0,.25,0,.63,.14,.86,metal);
    block(phone,0,.33,0,.55,.025,.75,dark);
    block(phone,0,.35,-.12,.44,.019,.27,violet);
    for(let j=0;j<3;j++)block(phone,0,.35,.065+j*.08,.39-j*.06,.019,.034,white);
    block(phone,0,.35,-.318,.12,.02,.031,dark);
    block(phone,-.322,.24,-.12,.017,.052,.18,white);
    database(cache);
    stack(api,3,metal);
    for(let j=0;j<3;j++){
      block(queue,(j-1)*.28,.27,0,.22,.235,.55,j===0?violet:metal);
      block(queue,(j-1)*.28,.4,0,.14,.025,.32,white);
    }
    database(store);
    order=[phone,cache,queue,api,store];
  } else if (kind === "strategy") {
    const [current, router, candidate, metrics, rollback] = modules;
    stack(current,3,metal);
    stack(candidate,3,violet);
    block(router,0,.27,0,.87,.24,.5,dark);
    for(let j=0;j<6;j++)block(router,(j-2.5)*.12,.28,.257,.067,.064,.035,j<2?mint:metal);
    panel(metrics,mint);
    mesh(new T.TorusGeometry(.26,.046,12,38,Math.PI*1.65),gold,rollback,0,.38,0).rotation.x=-Math.PI/2;
    const arrow=mesh(new T.ConeGeometry(.105,.17,3),gold,rollback,.24,.38,.12);
    arrow.rotation.z=-Math.PI/2;
    order=[router,current,candidate,metrics,rollback];
  } else {
    const [inventory, reservation, shipping, orders, packing] = modules;
    for(const x of [-.46,.46])for(const z of [-.28,.28])block(inventory,x,.46,z,.048,.65,.048,metal);
    for(const y of [.21,.47,.74])block(inventory,0,y,0,.95,.049,.62,metal);
    block(inventory,-.2,.58,0,.33,.187,.36,gold);
    block(inventory,-.2,.679,0,.09,.022,.37,white);
    database(reservation);
    panel(orders,violet);
    block(packing,0,.24,0,.94,.15,.55,metal);
    block(packing,.06,.395,0,.46,.17,.38,gold);
    block(packing,.06,.49,0,.095,.02,.38,white);
    block(shipping,0,.36,0,.63,.30,.45,metal);
    block(shipping,.39,.28,0,.22,.19,.45,mint);
    block(shipping,.41,.355,0,.13,.08,.33,dark);
    block(shipping,.505,.268,0,.024,.06,.29,metal);
    for(const z of [-.164,.164])block(shipping,.524,.278,z,.022,.053,.055,gold);
    for(const x of [-.2,.36])for(const z of [-.22,.22]){
      mesh(new T.CylinderGeometry(.09,.09,.047,16),dark,shipping,x,.17,z).rotation.x=Math.PI/2;
    }
    order=[orders,inventory,reservation,packing,shipping];
  }
  const route = kind === "strategy" ? [[0,1],[0,2],[2,3],[0,4]] : [[0,1],[1,2],[2,3],[3,4]];
  const links = route.map(() => {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute("position", new T.Float32BufferAttribute(new Float32Array(6), 3));
    const line = new T.Line(geometry, new T.LineBasicMaterial({color:metal}));
    line.frustumCulled = false;
    const signal = mesh(new T.SphereGeometry(.064,12,10), mint, group, 0,0,0);
    group.add(line);
    return {line,signal};
  });
  const markers=order.map(unit=>block(unit,0,.17,.39,.27,.027,.047,white));
  const active = kind === "strategy" ? [[0],[0,1,2],[0,3]] : [[0,1],[1,2],[2,3]];
  function update() {
    const progress = motion.matches ? .5 : (performance.now() % 1750) / 1750;
    links.forEach(({line, signal},i) => {
      const [from,to] = route[i];
      const a = order[from].position, b = order[to].position;
      const position = line.geometry.attributes.position;
      position.setXYZ(0,a.x,.10,a.z);
      position.setXYZ(1,b.x,.10,b.z);
      position.needsUpdate = true;
      signal.visible = active[step].includes(i);
      line.material.color.setHex(signal.visible ? mint : 0x596574);
      signal.position.lerpVectors(a,b,progress);
      signal.position.y = .19;
    });
    const lit = new Set(active[step].flatMap(i=>route[i]));
    markers.forEach((marker,i)=>{marker.visible=lit.has(i)});
  }
  const rim = new T.DirectionalLight(0xc7c4ff,1.35);
  rim.position.set(-4,3,-4);
  scene.add(rim);
  const names = kind === "app"
    ? [t("Handset","ফোন"),t("Local cache","লোকাল ক্যাশ"),t("Pending queue","অপেক্ষমাণ কিউ"),t("Sync API","সিঙ্ক API"),t("Sync database","সিঙ্ক ডেটাবেস")]
    : kind === "strategy"
      ? [t("Traffic router","ট্রাফিক রাউটার"),t("Current service","বর্তমান সার্ভিস"),t("Candidate service","নতুন সার্ভিস"),t("Health metrics","হেলথ মেট্রিক্স"),t("Rollback","রোলব্যাক")]
      : [t("Order panel","অর্ডার প্যানেল"),t("Stock shelf","মজুত শেলফ"),t("Reservation ledger","রিজার্ভেশন লেজার"),t("Packing station","প্যাকিং স্টেশন"),t("Dispatch van","ডেলিভারি ভ্যান")];
  const label = document.querySelector("#part-label");
  const ray = new T.Raycaster();
  const cursor = new T.Vector2();
  let selection = -1;
  function inspect(index) {
    selection = index;
    label.hidden = index < 0;
    label.textContent = names[index] || "";
    draw();
  }
  draw = () => {
    const {width,height} = canvas.getBoundingClientRect();
    if (!width || !height) return;
    update();
    order.forEach((unit,i)=>{unit.position.y=i===selection?.13:0});
    camera.aspect = width/height;
    camera.updateProjectionMatrix();
    const distance = 6.4 * Math.max(1, 1.18/camera.aspect);
    const reach = distance * Math.cos(pitch);
    camera.position.set(reach*Math.sin(yaw),.32+distance*Math.sin(pitch),reach*Math.cos(yaw));
    camera.lookAt(0,.32,0);
    renderer.render(scene,camera);
  };
  function orbit(dx,dy) {
    yaw -= dx*.009;
    pitch = T.MathUtils.clamp(pitch+dy*.008,-.08,1.43);
    draw();
  }
  rotate.hidden = false;
  rotate.onclick = () => orbit(-Math.PI/6/.009,0);
  const floor = new T.Plane(new T.Vector3(0,1,0),0);
  const point = new T.Vector3();
  let drag = null;
  function aim(event) {
    const box = canvas.getBoundingClientRect();
    cursor.set((event.clientX-box.left)/box.width*2-1,1-(event.clientY-box.top)/box.height*2);
    ray.setFromCamera(cursor,camera);
  }
  function movePart(unit,x,z) {
    x = T.MathUtils.clamp(x,-2.15,2.15);
    z = T.MathUtils.clamp(z,-1.7,1.65);
    if (order.some(other => other !== unit && Math.abs(other.position.x-x)<1.3 && Math.abs(other.position.z-z)<1.02)) return;
    unit.position.x=x;
    unit.position.z=z;
    draw();
  }
  canvas.addEventListener("pointerdown", event => {
    if (event.button !== 0 || !event.isPrimary) return;
    aim(event);
    let hit = ray.intersectObjects(order,true)[0]?.object;
    while (hit && !order.includes(hit)) hit=hit.parent;
    const offset = hit && ray.ray.intersectPlane(floor,point) ? hit.position.clone().sub(point) : null;
    drag = {hit,offset,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false};
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", event => {
    if (!drag || !event.isPrimary) return;
    if (Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>4) drag.moved=true;
    if (drag.moved && drag.hit && drag.offset) {
      aim(event);
      if (ray.ray.intersectPlane(floor,point)) {
        if (selection!==order.indexOf(drag.hit)) inspect(order.indexOf(drag.hit));
        movePart(drag.hit,point.x+drag.offset.x,point.z+drag.offset.z);
      }
    } else if (drag.moved && !drag.hit) orbit(event.clientX-drag.x,event.clientY-drag.y);
    drag.x=event.clientX;
    drag.y=event.clientY;
  });
  canvas.addEventListener("pointerup", () => {
    if (drag && !drag.moved) {
      const index=order.indexOf(drag.hit);
      inspect(index===selection?-1:index);
    }
    drag=null;
  });
  canvas.addEventListener("lostpointercapture",()=>{drag=null});
  let timer;
  refreshSignals = () => {
    clearInterval(timer);
    draw();
    if (visible && !document.hidden && !motion.matches) timer=setInterval(draw, 50);
  };
  document.addEventListener("visibilitychange",refreshSignals);
  motion.addEventListener("change",refreshSignals);
  refreshSignals();
  const keyboardOrbit = {ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,12],ArrowDown:[0,-12]};
  canvas.addEventListener("keydown",event=>{
    if (Object.hasOwn(keyboardOrbit,event.key)) {
      event.preventDefault();
      const [x,z] = keyboardOrbit[event.key];
      if (event.shiftKey && selection >= 0) {
        const unit = order[selection];
        movePart(unit,unit.position.x+x*.015,unit.position.z-z*.015);
      } else orbit(x,z);
    } else if (event.key==="Enter" || event.key===" ") {
      event.preventDefault();
      inspect((selection+1)%order.length);
    } else if (event.key==="Escape") inspect(-1);
  });
  canvas.tabIndex=0;
  canvas.setAttribute("aria-describedby","orbit-help");
  new ResizeObserver(()=>{
    renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);
    draw();
  }).observe(canvas);
  document.querySelector("#orbit-help").textContent=t(
    "Drag a component to move it or drag the grid to rotate. Enter selects a part. Shift and arrow keys move it.",
    "যন্ত্রাংশ টানলে সেটি সরে, গ্রিড টানলে দৃশ্য ঘোরে। Enter দিয়ে বেছে Shift ও তীর চিহ্ন দিয়ে সরান।"
  );
} catch (error) {
  canvas.hidden=true;
  canvas.style.display="none";
  console.warn("Service model renderer unavailable",error);
}
