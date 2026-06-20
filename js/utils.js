/* ===================== UTILS ===================== */
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

function todayStr(){ const d=new Date(); return d.toISOString().slice(0,10); }

function fmtDate(s){
  const d = new Date(s+'T00:00:00');
  return d.toLocaleDateString('es-AR',{day:'2-digit', month:'short'});
}

function daysUntil(s){
  const today = new Date(todayStr()+'T00:00:00');
  const target = new Date(s+'T00:00:00');
  return Math.round((target-today)/86400000);
}

function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

const COLORS = ['#C2491D','#3F6B4F','#A8761F','#5B6B8C','#A6402F','#6B5B8C','#2A7F7F','#8C5B3F'];
