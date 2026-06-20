/* ===================== INIT ===================== */
document.addEventListener('DOMContentLoaded', ()=>{
  document.querySelectorAll('.tab-btn').forEach(b=>{
    b.addEventListener('click', ()=>showView(b.dataset.view));
  });

  document.getElementById('overlay').addEventListener('click', e=>{
    if(e.target.id==='overlay') closeModal();
  });
  document.getElementById('aiOverlay').addEventListener('click', e=>{
    if(e.target.id==='aiOverlay') closeAIPanel();
  });

  document.getElementById('filtroMateriaLecturas').addEventListener('change', renderLecturas);
  document.getElementById('filtroEstadoLecturas').addEventListener('change', renderLecturas);

  document.getElementById('btnModoCansado').addEventListener('click', toggleModoCansado);

  document.getElementById('fabBtn').addEventListener('click', ()=>{
    const active = views.find(v=>document.getElementById('view-'+v).classList.contains('active'));
    if(active==='materias') openMateriaForm();
    else if(active==='lecturas') openLecturaForm();
    else if(active==='tps') openTPForm();
    else if(active==='parciales') openParcialForm();
    else if(active==='hoy') openTareaForm();
    else if(active==='registro') document.getElementById('registroForm').scrollIntoView({behavior:'smooth'});
    else openMateriaForm();
  });

  document.getElementById('aiFab').addEventListener('click', openAIPanel);
  document.getElementById('aiCloseBtn').addEventListener('click', closeAIPanel);
  document.getElementById('aiConfigBtn').addEventListener('click', openConfigIA);
  document.getElementById('aiSendBtn').addEventListener('click', enviarMensajeIA);
  document.getElementById('aiInput').addEventListener('keydown', handleAIInputKeydown);
  document.getElementById('aiInput').addEventListener('input', e=>autoGrowAIInput(e.target));
  document.getElementById('apiKeyBannerBtn').addEventListener('click', openConfigIA);

  renderAll();

  // Registrar service worker para uso offline / PWA
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
});
