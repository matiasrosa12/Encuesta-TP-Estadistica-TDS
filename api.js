// Comunicación con la API de la cátedra.
// En modo prueba todo se simula en el navegador con localStorage.

const CLAVE_PRUEBA = "encuesta-cupos-prueba";

function leerConteoPrueba() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_PRUEBA)) || {};
  } catch (e) {
    return {};
  }
}

function guardarConteoPrueba(conteo) {
  try {
    localStorage.setItem(CLAVE_PRUEBA, JSON.stringify(conteo));
  } catch (e) {
    // Sin localStorage (navegación privada): el conteo de prueba no se guarda.
  }
}

const claveCupo = (carrera, anio) => carrera + "|" + anio;

// Devuelve cuántas respuestas válidas tiene esa carrera y año.
async function contarRespuestas(carrera, anio) {
  if (CONFIG.MODO === "prueba") {
    return leerConteoPrueba()[claveCupo(carrera, anio)] || 0;
  }
  if (!CONFIG.CONTEO_URL) return 0;

  const url = CONFIG.CONTEO_URL + "?carrera=" + encodeURIComponent(carrera) + "&anio=" + encodeURIComponent(anio);
  const res = await fetch(url);
  if (!res.ok) throw new Error("No se pudo consultar el cupo (" + res.status + ")");
  const datos = await res.json();
  return Number(datos.cantidad) || 0;
}

async function cupoCompleto(carrera, anio) {
  const cantidad = await contarRespuestas(carrera, anio);
  return cantidad >= CUPOS[carrera][anio];
}

// Envía una respuesta. Recibe el objeto "respuestas" del diccionario de datos.
async function enviarRespuesta(respuestas) {
  const cuerpo = {
    token: CONFIG.TOKEN,
    version_formulario: CONFIG.MODO === "prueba" ? 0 : CONFIG.VERSION_FORMULARIO,
    respuestas,
  };

  if (CONFIG.MODO === "prueba") {
    const conteo = leerConteoPrueba();
    const clave = claveCupo(respuestas.carrera_referencia, respuestas.anio_cursada);
    conteo[clave] = (conteo[clave] || 0) + 1;
    guardarConteoPrueba(conteo);
    return cuerpo;
  }

  const res = await fetch(CONFIG.API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  if (!res.ok) throw new Error("La API respondió " + res.status);
  return cuerpo;
}
