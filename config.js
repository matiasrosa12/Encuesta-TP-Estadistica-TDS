// Configuración de la encuesta. Es el único archivo que hay que tocar
// para pasar de prueba a la versión real.

const CONFIG = {
  // "prueba": no envía nada, simula los cupos en el navegador y muestra el JSON al final.
  // "real": envía cada respuesta a la API de la cátedra.
  MODO: "prueba",

  // Datos que entrega la cátedra.
  API_URL: "",            // endpoint donde se hace el POST de cada respuesta
  TOKEN: "TOKEN_DEL_EQUIPO",

  // Endpoint que devuelve cuántas respuestas válidas hay para una carrera y un año.
  // Tiene que responder algo como {"cantidad": 4}. Si queda vacío, no se controlan cupos.
  // No pongan acá el acceso de lectura de la API: este archivo es público.
  CONTEO_URL: "",

  // 1 = prueba piloto, 2 = versión definitiva. Los envíos de desarrollo usan 0.
  VERSION_FORMULARIO: 1,
};

// Nombres cortos para mostrar en pantalla.
const CARRERAS = {
  inicial: "Inicial",
  psicopedagogia: "Psicopedagogía",
  acompanamiento_terapeutico: "Acomp. Terapéutico",
  desarrollo_software: "Desarrollo de Software",
};

// Cupo de respuestas válidas por carrera y año (sección 2 del diseño:
// asignación proporcional con n = 75, que por redondeo queda en 76).
// Las claves de cada carrera son los años que se ofrecen en la pregunta 2.
const CUPOS = {
  inicial: { 4: 3 },
  psicopedagogia: { 1: 5, 2: 4, 3: 4, 4: 4 },
  acompanamiento_terapeutico: { 1: 21, 2: 8, 3: 11 },
  desarrollo_software: { 1: 3, 2: 5, 3: 8 },
};
