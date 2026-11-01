const $=s=>document.querySelector(s),iso=d=>new Date(d).toISOString().slice(0,10),money=(n,c='DZD')=>(+n||0).toLocaleString('fr-FR',{maximumFractionDigits:2})+(c==='EUR'?' €':' DA'),currencyOptions=['DZD','EUR'],esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SUPABASE_URL='https://aplxwowroaajuytxdahi.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_14NcAkmAHgfGx42i-kuZBw_shLoGKJl';
const cloudClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
let cloudReady=false, cloudChannel=null;
let db;try{db=JSON.parse(localStorage.edm)}catch{}db=db||{vehicles:[['Kia KX1',2026,8000],['Livan X3 Pro',2026,7000],['Geely Coolray',2026,11500],['Fiat 500X',2024,9000]].map((x,i)=>({id:i+1,name:x[0],year:x[1],rate:x[2],status:'Disponible'})),reservations:[],clients:[],expenses:[],maintenance:[],cats:['⛽ Essence / Gasoil','🛢️ Vidange','🔩 Pièces de rechange','🧰 Entretien et réparation','🚘 Tôlerie','🏢 Fournitures du bureau','🧾 Frais administratifs','📦 Autres dépenses']};
// Migration douce des anciens dossiers : heure par défaut à 10:00.
db.reservations.forEach(r=>{r.startTime ||= '10:00';r.endTime ||= '10:00';r.currency ||= 'DZD';r.paymentStatus ||= 'En attente';r.receivedAt ||= ''});db.expenses.forEach(e=>e.currency ||= 'DZD');db.maintenance.forEach(m=>m.currency ||= 'DZD');let page='dashboard',planningOffset=0,lastAvailability=null;
function normalizeFinancialData(){db.reservations||=[];db.expenses||=[];db.maintenance||=[];db.reservations.forEach(r=>{r.currency||='DZD';r.paymentStatus||='En attente';r.receivedAt||=''});db.expenses.forEach(e=>e.currency||='DZD');db.maintenance.forEach(m=>m.currency||='DZD')}
function save(){localStorage.edm=JSON.stringify(db);if(cloudReady){cloudClient.from('app_state').upsert({id:1,data:db,updated_at:new Date().toISOString()}).then(({error})=>{if(error)console.error('Cloud save failed:',error)})}}
const names={dashboard:'Tableau de bord',planning:'Planning',reservations:'Réservations',disponibilites:'Disponibilités',vehicles:'Véhicules',clients:'Clients',finances:'Finances',expenses:'Dépenses',maintenance:'Maintenance'};
const pageIcons={dashboard:'🚘',planning:'📅',reservations:'📋',disponibilites:'🔎',vehicles:'🚗',clients:'👥',finances:'💰',expenses:'🧾',maintenance:'🔧'};
Object.keys(names).forEach(k=>{let b=document.createElement('button');b.textContent=names[k];b.onclick=()=>go(k);b.dataset.p=k;$('#nav').append(b)});
$('#headerReservation').hidden=true;
function go(p){page=p;$('#title').textContent=names[p];$('#pageIcon').textContent=pageIcons[p]||'🚘';$('#headerReservation').hidden=p!=='dashboard';document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.p===p));render()}
function table(h,rows){return `<div class="wrap panel"><table><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr>${rows||`<tr><td colspan="${h.length}" class="muted">Aucune donnée</td></tr>`}</table></div>`}
function card(t,v){return `<div class="card"><small>${t}</small><strong>${v}</strong></div>`}
function monthRange(){let d=new Date();return {from:new Date(d.getFullYear(),d.getMonth(),1).toISOString().slice(0,10),to:iso(d)}}
function bilan(from,to,currency){let bookings=db.reservations.filter(r=>r.start>=from&&r.start<=to&&r.status!=='Annulée'&&(!currency||r.currency===currency)),confirmed=bookings.filter(r=>r.status==='Confirmée'),pending=bookings.filter(r=>r.status==='En attente'),received=bookings.filter(r=>r.paymentStatus==='Encaissé'&&r.receivedAt>=from&&r.receivedAt<=to),revenue=received.reduce((n,r)=>n+(+r.total||0),0),held=bookings.filter(r=>r.paymentStatus!=='Encaissé').reduce((n,r)=>n+(+r.total||0),0),expenses=db.expenses.filter(e=>e.date>=from&&e.date<=to&&(!currency||e.currency===currency)),expenseTotal=expenses.reduce((n,e)=>n+(+e.amount||0),0),maint=db.maintenance.filter(m=>m.date>=from&&m.date<=to&&(!currency||m.currency===currency)),maintenanceTotal=maint.reduce((n,m)=>n+(+m.cost||0),0);return {bookings,confirmed,pending,received,revenue,held,expenses,expenseTotal,maint,maintenanceTotal,totalOut:expenseTotal+maintenanceTotal,balance:revenue-expenseTotal-maintenanceTotal}}
function dateTime(date,time){return new Date(`${date}T${time||'10:00'}:00`).getTime()}
function durationDays(r){let ms=dateTime(r.end,r.endTime)-dateTime(r.start,r.startTime);return Math.max(1,Math.ceil(ms/86400000))}
// Recalcule les anciennes réservations enregistrées avec l'ancien comptage inclusif.
db.reservations.forEach(r=>{let days=durationDays(r);if(r.days!==days){r.days=days;let v=db.vehicles.find(v=>v.name===r.car);if(v)r.total=days*(+v.rate||0)}});save();
function overlaps(aStart,aEnd,bStart,bEnd){return aStart<bEnd&&aEnd>bStart}
function reservationInterval(r){return [dateTime(r.start,r.startTime),dateTime(r.end,r.endTime)]}
function isAvailable(car,start,end,ignoreId=null){return !db.reservations.some(r=>r.car===car&&String(r.id)!==String(ignoreId)&&r.status!=='Annulée'&&(()=>{let [a,b]=reservationInterval(r);return overlaps(start,end,a,b)})())}
function render(){let inc=db.reservations.filter(x=>x.status!=='Annulée').reduce((s,x)=>s+(+x.total||0),0),out=db.expenses.reduce((s,x)=>s+(+x.amount||0),0),s='';
if(page==='dashboard'){let m=monthRange(),bd=bilan(m.from,m.to,'DZD'),be=bilan(m.from,m.to,'EUR');s=`<div class="cards">${card('Véhicules',db.vehicles.length)}${card('Disponibles aujourd’hui',db.vehicles.filter(v=>isAvailable(v.name,Date.now(),Date.now()+1)).length)}${card('Réservations',db.reservations.filter(r=>r.status!=='Annulée').length)}${card('Encaissements DZD',money(bd.revenue,'DZD'))}${card('Encaissements EUR',money(be.revenue,'EUR'))}</div><div class="panel"><h3>Accès rapide</h3><button onclick="reservationForm()">＋ Réservation</button> <button onclick="expenseForm()">＋ Dépense</button> <button class="secondary" onclick="go('disponibilites')">Disponibilités</button></div><div class="panel"><div class="row"><h3>Résumé financier · Mois en cours</h3><button class="secondary" onclick="go('finances')">Voir le bilan complet</button></div><div class="cards">${card('Encaissé DZD',money(bd.revenue,'DZD'))}${card('Encaissé EUR',money(be.revenue,'EUR'))}${card('En attente DZD',money(bd.held,'DZD'))}${card('En attente EUR',money(be.held,'EUR'))}</div><p><b class="gold">Solde DZD : ${money(bd.balance,'DZD')} · Solde EUR : ${money(be.balance,'EUR')}</b></p></div>`}
if(page==='vehicles')s=`<div class="row"><h3>Parc automobile</h3><button onclick="vehicleForm()">＋ Ajouter</button></div><div class="vehiclegrid">${db.vehicles.map(v=>`<div class="card"><h3>${esc(v.name)}</h3><small>${v.year} · ${v.status}</small><p class="gold">${money(v.rate)} / 24h</p><button class="secondary" onclick="del('vehicles',${v.id})">Supprimer</button></div>`).join('')}</div>`;
if(page==='reservations')s=`<div class="row"><h3>Réservations</h3><button onclick="reservationForm()">＋ Ajouter</button></div>${table(['Client','Téléphone','Véhicule','Début / remise','Fin / retour','Durée','Total','Devise','Statut réservation','Paiement','Actions'],db.reservations.map(r=>`<tr><td>${esc(r.client)}</td><td>${esc(r.phone)}</td><td>${esc(r.car)}</td><td>${r.start} ${r.startTime||'10:00'}</td><td>${r.end} ${r.endTime||'10:00'}</td><td>${durationDays(r)} j</td><td>${money(r.total,r.currency)}</td><td>${r.currency||'DZD'}</td><td>${r.status}</td><td><span class="${r.paymentStatus==='Encaissé'?'gold':'warning'}">${r.paymentStatus||'En attente'}</span> ${r.paymentStatus==='Encaissé'?`<small>${r.receivedAt||''}</small>`:`<button class="secondary" onclick="confirmReceipt('${r.id}')">Confirmer l’encaissement</button>`}</td><td><button class="secondary" onclick="editReservation(${r.id})">Modifier</button> <button class="secondary" onclick="changeVehicle(${r.id})">Changer voiture</button> <button class="danger" onclick="deleteReservation(${r.id})">Supprimer</button></td></tr>`).join(''))}`;
if(page==='expenses')s=`<div class="row"><h3>Journal des dépenses · ${money(out)}</h3><button onclick="expenseForm()">＋ Ajouter une dépense</button></div>${table(['Date','Catégorie','Véhicule','Fournisseur','Paiement','Montant','Note','Actions'],db.expenses.map(e=>`<tr><td>${e.date}</td><td>${esc(e.cat)}</td><td>${esc(e.car||'—')}</td><td>${esc(e.vendor||'—')}</td><td>${esc(e.pay)}</td><td>${money(e.amount,e.currency)}</td><td>${esc(e.note)}</td><td><button class="secondary" onclick="editExpense(${e.id})">Modifier</button> <button class="danger" onclick="deleteExpense(${e.id})">Supprimer</button></td></tr>`).join(''))}<div class="panel"><h3>Catégories</h3>${db.cats.map(esc).join(' · ')} <button onclick="categoryForm()">＋</button></div>`;
if(page==='clients')s=table(['Nom','Téléphone','E-mail'],db.clients.map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.phone)}</td><td>${esc(c.email)}</td></tr>`).join(''))+`<button onclick="clientForm()">＋ Ajouter un client</button>`;
if(page==='finances'){let m=monthRange();s=`<div class="panel"><h3>Bilan financier</h3><p class="muted">Choisissez une période pour consulter les revenus des réservations confirmées, les dépenses et les coûts de maintenance.</p><div class="availability-form"><div><label>Du</label><input type="date" id="bilanFrom" value="${m.from}"></div><div><label>Au</label><input type="date" id="bilanTo" value="${m.to}"></div><button onclick="runBilan()">Afficher le bilan</button><button class="secondary" onclick="setBilanMonth()">Mois en cours</button></div><div id="bilanResults">${bilanMarkup(m.from,m.to)}</div></div>`}
if(page==='maintenance')s=`<div class="row"><h3>Maintenance</h3><button onclick="maintenanceForm()">＋ Intervention</button></div>${table(['Date','Véhicule','Intervention','Kilométrage','Coût','Statut'],db.maintenance.map(m=>`<tr><td>${m.date}</td><td>${esc(m.car)}</td><td>${esc(m.job)}</td><td>${m.km}</td><td>${money(m.cost,m.currency)}</td><td>${esc(m.status)}</td></tr>`).join(''))}`;
if(page==='planning'){s=planningTimeline()}
if(page==='disponibilites')s=`<div class="panel"><h3>Rechercher les véhicules disponibles</h3><p class="muted">Choisissez la date et l'heure de prise en charge et de retour pour voir les véhicules libres.</p><div class="availability-form"><div><label>Date de prise en charge</label><input id="availDate" type="date" value="${iso(new Date())}"></div><div><label>Heure de prise en charge</label><input id="availTime" type="time" value="10:00"></div><div><label>Date de retour prévue</label><input id="availEndDate" type="date" value="${iso(new Date(Date.now()+14*86400000))}"></div><div><label>Heure de retour prévue</label><input id="availEndTime" type="time" value="10:00"></div><button onclick="checkAvailability()">Rechercher</button></div><div id="availabilityResults" class="availability-results"><p class="muted">Choisissez les dates et heures, puis cliquez sur Rechercher.</p></div></div>`;
$('#app').innerHTML=s}

