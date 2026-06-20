/* ===================== NAV ===================== */
const views = ['hoy','materias','lecturas','parciales','registro','stats'];
function showView(name){
  views.forEach(v=>{
    document.getElementById('view-'+v).classList.toggle('active', v===name);
  });
  document.querySelectorAll('.tab-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.view===name);
  });
  renderAll();
  window.scrollTo(0,0);
}

/* ===================== MODAL HELPERS ===================== */
function openModal(html){
  document.getElementById('modalContent').innerHTML = html;
  document.getElementById('overlay').classList.add('active');
}
function closeModal(){
  document.getElementById('overlay').classList.remove('active');
  document.getElementById('modalContent').innerHTML='';
}

/* ===================== MATERIAS ===================== */
function openMateriaForm(materia){
  const editing = !!materia;
  openModal(`
    <button class="modal-close" onclick="closeModal()">✕</button>
    <h2>${editing?'Editar materia':'Nueva materia'}</h2>
    <div class="field">
      <label class="field-label">Nombre</label>
      <input id="mNombre" placeholder="Ej: Algoritmos y Estructuras de Datos" value="${editing?escapeHtml(materia.nombre):''}">
    </div>
    <div class="field">
      <label class="field-label">Color</label>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        ${COLORS.map(c=>`<div onclick="selectColor('${c}')" data-color="${c}" style="width:28px;height:28px;border-radius:50%;background:${c};cursor:pointer;border:3px solid ${ (editing&&materia.color===c) || (!editing && c===COLORS[0]) ? '#2A2620':'transparent'};" class="colorDot"></div>`).join('')}
      </div>
      <input type="hidden" id="mColor" value="${editing?materia.color:COLORS[0]}">
    </div>
    <button class="btn accent block" onclick="saveMateria(${editing?`'${materia.id}'`:'null'})">${editing?'Guardar cambios':'Crear materia'}</button>
    ${editing?`<button class="btn ghost block" style="margin-top:8px;" onclick="deleteMateria('${materia.id}')">Eliminar materia</button>`:''}
  `);
}
function selectColor(c){
  document.getElementById('mColor').value=c;
  document.querySelectorAll('.colorDot').forEach(d=>{
    d.style.border = d.dataset.color===c ? '3px solid #2A2620' : '3px solid transparent';
  });
}
function saveMateria(id){
  const nombre = document.getElementById('mNombre').value.trim();
  const color = document.getElementById('mColor').value;
  if(!nombre){ alert('Poné un nombre para la materia'); return; }
  if(id){
    const m = materiaById(id);
    m.nombre = nombre; m.color = color;
  }else{
    db.materias.push({id:uid(), nombre, color});
  }
  saveDB(); closeModal(); renderAll();
}
function deleteMateria(id){
  if(!confirm('¿Eliminar materia y todas sus lecturas/parciales asociados?')) return;
  db.materias = db.materias.filter(m=>m.id!==id);
  db.lecturas = db.lecturas.filter(l=>l.materiaId!==id);
  db.parciales = db.parciales.filter(p=>p.materiaId!==id);
  saveDB(); closeModal(); renderAll();
}
function renderMaterias(){
  const el = document.getElementById('materiasList');
  if(db.materias.length===0){
    el.innerHTML = `<div class="empty"><span class="ic">📚</span><p>Todavía no creaste materias.<br>Tocá el botón + para agregar la primera.</p></div>`;
    return;
  }
  el.innerHTML = db.materias.map(m=>{
    const lecturas = db.lecturas.filter(l=>l.materiaId===m.id);
    const hechas = lecturas.filter(l=>l.estado==='hecha'||l.estado==='repasada').length;
    const pct = lecturas.length ? Math.round(hechas/lecturas.length*100) : 0;
    const proxParcial = db.parciales.filter(p=>p.materiaId===m.id && daysUntil(p.fecha)>=0).sort((a,b)=>a.fecha.localeCompare(b.fecha))[0];
    return `
      <div class="card" onclick="openMateriaForm(materiaById('${m.id}'))" style="cursor:pointer;">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:8px; min-width:0;">
            <span class="dot" style="background:${m.color}; width:11px; height:11px;"></span>
            <h3 style="margin:0;">${escapeHtml(m.nombre)}</h3>
          </div>
          <span style="font-size:11px; color:var(--ink-soft); font-family:var(--font-mono);">${lecturas.length} lecturas</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%; background:${m.color};"></div></div>
        <div style="display:flex; justify-content:space-between; margin-top:6px;">
          <span class="item-sub">${pct}% completado</span>
          ${proxParcial?`<span class="item-sub">Parcial en ${daysUntil(proxParcial.fecha)}d</span>`:''}
        </div>
      </div>
    `;
  }).join('');
}

