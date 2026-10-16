'use strict';
const $=id=>document.getElementById(id);
let voiceList=[];let db,words=[],profile=null,queue=[],index=0,started=0,checked=false,session=[];let sortKey='accuracy',sortAsc=true;
const rand=()=>Math.random();
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('frog-spelling',1);r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('profiles',{keyPath:'id'});const a=d.createObjectStore('attempts',{keyPath:'id',autoIncrement:true});a.createIndex('profile','profile')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function transact(store,mode,fn){return new Promise((resolve,reject)=>{const tx=db.transaction(store,mode),os=tx.objectStore(store);let request;try{request=fn(os)}catch(e){reject(e);return}tx.oncomplete=()=>resolve(request?.result);tx.onerror=()=>reject(tx.error)})}
const all=store=>transact(store,'readonly',s=>s.getAll());
const put=(store,obj)=>transact(store,'readwrite',s=>s.put(obj));
function uid(){return crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+String(Math.random())}
function stats(attempts){const m=new Map();for(const a of attempts){const k=a.year+':'+a.word;let s=m.get(k);if(!s){s={attempts:0,correct:0,total:0,last:0};m.set(k,s)}s.attempts++;s.correct+=a.correct?1:0;s.total+=a.ms;s.last=Math.max(s.last,a.date)}return m}
const key=w=>w.year+':'+w.word;
let attempts=[];
async function refresh(){attempts=(await all('attempts')).filter(a=>a.profile===profile);renderResults();updateHint()}
async function profiles(){const ps=await all('profiles'),select=$('profileSelect');select.replaceChildren();if(!ps.length){const opt=new Option('Add a child to begin','');select.add(opt);profile=null}else{for(const p of ps)select.add(new Option(p.name,p.id));const stored=localStorage.getItem('frog-current');profile=ps.some(p=>p.id===stored)?stored:ps[0].id;select.value=profile;localStorage.setItem('frog-current',profile)}$('start').disabled=!profile;await refresh()}
function filteredWords(){return words.filter(w=>$('year').value==='all'||String(w.year)===$('year').value)}
function candidates(){const s=stats(attempts);let a=filteredWords().map(w=>({...w,s:s.get(key(w))||{attempts:0,correct:0,total:0,last:0},tie:rand()}));const mode=$('mode').value;if(mode==='least')a.sort((a,b)=>a.s.attempts-b.s.attempts||a.tie-b.tie);else if(mode==='hard'){
// Prioritise words with errors; slow responses break ties. Unseen words are introduced after tested problem words.
a.sort((a,b)=>{const rank=x=>x.s.attempts?(x.s.attempts-x.s.correct)/x.s.attempts:-1;return rank(b)-rank(a)||((b.s.attempts?b.s.total/b.s.attempts:0)-(a.s.attempts?a.s.total/a.s.attempts:0))||a.tie-b.tie})
}else a.sort((a,b)=>a.tie-b.tie);return a}
function updateHint(){const n=filteredWords().length;$('selectionHint').textContent=`${n} words available in this selection. “All matching words” uses every word in the selected year(s).`}
function refreshVoices(){
 if(!('speechSynthesis' in window))return;
 voiceList=speechSynthesis.getVoices();
 const select=$('voice'), previous=select.value||localStorage.getItem('frog-voice')||'';
 select.replaceChildren(new Option('Automatic British English',''));
 for(const v of voiceList.filter(v=>v.lang.toLowerCase().startsWith('en'))){
  select.add(new Option(`${v.name} (${v.lang})${v.localService?' · offline':''}`,v.voiceURI));
 }
 select.value=voiceList.some(v=>v.voiceURI===previous)?previous:'';
}
function sayText(text){
 if(!('speechSynthesis' in window)){$('speechStatus').textContent='Speech is unavailable in this browser.';return}
 speechSynthesis.cancel();
 const u=new SpeechSynthesisUtterance(text);
 u.lang='en-GB';u.rate=Number($('speechRate').value);u.pitch=1;
 const selected=$('voice').value;
 const voice=voiceList.find(v=>v.voiceURI===selected)||voiceList.find(v=>v.lang.toLowerCase()==='en-gb'&&v.localService)||voiceList.find(v=>v.lang.toLowerCase()==='en-gb')||voiceList.find(v=>v.lang.toLowerCase().startsWith('en')&&v.localService);
 if(voice)u.voice=voice;
 u.onerror=()=>{$('speechStatus').textContent='Unable to speak. Check your device voice settings.'};
 $('speechStatus').textContent='';speechSynthesis.speak(u);
}
function maskedSentence(w){
 const sentence=w.sentence||'';
 const escaped=w.word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const pattern=new RegExp('(^|[^A-Za-z])('+escaped+')(?=$|[^A-Za-z])','gi');
 let count=0;
 const masked=sentence.replace(pattern,(_,prefix)=>{count++;return prefix+'__________'});
 return count?masked:'Listen to the word, then spell it.';
}
function say(){if(queue.length&&index<queue.length)sayText(queue[index].word)}
function saySentence(){if(queue.length&&index<queue.length)sayText(queue[index].sentence||queue[index].word)}
function showQuestion(){checked=false;const w=queue[index];$('progress').textContent=`${index+1} of ${queue.length}`;$('clue').textContent=maskedSentence(w);$('bar').style.width=(100*index/queue.length)+'%';$('answer').value='';$('answer').disabled=false;$('check').classList.remove('hidden');$('next').classList.add('hidden');$('feedback').textContent='';$('feedback').className='';$('answer').focus();started=performance.now();setTimeout(say,180)}
function show(which){for(const id of ['setupPanel','quizPanel','finishPanel'])$(id).classList.toggle('hidden',id!==which);$('profilePanel').classList.toggle('hidden',which==='quizPanel');$('resultsPanel').classList.toggle('hidden',which==='quizPanel')}
function startQuiz(){if(!profile){alert('Add or select a child first.');return}const a=candidates();const count=$('count').value;queue=a.slice(0,count==='max'?a.length:Number(count));if(!queue.length){alert('No words in this selection.');return}index=0;session=[];show('quizPanel');showQuestion()}
async function checkAnswer(e){e.preventDefault();if(checked)return;const typed=$('answer').value.trim();if(!typed)return;checked=true;const w=queue[index];const ms=Math.max(0,Math.round(performance.now()-started));const correct=typed.toLocaleLowerCase('en-GB')===w.word.toLocaleLowerCase('en-GB');const a={profile,word:w.word,year:w.year,typed,correct,ms,date:Date.now()};try{await transact('attempts','readwrite',s=>s.add(a));session.push(a)}catch(err){checked=false;alert('Could not save this answer: '+err.message);return}$('answer').disabled=true;$('check').classList.add('hidden');$('next').classList.remove('hidden');$('next').textContent=index===queue.length-1?'See results →':'Next word →';$('feedback').className=correct?'correct':'wrong';$('feedback').textContent=correct?`✓ Correct! ${w.word}`:`Not quite. You wrote “${typed}”. Correct spelling: ${w.word}`;$('bar').style.width=(100*(index+1)/queue.length)+'%';$('next').focus()}
async function finish(){speechSynthesis?.cancel();const c=session.filter(a=>a.correct).length;$('summary').textContent=`You spelled ${c} out of ${session.length} attempted words correctly. Well done for practising!`;show('finishPanel');await refresh()}
function formatTime(ms){return(ms/1000).toFixed(1)+'s'}
function renderResults(){const s=stats(attempts),term=$('search').value.toLowerCase().trim(),yr=$('resultYear').value;let rows=words.filter(w=>(yr==='all'||String(w.year)===yr)&&w.word.includes(term)).map(w=>{const v=s.get(key(w))||{attempts:0,correct:0,total:0,last:0};return {...w,...v,accuracy:v.attempts?100*v.correct/v.attempts:-1,avg:v.attempts?v.total/v.attempts:-1}});rows.sort((a,b)=>{let x=a[sortKey],y=b[sortKey];let d=typeof x==='string'?x.localeCompare(y):x-y;return (sortAsc?d:-d)||a.word.localeCompare(b.word)});const tbody=$('results');tbody.replaceChildren();for(const r of rows){const tr=document.createElement('tr');const vals=[r.word,r.year===1?'KS1':'KS2',r.attempts,r.attempts?`${r.correct}/${r.attempts} (${Math.round(r.accuracy)}%)`:'—',r.attempts?formatTime(r.avg):'—',r.last?new Date(r.last).toLocaleDateString('en-GB'):'—'];for(const v of vals){const td=document.createElement('td');td.textContent=v;tr.append(td)}tbody.append(tr)}}
async function exportData(){const data={version:1,exported:new Date().toISOString(),profiles:await all('profiles'),attempts:await all('attempts')};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='frog-spelling-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
async function importData(file){if(!file)return;try{const data=JSON.parse(await file.text());if(data.version!==1||!Array.isArray(data.profiles)||!Array.isArray(data.attempts))throw Error('Not a Frog Spelling backup');if(!confirm('Import this backup? Existing results will be kept; imported attempts will be added.'))return;const current=await all('profiles'),ids=new Set(current.map(x=>x.id));for(const p of data.profiles){if(typeof p.id!=='string'||typeof p.name!=='string')throw Error('Invalid profile');if(!ids.has(p.id)){await put('profiles',{id:p.id,name:p.name});ids.add(p.id)}}for(const a of data.attempts){if(!ids.has(a.profile)||typeof a.word!=='string'||![1,2].includes(a.year)||typeof a.correct!=='boolean'||!Number.isFinite(a.ms)||!Number.isFinite(a.date))throw Error('Invalid attempt');const {id,...rest}=a;await transact('attempts','readwrite',s=>s.add(rest))}await profiles();alert('Backup imported. Note: importing the same backup twice duplicates attempts.')}catch(e){alert('Import failed: '+e.message)}finally{$('import').value=''}}
async function main(){try{db=await openDB();words=await(await fetch('words.json')).json();await profiles()}catch(e){alert('Could not start local storage. Use HTTPS or localhost, and enable browser storage. '+e.message);return}if('speechSynthesis' in window){refreshVoices();speechSynthesis.addEventListener('voiceschanged',refreshVoices)}$('speechRate').value=localStorage.getItem('frog-rate')||'0.85';$('rateValue').textContent=Math.round(Number($('speechRate').value)*100)+'%';$('speechRate').oninput=()=>{$('rateValue').textContent=Math.round(Number($('speechRate').value)*100)+'%';localStorage.setItem('frog-rate',$('speechRate').value)};$('voice').onchange=()=>localStorage.setItem('frog-voice',$('voice').value);$('testVoice').onclick=()=>sayText('The children went to school together.');if('serviceWorker' in navigator&&location.protocol!=='file:'){if(location.hostname==='localhost'||location.hostname==='127.0.0.1'){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister()));}else navigator.serviceWorker.register('./sw.js').catch(console.warn);}$('offline').textContent=navigator.onLine?'Ready':'Offline';window.addEventListener('online',()=>$('offline').textContent='Ready');window.addEventListener('offline',()=>$('offline').textContent='Offline');$('addChild').onclick=async()=>{const name=$('newName').value.trim();if(!name)return alert('Please enter a name.');const id=uid();await put('profiles',{id,name});$('newName').value='';localStorage.setItem('frog-current',id);await profiles()};$('profileSelect').onchange=async e=>{profile=e.target.value||null;if(profile)localStorage.setItem('frog-current',profile);await refresh()};for(const id of ['year','mode','count'])$(id).onchange=updateHint;$('start').onclick=startQuiz;$('repeat').onclick=say;$('sentence').onclick=saySentence;$('answerForm').onsubmit=checkAnswer;$('next').onclick=async()=>{if(!checked)return;index++;if(index>=queue.length)await finish();else showQuestion()};$('stop').onclick=()=>{if(confirm('Finish this practice now?'))finish()};$('again').onclick=()=>show('setupPanel');$('search').oninput=renderResults;$('resultYear').onchange=renderResults;document.querySelectorAll('th[data-sort]').forEach(th=>th.onclick=()=>{const k=th.dataset.sort;if(sortKey===k)sortAsc=!sortAsc;else{sortKey=k;sortAsc=k==='word'||k==='year'}renderResults()});$('export').onclick=exportData;$('import').onchange=e=>importData(e.target.files[0]);}
main();