function shiftDate(date,days){let d=new Date(date+'T12:00:00');d.setDate(d.getDate()+days);return iso(d)}
function planningTimeline(){
 let start=shiftDate(iso(new Date()),planningOffset*15),dates=Array.from({length:15},(_,i)=>shiftDate(start,i)),end=dates[14];
 let heads=dates.map(x=>{let d=new Date(x+'T12:00:00');return `<div class="avail-day"><b>${['dim.','lun.','mar.','mer.','jeu.','ven.','sam.'][d.getDay()]}</b><small>${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}</small></div>`}).join('');
 let rows=db.vehicles.map(v=>{
  let bookings=db.reservations.filter(r=>r.car===v.name&&r.status!=='Annulée'&&r.start<=end&&r.end>=start).map(r=>{
   let first=dates.findIndex(x=>x===r.start),last=dates.findIndex(x=>x===r.end);
   if(first<0)first=r.start<start?0:14;if(last<0)last=r.end>end?14:0;if(last<first)return '';
   let span=last-first+1;
   let card=`<button type="button" class="planning-booking-card ${r.status==='En attente'?'pending':''}" style="grid-column:${first+1}/span ${span}" onclick="editReservation('${String(r.id).replace(/'/g,"&#39;")}')" title="Ouvrir le dossier de ${esc(r.client)}"><b>${esc(r.client||'Client')}</b><small>${r.start.slice(5).replace('-','/')} ${r.startTime||'10:00'}</small><small>→ ${r.end.slice(5).replace('-','/')} ${r.endTime||'10:00'}</small></button>`;
   return card
  }).join('');
  let empty=db.reservations.some(r=>r.car===v.name&&r.status!=='Annulée'&&r.start<=end&&r.end>=start);
  return `<div class="avail-car-row"><div class="avail-car-name"><b>${esc(v.name)}</b></div><div class="avail-track planning-track" style="grid-template-columns:repeat(15,76px)">${dates.map(()=>'<div class="avail-empty"></div>').join('')}${bookings}</div></div>`
 }).join('');
 return `<div class="panel"><div class="planning-toolbar"><div><h3>Planning des réservations</h3><p class="muted">${start} → ${end} · 15 jours</p></div><div class="planning-arrows"><button class="secondary" onclick="movePlanning(-1)" aria-label="15 jours précédents">‹</button><button class="secondary" onclick="movePlanning(1)" aria-label="15 jours suivants">›</button></div></div><div class="availability-timeline planning-timeline"><div class="avail-header"><div class="avail-car-head">Véhicule</div><div class="avail-days" style="grid-template-columns:repeat(15,76px)">${heads}</div></div>${rows}</div><p class="avail-legend"><span class="legend-booked"></span> Réservation confirmée <span class="legend-pending"></span> En attente</p><p class="muted">Appuyez sur une carte de réservation pour ouvrir et modifier le dossier.</p></div>`
}
function movePlanning(direction){planningOffset+=direction;render()}
function planningTable(list){return table(['Client','Téléphone','Véhicule','Remise','Retour','Durée','Total','Statut'],list.map(r=>`<tr><td><b>${esc(r.client)}</b></td><td>${esc(r.phone||'—')}</td><td>${esc(r.car)}</td><td>${r.start} ${r.startTime||'10:00'}</td><td>${r.end} ${r.endTime||'10:00'}</td><td>${durationDays(r)} j</td><td>${money(r.total)}</td><td>${esc(r.status)}</td></tr>`).join(''))}
function filterPlanning(){let from=$('#planFrom').value,to=$('#planTo').value,box=$('#planningResults');if(!from||!to||to<from){box.innerHTML='<p class="warning">Veuillez choisir une période valide.</p>';return}let list=db.reservations.filter(r=>r.status!=='Annulée'&&r.start<=to&&r.end>=from).sort((a,b)=>dateTime(a.start,a.startTime)-dateTime(b.start,b.startTime));box.innerHTML=planningTable(list);$('#planningCount').textContent=list.length+' réservation(s) sur la période'}
function form(title,html,fn){$('#mtitle').textContent=title;$('#fields').innerHTML=html;$('#dlg').showModal();$('#save').onclick=e=>{e.preventDefault();let x=Object.fromEntries(new FormData($('#dlg form')));if(fn(x)!==false){save();$('#dlg').close();render()}}}
function f(l,n,t='text',v=''){return `<label>${l}</label><input name="${n}" type="${t}" value="${esc(v)}">`}
function sel(l,n,a,v=''){return `<label>${l}</label><select name="${n}">${a.map(x=>`<option value="${esc(x)}" ${String(x)===String(v)?'selected':''}>${esc(x)}</option>`).join('')}</select>`}
function vehicleForm(){form('Ajouter un véhicule',f('Modèle','name')+f('Année','year','number',2026)+f('Tarif par 24 heures (DA)','rate','number'),x=>{if(!x.name)return false;db.vehicles.push({...x,id:Date.now(),status:'Disponible'})})}
function reservationForm(prefill={},editId=null){let today=iso(new Date()),r=editId!==null?db.reservations.find(x=>String(x.id)===String(editId)):null;if(editId!==null&&!r){alert('Réservation introuvable. Actualisez les données puis réessayez.');return}let x={client:'',phone:'',car:db.vehicles[0]?.name||'',start:today,startTime:'10:00',end:today,endTime:'10:00',status:'Confirmée',currency:'DZD',paymentStatus:'En attente',...(r||{}),...(prefill||{})};x.dailyRate=x.dailyRate??db.vehicles.find(v=>v.name===x.car)?.rate??0;let opts=db.vehicles.map(v=>`<option value="${esc(v.name)}" ${v.name===x.car?'selected':''}>${esc(v.name)}</option>`).join('');form(editId!==null?'Modifier la réservation':'Nouvelle réservation',f('Client','client','text',x.client)+f('Téléphone','phone','tel',x.phone)+`<label>Véhicule</label><select name="car">${opts}</select>`+f('Date de remise','start','date',x.start)+f('Heure de remise','startTime','time',x.startTime)+f('Date de retour','end','date',x.end)+f('Heure de retour','endTime','time',x.endTime)+sel('Statut','status',['Confirmée','En attente','Annulée'],x.status)+f('Tarif journalier','dailyRate','number',x.dailyRate)+sel('Devise','currency',currencyOptions,x.currency),data=>{let v=db.vehicles.find(v=>v.name===data.car),a=dateTime(data.start,data.startTime),b=dateTime(data.end,data.endTime);if(!v||!data.client||!data.start||!data.end||b<=a){alert('Vérifiez les dates et heures : le retour doit être après la remise.');return false}if(data.status!=='Annulée'&&!isAvailable(data.car,a,b,editId)){alert('Ce véhicule est déjà réservé sur une partie de cette période.');return false}let days=Math.max(1,Math.ceil((b-a)/86400000)),record={...data,id:r?r.id:Date.now(),days,dailyRate:+data.dailyRate||0,total:days*(+data.dailyRate||0),paymentStatus:r?.paymentStatus||'En attente',receivedAt:r?.receivedAt||''};if(r){let ix=db.reservations.findIndex(q=>String(q.id)===String(r.id));db.reservations[ix]=record}else db.reservations.push(record);if(!db.clients.some(c=>c.name===data.client))db.clients.push({name:data.client,phone:data.phone,email:''})})}

