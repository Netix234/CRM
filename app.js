const $=s=>document.querySelector(s);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const LS={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const STAGES=['Новые','В работе','Ждём оплату','Закрыты'], CUR={USD:'$',EUR:'€',UAH:'₴',RUB:'₽'}, DR={USD:1,EUR:.92,UAH:41.5,RUB:92};
const DAY=864e5, today=()=>new Date().toISOString().slice(0,10), fmtD=s=>s.split('-').reverse().slice(0,2).join('.');
const addDays=n=>new Date(Date.now()+n*DAY).toISOString().slice(0,10);
let user=null,db=null,view='home',signup=false,timer=null;
const save=()=>LS.set('kizex_data_'+user.email,db);
const rate=c=>db.settings.rates[c]||DR[c];
const conv=(n,f,t)=>n/rate(f||t)*rate(t);
const nf=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0});
const money=(n,f)=>{const t=db.settings.cur;return nf.format(conv(n,f,t))+' '+CUR[t]};
const cname=id=>(db.clients.find(c=>c.id===id)||{}).name||'Без клиента';
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),2200)}

/* ---------- регистрация и вход ---------- */
async function hash(p,s){const d=s+p;if(window.crypto&&crypto.subtle){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(d));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}let h=5381;for(const c of d)h=(h*33^c.charCodeAt(0))>>>0;return String(h)}
function authMode(s){signup=s;$('#an').style.display=s?'':'none';$('#an').required=s;$('#asub').textContent=s?'Создайте аккаунт за 10 секунд':'Войдите в свой аккаунт';$('#af .btn').textContent=s?'Создать аккаунт':'Войти';$('#aswitch').textContent=s?'Уже есть аккаунт? Войти':'Нет аккаунта? Зарегистрироваться';$('#aerr').textContent=''}
$('#aswitch').onclick=()=>authMode(!signup);
$('#af').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target)),em=f.email.trim().toLowerCase(),users=LS.get('kizex_users')||{},err=$('#aerr');
  if(signup){if(users[em])return err.textContent='Эта почта уже зарегистрирована. Нажмите «Войти».';const salt=uid();users[em]={name:f.name.trim(),salt,hash:await hash(f.pass,salt)};LS.set('kizex_users',users)}
  else{const u=users[em];if(!u||u.hash!==await hash(f.pass,u.salt))return err.textContent='Неверная почта или пароль.'}
  e.target.reset();start(em,signup)};
function seed(){const a=uid(),b=uid(),c=uid();return{clients:[{id:a,name:'Анна Орлова',company:'Студия «Лайм»',phone:'+380501112233'},{id:b,name:'Максим Король',company:'ТехноПлюс',phone:'+380679998877'},{id:c,name:'Ирина Белая',company:'Кофейня Уют',phone:'+380931234567'}],
 deals:[{id:uid(),title:'Сайт для студии',client:a,sum:1100,cur:'USD',stage:1,due:addDays(3),upd:Date.now()-4*DAY},{id:uid(),title:'Поставка оборудования',client:b,sum:2900,cur:'EUR',stage:2,due:'',upd:Date.now()},{id:uid(),title:'Реклама в соцсетях',client:c,sum:18000,cur:'UAH',stage:0,due:'',upd:Date.now()}],
 tasks:[{id:uid(),text:'Позвонить Анне и уточнить макет',done:false,due:today()},{id:uid(),text:'Выставить счёт ТехноПлюс',done:false,due:addDays(2)},{id:uid(),text:'Отправить договор Ирине',done:true,due:''}]}}
function start(em,isNew){const u=(LS.get('kizex_users')||{})[em];if(!u)return;user={email:em,name:u.name};LS.set('kizex_session',em);
  db=LS.get('kizex_data_'+em)||(isNew?seed():{clients:[],deals:[],tasks:[]});
  db.settings=Object.assign({cur:'UAH',rates:{...DR},tg:{token:'',chat:'',on:true,stale:3}},db.settings||{});db.sent=db.sent||{};save();
  $('#auth').classList.add('hide');view='home';drawTop();render(true);rates(true);clearInterval(timer);remind();timer=setInterval(remind,3e5)}
function logout(){clearInterval(timer);LS.set('kizex_session',null);user=db=null;$('#auth').classList.remove('hide');authMode(false)}

