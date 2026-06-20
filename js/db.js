/* ===================== DATA LAYER ===================== */
const DB_KEY = 'unipanel_data_v1';
const SETTINGS_KEY = 'unipanel_settings_v1';

function loadDB(){
  const raw = localStorage.getItem(DB_KEY);
  if(raw){
    try{ return JSON.parse(raw); }catch(e){}
  }
  return {
    materias: [],      // {id, nombre, color}
    lecturas: [],        // {id, materiaId, modulo, titulo, estado}
    parciales: [],         // {id, materiaId, fecha, prioridad, nota}
    tareas: [],              // {id, texto, fecha(YYYY-MM-DD), hecha, esMinima}
    registros: [],             // {id, fecha, estudie, tiempoMin, costo, repasarManana}
    lastActiveDate: null,
    streak: 0
  };
}
function saveDB(){ localStorage.setItem(DB_KEY, JSON.stringify(db)); }
let db = loadDB();

function loadSettings(){
  const raw = localStorage.getItem(SETTINGS_KEY);
  if(raw){
    try{ return JSON.parse(raw); }catch(e){}
  }
  return { openaiApiKey: '', aiModel: 'gpt-4o-mini' };
}
function saveSettings(){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
let settings = loadSettings();

function materiaById(id){ return db.materias.find(m=>m.id===id); }