function confirmReceipt(id){let r=db.reservations.find(x=>String(x.id)===String(id));if(!r)return;if(r.paymentStatus==='Encaissé'){alert('Cet encaissement est déjà confirmé.');return}if(!confirm(`Confirmer l’encaissement de ${money(r.total,r.currency)} pour ${r.client} ?`))return;r.paymentStatus='Encaissé';r.receivedAt=iso(new Date());save();render()}
function editReservation(id){reservationForm({},id)}
function changeVehicle(id){let r=db.reservations.find(x=>x.id===id);if(!r)return;let a=dateTime(r.start,r.startTime),b=dateTime(r.end,r.endTime);form('Changer de véhicule',sel('Nouveau véhicule','car',db.vehicles.filter(v=>v.name===r.car||isAvailable(v.name,a,b,id)).map(v=>v.name)),x=>{if(!isAvailable(x.car,a,b,id)){alert('Ce véhicule est déjà réservé sur cette période.');return false}let v=db.vehicles.find(v=>v.name===x.car);r.car=x.car;r.days=durationDays(r);r.total=r.days*(+v.rate||0)})}
function deleteReservation(id){if(confirm('Voulez-vous vraiment supprimer cette réservation ?')){db.reservations=db.reservations.filter(r=>r.id!==id);save();render()}}
function reservationFromAvailability(){if(lastAvailability)reservationForm(lastAvailability)}
function checkAvailability(){
 let d=$('#availDate').value,t=$('#availTime').value,ed=$('#availEndDate').value,et=$('#availEndTime').value,a=dateTime(d,t),b=dateTime(ed,et),box=$('#availabilityResults');
 if(!d||!t||!ed||!et||b<=a){box.innerHTML='<p class="warning">Veuillez saisir une période valide.</p>';return}
 lastAvailability={start:d,startTime:t,end:ed,endTime:et};
 let available=db.vehicles.filter(v=>isAvailable(v.name,a,b));
 box.innerHTML=`<div class="avail-summary"><h3>${available.length} véhicule(s) disponible(s)</h3><span>${d} ${t} → ${ed} ${et}</span></div>${available.length?`<div class="vehiclegrid">${available.map(v=>`<div class="card"><h3>${esc(v.name)}</h3><p class="avail-state">Disponible pour toute la période</p><p class="gold">${money(v.rate)} / 24h</p><button onclick="reserveSpecificCar('${esc(v.name).replace(/'/g,"&#39;")}')">＋ Réserver</button></div>`).join('')}</div>`:'<p class="warning">Aucun véhicule disponible pour cette période.</p>'}`;
}
function reserveSpecificCar(car){if(!lastAvailability)return;reservationForm({...lastAvailability,car})}