/* ---------- валюты ---------- */
function drawTop(){$('#top').innerHTML=`<div class="seg">${Object.keys(CUR).map(k=>`<button data-cur="${k}" class="${k===db.settings.cur?'on':''}" title="${k}">${CUR[k]} ${k}</button>`).join('')}</div><div class="ava" title="${esc(user.name)}">${esc((user.name[0]||'?').toUpperCase())}</div>`}
async function rates(quiet){const last=db.settings.ratesAt||0;if(quiet&&Date.now()-last<DAY)return;
  try{const r=await(await fetch('https://open.er-api.com/v6/latest/USD')).json();Object.keys(CUR).forEach(k=>{if(r.rates&&r.rates[k])db.settings.rates[k]=+r.rates[k].toFixed(3)});db.settings.ratesAt=Date.now();save();render();quiet||toast('Курсы обновлены')}catch(e){quiet||toast('Не удалось обновить курсы. Введите их вручную.')}}

/* ---------- Telegram ---------- */
async function tg(m,body){const r=await fetch(`https://api.telegram.org/bot${db.settings.tg.token}/${m}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})});return r.json()}
const tgSend=t=>tg('sendMessage',{chat_id:db.settings.tg.chat,text:t});
async function remind(){const g=db&&db.settings.tg;if(!g||!g.on||!g.token||!g.chat)return;const td=today(),L=[],K=[];
  db.deals.filter(d=>d.stage<3).forEach(d=>{const n=Math.floor((Date.now()-d.upd)/DAY);let w='';if(d.due&&d.due<td)w='срок вышел '+fmtD(d.due);else if(d.due===td)w='срок сегодня';else if(n>=g.stale)w='без движения '+n+' дн.';
    if(w&&db.sent['d'+d.id]!==td){L.push(`💼 ${d.title} (${cname(d.client)}) — ${w}`);K.push('d'+d.id)}});
  db.tasks.filter(t=>!t.done&&t.due&&t.due<=td).forEach(t=>{if(db.sent['t'+t.id]!==td){L.push(`✅ ${t.text} — ${t.due<td?'просрочено':'на сегодня'}`);K.push('t'+t.id)}});
  if(!L.length)return;try{const r=await tgSend('🔔 Kizex CRM: напоминание\n\n'+L.join('\n'));if(r.ok){K.forEach(k=>db.sent[k]=td);save()}}catch(e){}}

/* ---------- окна ---------- */
function openForm(title,fields,onSave){const f=$('#form');
  f.innerHTML=`<h2>${title}</h2>`+fields.map(x=>`<label>${x.label}${x.type==='select'?`<select name="${x.name}">${x.options.map(o=>`<option value="${o[0]}">${esc(o[1])}</option>`).join('')}</select>`:`<input name="${x.name}" type="${x.type||'text'}" ${x.req?'required':''} placeholder="${x.ph||''}" autocomplete="off">`}</label>`).join('')+`<div class="row"><button class="btn" style="flex:1">Сохранить</button><button type="button" class="btn ghost" id="cancel">Отмена</button></div>`;
  $('#modal').classList.add('open');f.querySelector('input,select').focus();
  f.onsubmit=e=>{e.preventDefault();onSave(Object.fromEntries(new FormData(f)));close();save();render()};$('#cancel').onclick=close}
const close=()=>$('#modal').classList.remove('open');
$('#modal').onclick=e=>{if(e.target.id==='modal')close()};
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
const curOpts=()=>{const c=db.settings.cur;return [c,...Object.keys(CUR).filter(x=>x!==c)].map(k=>[k,k+' '+CUR[k]])};
const addClient=()=>openForm('Новый клиент',[{label:'Имя',name:'name',req:1,ph:'Например, Иван Петров'},{label:'Компания',name:'company',ph:'Необязательно'},{label:'Телефон',name:'phone',type:'tel',ph:'+380...'}],d=>{db.clients.unshift({id:uid(),...d});toast('Клиент добавлен')});
const addDeal=()=>{if(!db.clients.length){toast('Сначала добавьте клиента');return addClient()}
  openForm('Новая сделка',[{label:'Название',name:'title',req:1,ph:'Например, Разработка сайта'},{label:'Сумма',name:'sum',type:'number',req:1,ph:'0'},{label:'Валюта',name:'cur',type:'select',options:curOpts()},{label:'Клиент',name:'client',type:'select',options:db.clients.map(c=>[c.id,c.name])},{label:'Срок (необязательно)',name:'due',type:'date'}],d=>{db.deals.unshift({id:uid(),title:d.title,client:d.client,sum:+d.sum||0,cur:d.cur,due:d.due,stage:0,upd:Date.now()});toast('Сделка создана')})};
const addTask=()=>openForm('Новая задача',[{label:'Что нужно сделать',name:'text',req:1,ph:'Например, позвонить клиенту'},{label:'Срок (необязательно)',name:'due',type:'date'}],d=>{db.tasks.unshift({id:uid(),text:d.text,done:false,due:d.due});toast('Задача добавлена')});

/* ---------- экраны ---------- */
const taskRow=t=>`<div class="item ${t.done?'done':''}"><button class="chk" data-tg="${t.id}" aria-label="Отметить">${t.done?'✓':''}</button><div class="grow"><div class="t" style="white-space:normal">${esc(t.text)}</div>${t.due?`<div class="due ${t.due<today()&&!t.done?'late':''}">до ${fmtD(t.due)}</div>`:''}</div><button class="ic" data-del="tasks:${t.id}" title="Удалить">✕</button></div>`;
const V={
home(){const act=db.deals.filter(d=>d.stage<3),open=db.tasks.filter(t=>!t.done),tot=act.reduce((s,d)=>s+conv(d.sum,d.cur,db.settings.cur),0);
 return `<div class="head"><div><h1>Привет, ${esc(user.name)} 👋</h1><p class="sub">Вот что происходит в вашем бизнесе сегодня</p></div></div>
 <div class="card hero tilt"><div><h2>Быстрые действия</h2><p class="sub" style="margin-bottom:16px">Нажмите кнопку, чтобы добавить новое</p><div class="row"><button class="btn" data-a="client">+ Клиент</button><button class="btn" data-a="deal">+ Сделка</button><button class="btn ghost" data-a="task">+ Задача</button></div></div><div class="stage"><div class="cube"><b>K</b><b>K</b><b>K</b><b>K</b><b>K</b><b>K</b></div></div></div>
 <div class="grid4"><div class="card stat tilt"><div class="num" data-n="${db.clients.length}">${db.clients.length}</div><p>Клиентов</p></div><div class="card stat tilt"><div class="num" data-n="${act.length}">${act.length}</div><p>Сделок в работе</p></div><div class="card stat tilt"><div class="num" data-n="${tot}" data-m="1">${nf.format(tot)} ${CUR[db.settings.cur]}</div><p>Сумма в работе</p></div><div class="card stat tilt"><div class="num" data-n="${open.length}">${open.length}</div><p>Задач осталось</p></div></div>
 <div class="cols"><div class="card"><h2>Ближайшие задачи</h2><div class="list">${open.slice(0,4).map(taskRow).join('')||'<div class="empty">Все задачи выполнены 🎉</div>'}</div></div>
 <div class="card"><h2>Последние сделки</h2><div class="list">${db.deals.slice(0,4).map(d=>`<div class="item"><div class="grow"><div class="t">${esc(d.title)}</div><div class="m">${esc(cname(d.client))} · ${STAGES[d.stage]}</div></div><div class="sum">${money(d.sum,d.cur)}</div></div>`).join('')||'<div class="empty">Сделок пока нет</div>'}</div></div></div>`},
clients(){return `<div class="head"><div><h1>Клиенты</h1><p class="sub">Все ваши контакты в одном месте</p></div><button class="btn" data-a="client">+ Добавить клиента</button></div><input id="q" placeholder="Поиск по имени, компании или телефону" style="margin-bottom:16px"><div class="list" id="cl"></div>`},
deals(){return `<div class="head"><div><h1>Сделки</h1><p class="sub">Двигайте сделки по этапам стрелками ‹ ›</p></div><button class="btn" data-a="deal">+ Новая сделка</button></div>
 <div class="board">${STAGES.map((s,i)=>{const l=db.deals.filter(d=>d.stage===i);return `<div class="card col"><h2>${s}<small>${l.length} · ${money(l.reduce((a,d)=>a+conv(d.sum,d.cur,db.settings.cur),0))}</small></h2>${l.map(d=>`<div class="card deal tilt"><div class="t">${esc(d.title)}</div><div class="m">${esc(cname(d.client))}</div>${d.due?`<div class="due ${d.due<today()&&i<3?'late':''}">📅 до ${fmtD(d.due)}</div>`:''}<div class="row"><span class="sum">${money(d.sum,d.cur)}</span><span class="row" style="gap:6px"><button class="ic" data-mv="${d.id}" data-d="-1" ${i?'':'disabled style="opacity:.3"'} title="Назад">‹</button><button class="ic" data-mv="${d.id}" data-d="1" ${i<3?'':'disabled style="opacity:.3"'} title="Дальше">›</button><button class="ic" data-del="deals:${d.id}" title="Удалить">✕</button></span></div></div>`).join('')||'<div class="empty">Пусто</div>'}</div>`}).join('')}</div>`},
tasks(){return `<div class="head"><div><h1>Задачи</h1><p class="sub">Нажмите на квадрат, чтобы отметить выполненной</p></div><button class="btn" data-a="task">+ Новая задача</button></div><div class="card"><div class="list">${db.tasks.map(taskRow).join('')||'<div class="empty">Задач нет. Добавьте первую!</div>'}</div></div>`},
settings(){const s=db.settings,g=s.tg;return `<div class="head"><div><h1>Настройки</h1><p class="sub">Профиль, курсы валют и Telegram-бот</p></div></div><div class="set">
 <div class="card"><h2>Профиль</h2><div class="item"><div class="ava">${esc((user.name[0]||'?').toUpperCase())}</div><div class="grow"><div class="t">${esc(user.name)}</div><div class="m">${esc(user.email)}</div></div><button class="btn ghost" data-a="logout">Выйти</button></div></div>
 <div class="card"><h2>Курсы валют</h2><p class="sub" style="margin-bottom:12px">Сколько единиц валюты за 1 $. Валюту для просмотра переключайте вверху страницы.</p><div class="row">${['EUR','UAH','RUB'].map(k=>`<label style="flex:1;min-width:90px">${k} ${CUR[k]}<input type="number" step="0.01" data-r="${k}" value="${s.rates[k]}"></label>`).join('')}</div><div class="row" style="margin-top:12px"><button class="btn ghost" data-a="rates">Обновить курсы из интернета</button></div></div>
 <div class="card"><h2>Telegram-бот напоминаний</h2><ol class="steps"><li>В Telegram откройте @BotFather, отправьте /newbot и скопируйте токен.</li><li>Найдите своего бота и нажмите Start.</li><li>Вставьте токен ниже и нажмите «Найти мой Chat ID».</li></ol>
 <div class="fld"><label>Токен бота<input id="tgt" value="${esc(g.token)}" placeholder="123456:ABC..." autocomplete="off"></label><label>Chat ID<input id="tgc" value="${esc(g.chat)}" placeholder="Нажмите «Найти мой Chat ID»"></label><label>Напоминать о сделке, если она стоит без движения (дней)<input id="tgd" type="number" min="1" value="${g.stale}"></label><label class="tog"><input type="checkbox" id="tgo" ${g.on?'checked':''}>Присылать напоминания о сделках и задачах</label>
 <div class="row"><button class="btn" data-a="tgsave">Сохранить</button><button class="btn ghost" data-a="tgfind">Найти мой Chat ID</button><button class="btn ghost" data-a="tgtest">Отправить тест</button></div><p class="sub" style="font-size:13px">Бот напоминает, пока CRM открыта в браузере: о сделках без движения, просроченных сроках и задачах на сегодня. Каждое напоминание приходит раз в день.</p></div></div>
 <div class="card"><h2>Данные</h2><button class="btn ghost" data-a="wipe">Удалить всех клиентов, сделки и задачи</button></div></div>`}};
function clientList(){const q=($('#q')?.value||'').toLowerCase(),l=db.clients.filter(c=>(c.name+c.company+c.phone).toLowerCase().includes(q));
 $('#cl').innerHTML=l.map(c=>`<div class="item"><div class="ava">${esc(c.name[0]||'?').toUpperCase()}</div><div class="grow"><div class="t">${esc(c.name)}</div><div class="m">${esc(c.company||'—')} · ${esc(c.phone||'нет телефона')}</div></div>${c.phone?`<a class="ic" href="tel:${esc(c.phone)}" title="Позвонить">✆</a>`:''}<button class="ic" data-del="clients:${c.id}" title="Удалить">✕</button></div>`).join('')||'<div class="empty">Ничего не найдено</div>'}
function countUp(){document.querySelectorAll('[data-n]').forEach(el=>{const n=+el.dataset.n,m=el.dataset.m,c=CUR[db.settings.cur],t0=performance.now();
 const step=t=>{const p=Math.min(1,(t-t0)/700),v=n*(1-Math.pow(1-p,3));el.textContent=nf.format(v)+(m?' '+c:'');if(p<1)requestAnimationFrame(step)};requestAnimationFrame(step)})}
function render(anim){const v=$('#view');v.className=anim?'go':'';v.innerHTML=V[view]();
 document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===view));
 if(view==='clients'){clientList();$('#q').oninput=clientList}countUp()}

/* ---------- события ---------- */
document.addEventListener('click',async e=>{const t=e.target.closest('button,a');if(!t||!db)return;const D=t.dataset,g=db.settings.tg;
 if(D.v){view=D.v;render(true);scrollTo({top:0,behavior:'smooth'})}
 else if(D.cur){db.settings.cur=D.cur;save();drawTop();render()}
 else if(D.a){const A=D.a;
  if(A==='client')addClient();else if(A==='deal')addDeal();else if(A==='task')addTask();else if(A==='logout')logout();else if(A==='rates')rates();
  else if(A==='wipe'){if(confirm('Удалить все данные? Это нельзя отменить.')){db.clients=[];db.deals=[];db.tasks=[];save();render();toast('Данные удалены')}}
  else if(A.startsWith('tg')){g.token=$('#tgt').value.trim();
   if(A==='tgsave'){g.chat=$('#tgc').value.trim();g.stale=Math.max(1,+$('#tgd').value||3);g.on=$('#tgo').checked;save();toast('Настройки бота сохранены');remind()}
   else if(!g.token)toast('Сначала вставьте токен бота');
   else if(A==='tgfind'){try{const r=await tg('getUpdates'),m=[...(r.result||[])].reverse().find(u=>u.message);if(m){$('#tgc').value=m.message.chat.id;toast('Chat ID найден. Нажмите «Сохранить»')}else toast(r.ok?'Сначала напишите боту /start в Telegram':'Токен не подошёл')}catch(x){toast('Нет связи с Telegram')}}
   else if(A==='tgtest'){g.chat=$('#tgc').value.trim();try{const r=await tgSend('✅ Kizex CRM подключена. Напоминания включены!');toast(r.ok?'Тест отправлен в Telegram':'Ошибка: проверьте токен и Chat ID')}catch(x){toast('Нет связи с Telegram')}}}}
 else if(D.tg){const x=db.tasks.find(i=>i.id===D.tg);x.done=!x.done;save();render()}
 else if(D.mv){const d=db.deals.find(i=>i.id===D.mv);d.stage=Math.max(0,Math.min(3,d.stage+ +D.d));d.upd=Date.now();save();render();toast('Сделка: '+STAGES[d.stage]);
  if(d.stage===3&&g.on&&g.token&&g.chat)tgSend('🎉 Сделка закрыта: '+d.title).catch(()=>{})}
 else if(D.del){const [k,id]=D.del.split(':');if(confirm('Удалить? Это нельзя отменить.')){t.closest('.item,.deal').classList.add('out');setTimeout(()=>{db[k]=db[k].filter(i=>i.id!==id);if(k==='clients')db.deals=db.deals.filter(d=>d.client!==id);save();render();toast('Удалено')},220)}}});
document.addEventListener('change',e=>{const k=e.target.dataset?.r;if(k&&db){db.settings.rates[k]=+e.target.value||DR[k];save();toast('Курс сохранён')}});
document.addEventListener('pointermove',e=>{const c=e.target.closest?.('.tilt');if(!c)return;const r=c.getBoundingClientRect();c.style.setProperty('--mx',e.clientX-r.left+'px');c.style.setProperty('--my',e.clientY-r.top+'px')});
const ses=LS.get('kizex_session');if(ses)start(ses);