/* ===================== LECTURAS ===================== */
function fillMateriaSelect(selectEl, withAll){
  let opts = '';
  if(withAll) opts += `<option value="todas">Todas las materias</option>`;
  opts += db.materias.map(m=>`<option value="${m.id}">${escapeHtml(m.nombre)}</option>`).join('');
  selectEl.innerHTML = opts;
}
function openLecturaForm(){
  if(db.materias.length===0){ alert('Primero creá una materia'); openMateriaForm(); return; }
  openModal(`
    <button class="modal-close" onclick="closeModal()">✕</button>
    <h2>Nueva lectura</h2>
    <div class="field">
      <label class="field-label">Materia</label>
      <select id="lMateria"></select>
    </div>
    <div class="field">
      <label class="field-label">Módulo / Unidad</label>
      <input id="lModulo" placeholder="Ej: Módulo 3 — Árboles">
    </div>
    <div class="field">
      <label class="field-label">Título de la lectura</label>
      <input id="lTitulo" placeholder="Ej: Cap. 5 — Árboles balanceados">
    </div>
    <button class="btn accent block" onclick="saveLectura()">Agregar lectura</button>
  `);
  fillMateriaSelect(document.getElementById('lMateria'), false);
}
function saveLectura(){
  const materiaId = document.getElementById('lMateria').value;
  const modulo = document.getElementById('lModulo').value.trim() || 'General';
  const titulo = document.getElementById('lTitulo').value.trim();
  if(!titulo){ alert('Poné un título para la lectura'); return; }
  db.lecturas.push({id:uid(), materiaId, modulo, titulo, estado:'pendiente'});
  saveDB(); closeModal(); renderAll();
}
function cycleEstado(id, nuevoEstado){
  const l = db.lecturas.find(x=>x.id===id);
  l.estado = nuevoEstado;
  saveDB(); renderAll();
}
function deleteLectura(id){
  db.lecturas = db.lecturas.filter(l=>l.id!==id);
  saveDB(); renderAll();
}
function renderLecturas(){
  const filtroM = document.getElementById('filtroMateriaLecturas');
  const filtroE = document.getElementById('filtroEstadoLecturas');
  if(filtroM.options.length===0 || filtroM.dataset.count!=db.materias.length){
    fillMateriaSelect(filtroM, true);
    filtroM.dataset.count = db.materias.length;
  }
  const mVal = filtroM.value || 'todas';
  const eVal = filtroE.value || 'todas';

  let lecturas = db.lecturas.slice();
  if(mVal!=='todas') lecturas = lecturas.filter(l=>l.materiaId===mVal);
  if(eVal!=='todas') lecturas = lecturas.filter(l=>l.estado===eVal);

  const el = document.getElementById('lecturasList');
  if(db.materias.length===0){
    el.innerHTML = `<div class="empty"><span class="ic">📖</span><p>Creá una materia primero.</p></div>`;
    return;
  }
  if(lecturas.length===0){
    el.innerHTML = `<div class="empty"><span class="ic">📖</span><p>No hay lecturas con ese filtro.</p></div>`;
    return;
  }
  const grouped = {};
  lecturas.forEach(l=>{
    const m = materiaById(l.materiaId);
    if(!m) return;
    grouped[m.id] = grouped[m.id] || {materia:m, modulos:{}};
    grouped[m.id].modulos[l.modulo] = grouped[m.id].modulos[l.modulo] || [];
    grouped[m.id].modulos[l.modulo].push(l);
  });
  el.innerHTML = Object.values(grouped).map(g=>`
    <div class="card">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
        <span class="dot" style="background:${g.materia.color};"></span>
        <h3 style="margin:0; font-size:15px;">${escapeHtml(g.materia.nombre)}</h3>
      </div>
      ${Object.entries(g.modulos).map(([mod, items])=>`
        <div style="margin-bottom:6px;">
          <div style="font-size:11px; color:var(--ink-soft); font-family:var(--font-mono); margin-bottom:2px;">${escapeHtml(mod)}</div>
          ${items.map(l=>`
            <div class="item-row">
              <div class="item-main">
                <p class="item-title">${escapeHtml(l.titulo)}</p>
              </div>
              <div class="item-actions">
                <select class="status-select" onchange="cycleEstado('${l.id}', this.value)">
                  <option value="pendiente" ${l.estado==='pendiente'?'selected':''}>Pendiente</option>
                  <option value="progreso" ${l.estado==='progreso'?'selected':''}>En progreso</option>
                  <option value="hecha" ${l.estado==='hecha'?'selected':''}>Hecha</option>
                  <option value="repasada" ${l.estado==='repasada'?'selected':''}>Repasada</option>
                </select>
                <button class="btn ghost sm" onclick="deleteLectura('${l.id}')">✕</button>
              </div>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  `).join('');
}

/* ===================== PARCIALES ===================== */
function openParcialForm(){
  if(db.materias.length===0){ alert('Primero creá una materia'); openMateriaForm(); return; }
  openModal(`
    <button class="modal-close" onclick="closeModal()">✕</button>
    <h2>Nuevo parcial</h2>
    <div class="field">
      <label class="field-label">Materia</label>
      <select id="pMateria"></select>
    </div>
    <div class="field">
      <label class="field-label">Fecha</label>
      <input type="date" id="pFecha" value="${todayStr()}">
    </div>
    <div class="field">
      <label class="field-label">Prioridad</label>
      <select id="pPrioridad">
        <option value="alta">Alta</option>
        <option value="media" selected>Media</option>
        <option value="baja">Baja</option>
      </select>
    </div>
    <div class="field">
      <label class="field-label">Nota (opcional)</label>
      <textarea id="pNota" placeholder="Temas que entran, formato del examen, etc."></textarea>
    </div>
    <button class="btn accent block" onclick="saveParcial()">Agregar parcial</button>
  `);
  fillMateriaSelect(document.getElementById('pMateria'), false);
}
function saveParcial(){
  const materiaId = document.getElementById('pMateria').value;
  const fecha = document.getElementById('pFecha').value;
  const prioridad = document.getElementById('pPrioridad').value;
  const nota = document.getElementById('pNota').value.trim();
  if(!fecha){ alert('Poné una fecha'); return; }
  db.parciales.push({id:uid(), materiaId, fecha, prioridad, nota});
  saveDB(); closeModal(); renderAll();
}
function deleteParcial(id){
  db.parciales = db.parciales.filter(p=>p.id!==id);
  saveDB(); renderAll();
}
function renderParciales(){
  const el = document.getElementById('parcialesList');
  if(db.parciales.length===0){
    el.innerHTML = `<div class="empty"><span class="ic">📝</span><p>No hay parciales cargados.<br>Tocá + para agregar uno.</p></div>`;
    return;
  }
  const ordenados = db.parciales.slice().sort((a,b)=>a.fecha.localeCompare(b.fecha));
  el.innerHTML = ordenados.map(p=>{
    const m = materiaById(p.materiaId);
    const dleft = daysUntil(p.fecha);
    let dtext = dleft===0?'Hoy': dleft===1?'Mañana': dleft>1?`En ${dleft} días`: `Hace ${Math.abs(dleft)} días`;
    return `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="min-width:0;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="dot" style="background:${m?m.color:'#999'};"></span>
              <h3 style="margin:0;">${m?escapeHtml(m.nombre):'(sin materia)'}</h3>
            </div>
            <div class="item-sub" style="margin-top:4px;">${fmtDate(p.fecha)} · ${dtext}</div>
            ${p.nota?`<div style="font-size:13px; margin-top:8px; color:var(--ink-soft);">${escapeHtml(p.nota)}</div>`:''}
          </div>
          <div style="text-align:right; display:flex; flex-direction:column; gap:6px; align-items:flex-end;">
            <span class="badge prioridad-${p.prioridad}">${p.prioridad}</span>
            <button class="btn ghost sm" onclick="deleteParcial('${p.id}')">✕</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* ===================== TAREAS DE ESTUDIO ===================== */
function openTareaForm(){
  openModal(`
    <button class="modal-close" onclick="closeModal()">✕</button>
    <h2>Nueva tarea de hoy</h2>
    <div class="field">
      <label class="field-label">¿Qué tenés que hacer?</label>
      <input id="tTexto" placeholder="Ej: Leer cap. 4 de Sociología">
    </div>
    <button class="btn accent block" onclick="saveTarea()">Agregar tarea</button>
  `);
}
function saveTarea(){
  const texto = document.getElementById('tTexto').value.trim();
  if(!texto){ alert('Escribí la tarea'); return; }
  db.tareas.push({id:uid(), texto, fecha:todayStr(), hecha:false, esMinima:false});
  saveDB(); closeModal(); renderAll();
}
function toggleTarea(id){
  const t = db.tareas.find(x=>x.id===id);
  t.hecha = !t.hecha;
  saveDB(); renderAll();
}
function deleteTarea(id){
  db.tareas = db.tareas.filter(t=>t.id!==id);
  saveDB(); renderAll();
}

/* ===================== MODO CANSADO ===================== */
let modoCansado = false;
function toggleModoCansado(){
  modoCansado = !modoCansado;
  document.getElementById('btnModoCansado').textContent = modoCansado ? '↩️ Salir del modo cansado' : '😵 Modo cansado';
  renderHoy();
}

/* ===================== VISTA HOY ===================== */
function renderHoy(){
  document.getElementById('todayDate').textContent = new Date().toLocaleDateString('es-AR',{weekday:'long', day:'numeric', month:'long'});

  const bannerSlot = document.getElementById('tiredBannerSlot');
  const tareasHoy = db.tareas.filter(t=>t.fecha===todayStr());
  const pendientesHoy = tareasHoy.filter(t=>!t.hecha);
  const lecturasPendientes = db.lecturas.filter(l=>l.estado==='pendiente'||l.estado==='progreso');
  const parcialesProx = db.parciales.filter(p=>daysUntil(p.fecha)>=0).sort((a,b)=>a.fecha.localeCompare(b.fecha));

  if(modoCansado){
    let minimaTarea = null;
    if(parcialesProx.length){
      const p = parcialesProx[0];
      const m = materiaById(p.materiaId);
      minimaTarea = `Repasá algo chico de ${m?m.nombre:'tu próximo parcial'} (${daysUntil(p.fecha)===0?'es hoy':'faltan '+daysUntil(p.fecha)+'d'})`;
    } else if(pendientesHoy.length){
      minimaTarea = pendientesHoy[0].texto;
    } else if(lecturasPendientes.length){
      minimaTarea = `Avanzá 10 minutos con: ${lecturasPendientes[0].titulo}`;
    } else {
      minimaTarea = 'Repasá tus apuntes 10 minutos. Con eso alcanza hoy.';
    }
    bannerSlot.innerHTML = `
      <div class="tired-banner">
        <h3>Hoy con lo mínimo alcanza</h3>
        <p>Una sola cosa, nada más:</p>
        <div style="background:rgba(246,241,230,.1); border:1px solid rgba(246,241,230,.25); border-radius:10px; padding:12px; font-weight:600;">
          ${escapeHtml(minimaTarea)}
        </div>
      </div>
    `;
  } else {
    bannerSlot.innerHTML = '';
  }

  const hoyContent = document.getElementById('hoyContent');
  let html = '';

  if(!modoCansado){
    html += `<div class="card">
      <h3>Tareas de hoy</h3>
      ${tareasHoy.length===0 ? `<p class="item-sub">No agregaste tareas para hoy. Tocá + para sumar una.</p>` :
        tareasHoy.map(t=>`
          <div class="item-row">
            <div class="item-main" style="display:flex; align-items:center; gap:8px;">
              <input type="checkbox" ${t.hecha?'checked':''} onchange="toggleTarea('${t.id}')" style="width:18px; height:18px; margin:0;">
              <span style="font-size:14px; ${t.hecha?'text-decoration:line-through; color:var(--ink-soft);':''}">${escapeHtml(t.texto)}</span>
            </div>
            <button class="btn ghost sm" onclick="deleteTarea('${t.id}')">✕</button>
          </div>
        `).join('')
      }
    </div>`;

    if(lecturasPendientes.length){
      html += `<div class="card">
        <h3>Lecturas en curso</h3>
        ${lecturasPendientes.slice(0,4).map(l=>{
          const m = materiaById(l.materiaId);
          return `<div class="item-row">
            <div class="item-main">
              <p class="item-title">${escapeHtml(l.titulo)}</p>
              <span class="item-sub">${m?escapeHtml(m.nombre):''}</span>
            </div>
            <span class="badge ${l.estado}">${l.estado}</span>
          </div>`;
        }).join('')}
      </div>`;
    }
  }

  hoyContent.innerHTML = html;

  const parcialesEl = document.getElementById('hoyParciales');
  if(parcialesProx.length===0){
    parcialesEl.innerHTML = `<p class="item-sub" style="margin:0;">No tenés parciales próximos cargados.</p>`;
  } else {
    parcialesEl.innerHTML = parcialesProx.slice(0,3).map(p=>{
      const m = materiaById(p.materiaId);
      const dleft = daysUntil(p.fecha);
      const dtext = dleft===0?'HOY': dleft===1?'Mañana': `${dleft}d`;
      return `<div class="item-row">
        <div class="item-main">
          <p class="item-title">${m?escapeHtml(m.nombre):''}</p>
          <span class="item-sub">${fmtDate(p.fecha)}</span>
        </div>
        <span class="badge prioridad-${p.prioridad}">${dtext}</span>
      </div>`;
    }).join('');
  }
}

/* ===================== REGISTRO DIARIO ===================== */
function renderRegistroForm(){
  const existing = db.registros.find(r=>r.fecha===todayStr());
  document.getElementById('registroForm').innerHTML = `
    <div class="card">
      <div class="field">
        <label class="field-label">¿Qué estudiaste hoy?</label>
        <textarea id="rEstudie" placeholder="Ej: Repasé árboles AVL y empecé grafos">${existing?escapeHtml(existing.estudie):''}</textarea>
      </div>
      <div class="field">
        <label class="field-label">¿Cuánto tiempo? (minutos)</label>
        <input type="number" id="rTiempo" placeholder="Ej: 90" value="${existing?existing.tiempoMin:''}">
      </div>
      <div class="field">
        <label class="field-label">¿Qué te costó?</label>
        <textarea id="rCosto" placeholder="Ej: Entender la rotación doble en AVL">${existing?escapeHtml(existing.costo):''}</textarea>
      </div>
      <div class="field">
        <label class="field-label">¿Qué repasar mañana?</label>
        <textarea id="rManana" placeholder="Ej: Volver a ver grafos dirigidos">${existing?escapeHtml(existing.repasarManana):''}</textarea>
      </div>
      <button class="btn accent block" onclick="saveRegistro()">${existing?'Actualizar registro de hoy':'Guardar registro de hoy'}</button>
    </div>
  `;
}
function saveRegistro(){
  const estudie = document.getElementById('rEstudie').value.trim();
  const tiempoMin = parseInt(document.getElementById('rTiempo').value)||0;
  const costo = document.getElementById('rCosto').value.trim();
  const repasarManana = document.getElementById('rManana').value.trim();
  if(!estudie && tiempoMin===0){ alert('Contá algo de lo que hiciste hoy, aunque sea breve'); return; }

  const fecha = todayStr();
  let r = db.registros.find(x=>x.fecha===fecha);
  if(r){
    r.estudie=estudie; r.tiempoMin=tiempoMin; r.costo=costo; r.repasarManana=repasarManana;
  } else {
    db.registros.push({id:uid(), fecha, estudie, tiempoMin, costo, repasarManana});
  }
  updateStreak();
  saveDB(); renderAll();
}
function updateStreak(){
  const dates = [...new Set(db.registros.map(r=>r.fecha))];
  const dateSet = new Set(dates);
  let streak = 0;
  let cursor = new Date(todayStr()+'T00:00:00');
  while(dateSet.has(cursor.toISOString().slice(0,10))){
    streak++;
    cursor.setDate(cursor.getDate()-1);
  }
  db.streak = streak;
}
function deleteRegistro(id){
  db.registros = db.registros.filter(r=>r.id!==id);
  saveDB(); renderAll();
}
function renderRegistroList(){
  const el = document.getElementById('registroList');
  const ordered = db.registros.slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  if(ordered.length===0){
    el.innerHTML = `<div class="empty"><span class="ic">🗒️</span><p>Todavía no registraste ningún día.</p></div>`;
    return;
  }
  el.innerHTML = ordered.map(r=>`
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <strong style="font-family:var(--font-mono); font-size:12px; text-transform:capitalize;">${fmtDate(r.fecha)}</strong>
        <div style="display:flex; align-items:center; gap:8px;">
          ${r.tiempoMin?`<span class="badge hecha">${r.tiempoMin} min</span>`:''}
          <button class="btn ghost sm" onclick="deleteRegistro('${r.id}')">✕</button>
        </div>
      </div>
      ${r.estudie?`<p style="margin:4px 0; font-size:13.5px;"><strong>Estudié:</strong> ${escapeHtml(r.estudie)}</p>`:''}
      ${r.costo?`<p style="margin:4px 0; font-size:13.5px;"><strong>Me costó:</strong> ${escapeHtml(r.costo)}</p>`:''}
      ${r.repasarManana?`<p style="margin:4px 0; font-size:13.5px;"><strong>Mañana repasar:</strong> ${escapeHtml(r.repasarManana)}</p>`:''}
    </div>
  `).join('');
}

/* ===================== STATS ===================== */
function renderStats(){
  const lecturasHechas = db.lecturas.filter(l=>l.estado==='hecha'||l.estado==='repasada').length;
  const totalLecturas = db.lecturas.length;
  const parcialesProx = db.parciales.filter(p=>daysUntil(p.fecha)>=0).length;
  const tiempoTotal = db.registros.reduce((acc,r)=>acc+(r.tiempoMin||0),0);

  document.getElementById('statGrid').innerHTML = `
    <div class="stat-card">
      <div class="stat-num">${lecturasHechas}/${totalLecturas}</div>
      <div class="stat-label">Lecturas hechas</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">${parcialesProx}</div>
      <div class="stat-label">Parciales próximos</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">${db.streak||0}</div>
      <div class="stat-label">Días seguidos</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">${Math.round(tiempoTotal/60)}h</div>
      <div class="stat-label">Tiempo total</div>
    </div>
  `;

  const streakCard = document.getElementById('streakCard');
  const flames = db.streak>0 ? '🔥'.repeat(Math.min(db.streak,10)) : '—';
  streakCard.innerHTML = `
    <div class="streak-flame">${flames}</div>
    <p class="item-sub" style="margin-top:6px;">${db.streak>0 ? `Llevás ${db.streak} día${db.streak===1?'':'s'} seguidos registrando estudio.` : 'Todavía no arrancaste una racha. Registrá hoy para empezar.'}</p>
  `;

  const progEl = document.getElementById('progresoMaterias');
  if(db.materias.length===0){
    progEl.innerHTML = `<p class="item-sub" style="margin:0;">No hay materias cargadas.</p>`;
  } else {
    progEl.innerHTML = db.materias.map(m=>{
      const lecturas = db.lecturas.filter(l=>l.materiaId===m.id);
      const hechas = lecturas.filter(l=>l.estado==='hecha'||l.estado==='repasada').length;
      const pct = lecturas.length ? Math.round(hechas/lecturas.length*100) : 0;
      return `
        <div style="margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; font-size:12.5px; margin-bottom:3px;">
            <span>${escapeHtml(m.nombre)}</span>
            <span class="item-sub">${pct}%</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%; background:${m.color};"></div></div>
        </div>
      `;
    }).join('');
  }
}

/* ===================== RENDER ALL ===================== */
function renderAll(){
  renderHoy();
  renderMaterias();
  renderLecturas();
  renderParciales();
  renderRegistroForm();
  renderRegistroList();
  renderStats();
}