function expenseForm(editId=null){let e=editId!==null?db.expenses.find(x=>String(x.id)===String(editId)):null;if(editId!==null&&!e)return;let x={date:iso(new Date()),cat:db.cats[0]||'',car:'—',amount:'',vendor:'',pay:'Espèces',note:'',currency:'DZD',...(e||{})};form(e?'Modifier la dépense':'Nouvelle dépense',f('Date','date','date',x.date)+sel('Catégorie','cat',db.cats,x.cat)+sel('Véhicule','car',['—',...db.vehicles.map(v=>v.name)],x.car||'—')+f('Montant','amount','number',x.amount)+sel('Devise','currency',currencyOptions,x.currency||'DZD')+f('Fournisseur','vendor','text',x.vendor)+sel('Mode de paiement','pay',['Espèces','Virement','PayPal','Carte','Autre'],x.pay)+f('Note','note','text',x.note),data=>{if(!data.date||+data.amount<=0)return false;let record={...data,id:e?e.id:Date.now(),car:data.car==='—'?'':data.car};if(e){let i=db.expenses.findIndex(q=>String(q.id)===String(e.id));db.expenses[i]=record}else db.expenses.push(record)})}
function editExpense(id){expenseForm(id)}
function deleteExpense(id){if(confirm('Voulez-vous vraiment supprimer cette dépense ?')){db.expenses=db.expenses.filter(e=>String(e.id)!==String(id));save();render()}}
function categoryForm(){form('Nouvelle catégorie',f('Nom','cat'),x=>{if(x.cat&&!db.cats.includes(x.cat))db.cats.push(x.cat)})}function clientForm(){form('Nouveau client',f('Nom','name')+f('Téléphone','phone')+f('E-mail','email'),x=>db.clients.push(x))}function maintenanceForm(){form('Intervention maintenance',f('Date','date','date',iso(new Date()))+sel('Véhicule','car',db.vehicles.map(v=>v.name))+f('Intervention','job')+f('Kilométrage','km','number')+f('Coût','cost','number')+sel('Devise','currency',currencyOptions,'DZD')+sel('Statut','status',['À prévoir','En cours','Terminée']),x=>db.maintenance.push(x))}function del(k,id){if(confirm('Confirmer la suppression ?')){db[k]=db[k].filter(x=>x.id!==id);save();render()}}
function bilanMarkup(from,to){
 if(!from||!to||to<from)return '<p class="warning">Veuillez choisir une période valide.</p>';
 let d=bilan(from,to,'DZD'),e=bilan(from,to,'EUR');
 const block=(b,c)=>{let sym=c==='EUR'?'EUR':'DZD';return `<div class="panel"><h3>Bilan ${sym}</h3><div class="cards">${card('Encaissements confirmés',money(b.revenue,c))}${card('Montants en attente',money(b.held,c))}${card('Dépenses',money(b.expenseTotal,c))}${card('Maintenance',money(b.maintenanceTotal,c))}${card('Solde réel',money(b.balance,c))}</div><p>Réservations confirmées : ${b.confirmed.length} · En attente : ${b.pending.length}</p><p>Les montants en attente ne sont pas comptabilisés dans les revenus.</p></div>`};
 let rows=[...d.received.map(r=>`<tr><td>${esc(r.client)}</td><td>${r.receivedAt}</td><td>${esc(r.car)}</td><td>${money(r.total,'DZD')}</td></tr>`),...e.received.map(r=>`<tr><td>${esc(r.client)}</td><td>${r.receivedAt}</td><td>${esc(r.car)}</td><td>${money(r.total,'EUR')}</td></tr>`)].join('');
 return `${block(d,'DZD')}${block(e,'EUR')}<div class="panel"><h3>Encaissements confirmés sur la période</h3>${table(['Client','Date d’encaissement','Véhicule','Montant'],rows)}</div><p class="muted">La date retenue pour les recettes est la date de confirmation manuelle de l’encaissement. Les cautions ne sont pas incluses dans les revenus.</p>`
}
function runBilan(){let from=$('#bilanFrom').value,to=$('#bilanTo').value;$('#bilanResults').innerHTML=bilanMarkup(from,to)}
function setBilanMonth(){let m=monthRange();$('#bilanFrom').value=m.from;$('#bilanTo').value=m.to;runBilan()}
window.go=go;window.vehicleForm=vehicleForm;window.reservationForm=reservationForm;window.editReservation=editReservation;window.confirmReceipt=confirmReceipt;window.changeVehicle=changeVehicle;window.deleteReservation=deleteReservation;window.reservationFromAvailability=reservationFromAvailability;window.reserveSpecificCar=reserveSpecificCar;window.expenseForm=expenseForm;window.editExpense=editExpense;window.deleteExpense=deleteExpense;window.runBilan=runBilan;window.setBilanMonth=setBilanMonth;window.categoryForm=categoryForm;window.clientForm=clientForm;window.maintenanceForm=maintenanceForm;window.del=del;window.checkAvailability=checkAvailability;window.filterPlanning=filterPlanning;window.movePlanning=movePlanning;render();go('dashboard');

