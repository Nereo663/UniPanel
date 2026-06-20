/* ===================== ASISTENTE IA (OpenAI) ===================== */

let aiMessages = []; // historial de la sesión actual del chat (no persiste entre recargas)
let aiBusy = false;

/* ---- Definición de herramientas que la IA puede usar para tocar tus datos ---- */
const AI_TOOLS = [
  {
    type: "function",
    function: {
      name: "crear_materia",
      description: "Crea una nueva materia universitaria.",
      parameters: {
        type: "object",
        properties: {
          nombre: { type: "string", description: "Nombre de la materia" }
        },
        required: ["nombre"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "crear_lectura",
      description: "Crea una lectura/tema de estudio dentro de una materia y módulo.",
      parameters: {
        type: "object",
        properties: {
          materia: { type: "string", description: "Nombre de la materia (existente o nueva)" },
          modulo: { type: "string", description: "Nombre del módulo o unidad" },
          titulo: { type: "string", description: "Título de la lectura" }
        },
        required: ["materia", "titulo"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "actualizar_estado_lectura",
      description: "Cambia el estado de una lectura existente buscándola por texto del título.",
      parameters: {
        type: "object",
        properties: {
          titulo_busqueda: { type: "string", description: "Texto para encontrar la lectura por su título" },
          estado: { type: "string", enum: ["pendiente","progreso","hecha","repasada"] }
        },
        required: ["titulo_busqueda", "estado"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "crear_parcial",
      description: "Crea un parcial/examen con fecha para una materia.",
      parameters: {
        type: "object",
        properties: {
          materia: { type: "string", description: "Nombre de la materia (existente o nueva)" },
          fecha: { type: "string", description: "Fecha en formato YYYY-MM-DD" },
          prioridad: { type: "string", enum: ["alta","media","baja"] },
          nota: { type: "string", description: "Nota opcional sobre el examen" }
        },
        required: ["materia", "fecha"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "crear_tarea_hoy",
      description: "Crea una tarea de estudio para el día de hoy.",
      parameters: {
        type: "object",
        properties: {
          texto: { type: "string", description: "Descripción breve de la tarea" }
        },
        required: ["texto"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "obtener_contexto_actual",
      description: "Devuelve un resumen completo de materias, lecturas pendientes, próximos parciales y tareas de hoy para poder planificar con base en datos reales. Usar SIEMPRE antes de sugerir un plan.",
      parameters: { type: "object", properties: {} }
    }
  }
];

/* ---- Ejecuta la función que pidió el modelo, sobre la base de datos real ---- */
function ejecutarHerramientaIA(name, args){
  try{
    if(name === "crear_materia"){
      let m = db.materias.find(x=>x.nombre.toLowerCase()===args.nombre.toLowerCase());
      if(!m){
        m = {id:uid(), nombre:args.nombre, color: COLORS[db.materias.length % COLORS.length]};
        db.materias.push(m);
        saveDB();
      }
      return { ok:true, mensaje:`Materia "${m.nombre}" creada.` };
    }

    if(name === "crear_lectura"){
      let m = db.materias.find(x=>x.nombre.toLowerCase()===args.materia.toLowerCase());
      if(!m){
        m = {id:uid(), nombre:args.materia, color: COLORS[db.materias.length % COLORS.length]};
        db.materias.push(m);
      }
      const lectura = {id:uid(), materiaId:m.id, modulo:args.modulo||'General', titulo:args.titulo, estado:'pendiente'};
      db.lecturas.push(lectura);
      saveDB();
      return { ok:true, mensaje:`Lectura "${args.titulo}" agregada a ${m.nombre}.` };
    }

    if(name === "actualizar_estado_lectura"){
      const busqueda = args.titulo_busqueda.toLowerCase();
      const lectura = db.lecturas.find(l=>l.titulo.toLowerCase().includes(busqueda));
      if(!lectura) return { ok:false, mensaje:`No encontré ninguna lectura que coincida con "${args.titulo_busqueda}".` };
      lectura.estado = args.estado;
      saveDB();
      return { ok:true, mensaje:`Lectura "${lectura.titulo}" marcada como ${args.estado}.` };
    }

    if(name === "crear_parcial"){
      let m = db.materias.find(x=>x.nombre.toLowerCase()===args.materia.toLowerCase());
      if(!m){
        m = {id:uid(), nombre:args.materia, color: COLORS[db.materias.length % COLORS.length]};
        db.materias.push(m);
      }
      const parcial = {id:uid(), materiaId:m.id, fecha:args.fecha, prioridad:args.prioridad||'media', nota:args.nota||''};
      db.parciales.push(parcial);
      saveDB();
      return { ok:true, mensaje:`Parcial de ${m.nombre} agendado para ${args.fecha}.` };
    }

    if(name === "crear_tarea_hoy"){
      db.tareas.push({id:uid(), texto:args.texto, fecha:todayStr(), hecha:false, esMinima:false});
      saveDB();
      return { ok:true, mensaje:`Tarea agregada: "${args.texto}".` };
    }

    if(name === "obtener_contexto_actual"){
      const lecturasPendientes = db.lecturas.filter(l=>l.estado==='pendiente'||l.estado==='progreso')
        .map(l=>{
          const m = materiaById(l.materiaId);
          return `${m?m.nombre:'?'} / ${l.modulo}: ${l.titulo} (${l.estado})`;
        });
      const parcialesProx = db.parciales.filter(p=>daysUntil(p.fecha)>=0)
        .sort((a,b)=>a.fecha.localeCompare(b.fecha))
        .map(p=>{
          const m = materiaById(p.materiaId);
          return `${m?m.nombre:'?'} el ${p.fecha} (faltan ${daysUntil(p.fecha)}d, prioridad ${p.prioridad})`;
        });
      const tareasHoy = db.tareas.filter(t=>t.fecha===todayStr()).map(t=>`${t.texto} (${t.hecha?'hecha':'pendiente'})`);
      const materias = db.materias.map(m=>m.nombre);
      return {
        ok:true,
        materias,
        lecturas_pendientes: lecturasPendientes,
        parciales_proximos: parcialesProx,
        tareas_hoy: tareasHoy,
        racha_estudio_dias: db.streak||0
      };
    }

    return { ok:false, mensaje:"Función no reconocida." };
  }catch(e){
    return { ok:false, mensaje:"Error ejecutando la acción: "+e.message };
  }
}

const SYSTEM_PROMPT = `Sos el asistente de UniPanel, una app de organización universitaria.
Hablás en español rioplatense, tono cercano y directo, sin vueltas.
Podés CREAR Y MODIFICAR datos reales del usuario (materias, lecturas, parciales, tareas) usando las herramientas disponibles. Usalas con confianza cuando el usuario pida crear/agregar/marcar algo, no le preguntes confirmación de más.
Cuando te pidan ayuda para PLANIFICAR el estudio, primero llamá a obtener_contexto_actual para tener datos reales (parciales próximos, lecturas pendientes), y armá un plan concreto y realista basado en eso, no genérico.
Sé breve. Evitá párrafos largos. Si hacés una acción, confirmá en una frase corta qué hiciste.
Si el usuario pide algo ambiguo (ej "creá tareas para esta semana" sin detalle), usá tu criterio razonable en vez de preguntar mil cosas.`;

/* ---- Llamada principal a la API de OpenAI con function calling ---- */
async function llamarOpenAI(){
  if(!settings.openaiApiKey){
    return { error: "Falta configurar tu API key de OpenAI." };
  }

  const body = {
    model: settings.aiModel || 'gpt-4o-mini',
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...aiMessages
    ],
    tools: AI_TOOLS,
    tool_choice: "auto"
  };

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + settings.openaiApiKey
    },
    body: JSON.stringify(body)
  });

  if(!resp.ok){
    const errText = await resp.text();
    let msg = "Error de la API de OpenAI.";
    try{
      const errJson = JSON.parse(errText);
      msg = errJson.error?.message || msg;
    }catch(e){}
    return { error: msg };
  }

  const data = await resp.json();
  return { data };
}

/* ---- Orquesta: manda mensaje, ejecuta tool calls en loop, devuelve texto final ---- */
async function procesarMensajeIA(textoUsuario){
  aiMessages.push({ role: "user", content: textoUsuario });

  let accionesRealizadas = [];
  let intentos = 0;

  while(intentos < 6){
    intentos++;
    const { data, error } = await llamarOpenAI();
    if(error){
      return { texto: null, error, acciones: accionesRealizadas };
    }

    const choice = data.choices[0];
    const msg = choice.message;

    if(msg.tool_calls && msg.tool_calls.length > 0){
      aiMessages.push({ role: "assistant", content: msg.content || null, tool_calls: msg.tool_calls });

      for(const call of msg.tool_calls){
        let args = {};
        try{ args = JSON.parse(call.function.arguments || '{}'); }catch(e){}
        const resultado = ejecutarHerramientaIA(call.function.name, args);

        if(call.function.name !== 'obtener_contexto_actual'){
          accionesRealizadas.push(resultado.mensaje || (resultado.ok ? 'Acción realizada.' : 'No se pudo completar la acción.'));
        }

        aiMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(resultado)
        });
      }
      continue; // volver a llamar al modelo con los resultados de las funciones
    }

    // respuesta final en texto
    aiMessages.push({ role: "assistant", content: msg.content });
    return { texto: msg.content, error: null, acciones: accionesRealizadas };
  }

  return { texto: "Se hicieron varios cambios. ¿Necesitás algo más?", error: null, acciones: accionesRealizadas };
}
