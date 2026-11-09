// Comunicación con la API de la cátedra.
// En modo "local" todo se simula en el navegador con localStorage.

const CLAVE_PRUEBA = "encuesta-cupos-prueba";
const esLocal = CONFIG.MODO === "local";

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

// POST a la API. Devuelve el JSON si salió bien; si no, lanza un error con el código HTTP.
async function llamarApi(ruta, cuerpo) {
  const res = await fetch(CONFIG.API_BASE + "/" + ruta + "/" + CONFIG.ID_RUTA, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  let datos = null;
  try {
    datos = await res.json();
  } catch (e) {
    // Respuesta sin JSON: se trata como error.
  }
  if (!res.ok || !datos || datos.success !== true) {
    const err = new Error("La API respondió " + res.status);
    err.status = res.status;
    err.detalle = datos && datos.errors;
    throw err;
  }
  return datos;
}

// Devuelve cuántas respuestas hay guardadas para esa carrera y año.
async function contarRespuestas(carrera, anio) {
  if (esLocal) return leerConteoPrueba()[claveCupo(carrera, anio)] || 0;

  const datos = await llamarApi("controlar_cantidades", {
    ID_Grupo: CONFIG.ID_GRUPO,
    Modo: CONFIG.MODO,
    Carrera: carrera,
    Curso: String(anio),
  });
  const cantidad = Number(datos.data && datos.data.cantidad);
  if (!Number.isFinite(cantidad)) throw new Error("La API no devolvió la cantidad");
  return cantidad;
}

async function cupoCompleto(carrera, anio) {
  const cantidad = await contarRespuestas(carrera, anio);
  return cantidad >= CUPOS[carrera][anio];
}

// Guarda una encuesta. Recibe el registro con los campos de la API.
async function enviarRespuesta(registro) {
  if (esLocal) {
    const conteo = leerConteoPrueba();
    const clave = claveCupo(registro.Carrera, registro.Curso);
    conteo[clave] = (conteo[clave] || 0) + 1;
    guardarConteoPrueba(conteo);
    return registro;
  }
  await llamarApi("guardar_encuesta", registro);
  return registro;
}