const loginBox=document.getElementById('cloudLogin');
const loginForm=document.getElementById('cloudLoginForm');
const loginMessage=document.getElementById('cloudLoginMessage');
function showLogin(message='Connectez-vous pour accéder aux données Easy Drive.'){loginBox.hidden=false;loginMessage.textContent=message}
function hideLogin(){loginBox.hidden=true}
function hasUsefulData(x){return ['vehicles','reservations','clients','expenses','maintenance'].some(k=>Array.isArray(x?.[k])&&x[k].length>0)}
async function loadCloud(){
 const localCopy=JSON.parse(localStorage.getItem('edm')||'null')||db;
 const {data:row,error}=await cloudClient.from('app_state').select('data').eq('id',1).maybeSingle();
 if(error){showLogin('Connexion réussie, mais lecture cloud impossible : '+error.message);return}
 if(row&&hasUsefulData(row.data)){db=row.data;localStorage.edm=JSON.stringify(db)}
 else if(hasUsefulData(localCopy)){
   const {error:upErr}=await cloudClient.from('app_state').upsert({id:1,data:localCopy,updated_at:new Date().toISOString()});
   if(upErr){showLogin('Impossible de transférer les données locales : '+upErr.message);return}
   db=localCopy;
 } else if(row?.data){db=row.data;localStorage.edm=JSON.stringify(db)}
 normalizeFinancialData();cloudReady=true;save();hideLogin();render();go(page);
 if(cloudChannel)cloudClient.removeChannel(cloudChannel);
 cloudChannel=cloudClient.channel('easy-drive-live-sync').on('postgres_changes',{event:'UPDATE',schema:'public',table:'app_state',filter:'id=eq.1'},payload=>{
   if(payload.new?.data){db=payload.new.data;normalizeFinancialData();localStorage.edm=JSON.stringify(db);render();go(page)}
 }).subscribe();
}
loginForm.addEventListener('submit',async e=>{
 e.preventDefault();const email=document.getElementById('cloudEmail').value.trim(),password=document.getElementById('cloudPassword').value;
 const submit=loginForm.querySelector('button[type=submit]');submit.disabled=true;submit.textContent='Connexion…';loginMessage.textContent='';
 const {error}=await cloudClient.auth.signInWithPassword({email,password});
 submit.disabled=false;submit.textContent='Se connecter';
 if(error){loginMessage.textContent='Erreur : '+error.message;return}
 await loadCloud();
});
cloudClient.auth.getSession().then(({data})=>{if(data.session)loadCloud();else showLoginForm()});



