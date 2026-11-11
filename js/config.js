// Configuración de la encuesta. Es el único archivo que hay que tocar
// para pasar de prueba a la versión real.

const CONFIG = {
  // "local": no envía nada. Simula los cupos en el navegador y muestra el JSON al final.
  // "T": prueba piloto contra la API de la cátedra (se guarda con Modo T, no cuenta para la muestra).
  // "P": encuesta real (Modo P). Usar este modo para el QR definitivo.
  MODO: "T",

  // API de la cátedra.
  API_BASE: "https://apidemo.geoeducacion.com.ar/api/testing/tpf2026",
  ID_RUTA: 1, // parámetro {id} de la ruta: siempre 1
  ID_GRUPO: 1, // la cátedra no asignó número; somos el único grupo que usa la API
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

// Libro de códigos: la API solo acepta enteros de 0 a 9 en las respuestas.
// En las situaciones (S1 a S3), 9 = "No sé".
const CODIGOS = {
  claridad: { nada: 1, poco: 2, algo: 3, bastante: 4, muy: 5 }, // P4 y P5
  conoce_materias_promocion: { todas: 1, algunas: 2, ninguna: 3, no_sabe_que_es: 4 }, // P6
  anticipacion_info: {
    antes_inicio: 1, primeras_2_semanas: 2, durante_cuatrimestre: 3,
    cerca_cierre: 4, nunca: 5, no_recuerda: 6,
  }, // P9
  situacion_promocion: { sin_final: 1, con_final: 2, depende_docente: 3, no_sabe: 9 }, // P10 (correcta: 1)
  situacion_nota_intermedia: { promociona: 1, rinde_final: 2, recursa: 3, no_sabe: 9 }, // P11 (correcta: 2)
  situacion_vigencia: {
    mar_2028: 1, dic_2028: 2, mar_2029: 3, dic_2029: 4, nunca_vence: 5, no_sabe: 9,
  }, // P12 (correcta: 3)
  dificultad_principal: {
    contradictoria: 1, no_sabe_donde: 2, lenguaje_tecnico: 3,
    criterios_variables: 4, ninguna: 5, otra: 6,
  }, // P13
};
