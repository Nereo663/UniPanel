/* ===================== PANEL ASISTENTE IA ===================== */

function openAIPanel(){
  document.getElementById('aiOverlay').classList.add('active');
  renderAIMessages();
  updateApiKeyBanner();
  setTimeout(()=>document.getElementById('aiInput').focus(), 100);
}
function closeAIPanel(){
  document.getElementById('aiOverlay').classList.remove('active');
}

function updateApiKeyBanner(){
  const banner = document.getElementById('apiKeyBanner');
  if(!settings.openaiApiKey){
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

function openConfigIA(){
  openModal(`
    <button class="modal-close" onclick="closeModal()">✕</button>
    <h2>Configurar asistente IA</h2>
    <div class="field">
      <label class="field-label">API key de OpenAI</label>
      <input id="cfgApiKey" type="password" placeholder="sk-..." value="${settings.openaiApiKey?escapeHtml(settings.openaiApiKey):''}">
      <p class="item-sub" style="margin:4px 0 0;">Se guarda solo en este dispositivo (localStorage). Nunca se envía a ningún servidor que no sea api.openai.com. Conseguila en platform.openai.com → API keys.</p>
    </div>
    <div class="field">
      <label class="field-label">Modelo</label>
      <select id="cfgModel">
        <option value="gpt-4o-mini" ${settings.aiModel==='gpt-4o-mini'?'selected':''}>gpt-4o-mini (rápido y económico)</option>
        <option value="gpt-4o" ${settings.aiModel==='gpt-4o'?'selected':''}>gpt-4o (más capaz)</option>
      </select>
    </div>
    <button class="btn accent block" onclick="saveConfigIA()">Guardar</button>
    ${settings.openaiApiKey?`<button class="btn ghost block" style="margin-top:8px;" onclick="borrarApiKey()">Borrar API key</button>`:''}
  `);
}
function saveConfigIA(){
  const key = document.getElementById('cfgApiKey').value.trim();
  const model = document.getElementById('cfgModel').value;
  settings.openaiApiKey = key;
  settings.aiModel = model;
  saveSettings();
  closeModal();
  updateApiKeyBanner();
}
function borrarApiKey(){
  settings.openaiApiKey = '';
  saveSettings();
  closeModal();
  updateApiKeyBanner();
}

function renderAIMessages(){
  const el = document.getElementById('aiMessages');
  if(aiMessages.length===0){
    el.innerHTML = `<div class="ai-msg system-note">Pedile que cree materias, lecturas, parciales o tareas, o que te arme un plan de estudio con lo que ya tenés cargado.</div>`;
    return;
  }
  el.innerHTML = aiMessages
    .filter(m => m.role==='user' || (m.role==='assistant' && m.content))
    .map(m=>`<div class="ai-msg ${m.role}">${escapeHtml(m.content)}</div>`)
    .join('');
  el.scrollTop = el.scrollHeight;
}

function appendTypingIndicator(){
  const el = document.getElementById('aiMessages');
  const div = document.createElement('div');
  div.className = 'ai-msg assistant';
  div.id = 'aiTypingIndicator';
  div.innerHTML = `<div class="ai-typing"><span></span><span></span><span></span></div>`;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}
function removeTypingIndicator(){
  const t = document.getElementById('aiTypingIndicator');
  if(t) t.remove();
}

async function enviarMensajeIA(){
  if(aiBusy) return;
  const input = document.getElementById('aiInput');
  const texto = input.value.trim();
  if(!texto) return;

  if(!settings.openaiApiKey){
    openConfigIA();
    return;
  }

  input.value='';
  input.style.height = 'auto';
  aiBusy = true;
  document.getElementById('aiSendBtn').disabled = true;

  renderAIMessages();
  const el = document.getElementById('aiMessages');
  const userBubble = document.createElement('div');
  userBubble.className = 'ai-msg user';
  userBubble.textContent = texto;
  el.appendChild(userBubble);
  el.scrollTop = el.scrollHeight;

  appendTypingIndicator();

  const { texto: respuesta, error, acciones } = await procesarMensajeIA(texto);

  removeTypingIndicator();

  if(error){
    const errBubble = document.createElement('div');
    errBubble.className = 'ai-msg system-note';
    errBubble.textContent = '⚠️ ' + error;
    el.appendChild(errBubble);
  } else {
    if(acciones && acciones.length){
      acciones.forEach(a=>{
        const logBubble = document.createElement('div');
        logBubble.className = 'ai-msg action-log';
        logBubble.textContent = '✓ ' + a;
        el.appendChild(logBubble);
      });
      renderAll(); // refresca toda la app por si estamos viendo datos tocados por la IA
    }
    if(respuesta){
      const aBubble = document.createElement('div');
      aBubble.className = 'ai-msg assistant';
      aBubble.textContent = respuesta;
      el.appendChild(aBubble);
    }
  }
  el.scrollTop = el.scrollHeight;

  aiBusy = false;
  document.getElementById('aiSendBtn').disabled = false;
  input.focus();
}

function handleAIInputKeydown(e){
  if(e.key === 'Enter' && !e.shiftKey){
    e.preventDefault();
    enviarMensajeIA();
  }
}
function autoGrowAIInput(el){
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}