// Password recovery flow for Supabase Auth
const recoveryForm=document.getElementById('recoveryForm');
const recoveryMessage=document.getElementById('recoveryMessage');
const forgotPasswordButton=document.getElementById('forgotPassword');
function showRecovery(message='Choisissez un nouveau mot de passe.'){loginForm.hidden=true;recoveryForm.hidden=false;loginBox.hidden=false;recoveryMessage.textContent=message}
function showLoginForm(message='Connectez-vous pour accéder aux données Easy Drive.'){recoveryForm.hidden=true;loginForm.hidden=false;showLogin(message)}
forgotPasswordButton?.addEventListener('click',async()=>{
 const email=document.getElementById('cloudEmail').value.trim();
 if(!email){loginMessage.textContent='Saisissez votre adresse e-mail avant de demander un lien.';return}
 forgotPasswordButton.disabled=true;loginMessage.textContent='Envoi du lien…';
 const {error}=await cloudClient.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
 forgotPasswordButton.disabled=false;
 loginMessage.textContent=error?'Erreur : '+error.message:'Lien envoyé. Consultez votre boîte e-mail et les courriers indésirables.';
});
recoveryForm?.addEventListener('submit',async e=>{
 e.preventDefault();
 const password=document.getElementById('newCloudPassword').value;
 const confirmation=document.getElementById('confirmCloudPassword').value;
 if(password.length<8){recoveryMessage.textContent='Le mot de passe doit contenir au moins 8 caractères.';return}
 if(password!==confirmation){recoveryMessage.textContent='Les deux mots de passe ne correspondent pas.';return}
 const submit=recoveryForm.querySelector('button[type=submit]');submit.disabled=true;submit.textContent='Enregistrement…';
 const {error}=await cloudClient.auth.updateUser({password});
 submit.disabled=false;submit.textContent='Enregistrer le mot de passe';
 if(error){recoveryMessage.textContent='Erreur : '+error.message;return}
 await cloudClient.auth.signOut();
 document.getElementById('cloudPassword').value='';
 showLoginForm('Mot de passe modifié. Connectez-vous avec votre nouveau mot de passe.');
});
cloudClient.auth.onAuthStateChange((event,session)=>{
 if(event==='PASSWORD_RECOVERY')showRecovery();
});
