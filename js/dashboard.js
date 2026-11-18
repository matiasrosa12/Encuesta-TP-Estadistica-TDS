// Dashboard de resultados.
// Lee las respuestas reales (Modo P) de la API de la cátedra y recalcula todo
// cada vez que cambia el filtro de carrera. Si la API no responde, usa la base
// guardada en datos/ para que el panel siempre se pueda mostrar.
// Usa CONFIG y CUPOS de js/config.js.

const URL_RESULTADOS =
  CONFIG.API_BASE + "/ver_resultados/" + CONFIG.ID_RUTA + "?ID_Grupo=" + CONFIG.ID_GRUPO + "&Modo=P";
const RESPALDO = "datos/base_original_2026-11-18.json";
const FECHA_RESPALDO = "18/11/2026";
const MIN_CASOS = 5; // por debajo de esto no se muestran resultados (resguardo ético)

// Matrícula por carrera y año (marco muestral).
const MATRICULA = {
  inicial: { 4: 12 },
  psicopedagogia: { 1: 23, 2: 19, 3: 16, 4: 16 },
  acompanamiento_terapeutico: { 1: 96, 2: 38, 3: 48 },
  desarrollo_software: { 1: 12, 2: 23, 3: 34 },
};
const NOMBRE = {
  inicial: "Inicial",
  psicopedagogia: "Psicopedagogía",
  acompanamiento_terapeutico: "Acompañamiento Terapéutico",
  desarrollo_software: "Desarrollo de Software",
};

// Etiquetas del libro de códigos (sección 5 de la Entrega 1).
const ETQ = {
  claridad: { 1: "Nada claras", 2: "Poco claras", 3: "Algo claras", 4: "Bastante claras", 5: "Muy claras" },
  p6: { 1: "Sí, de todas", 2: "De algunas", 3: "De ninguna", 4: "No sé qué es" },
  cuando: {
    1: "Antes de empezar la cursada", 2: "Primeras 2 semanas", 3: "Durante el cuatrimestre",
    4: "Cerca de los exámenes", 5: "Nunca la recibí", 6: "No recuerdo",
  },
  s3: { 1: "Marzo 2028", 2: "Diciembre 2028", 3: "Marzo 2029 (correcta)", 4: "Diciembre 2029", 5: "No vence nunca", 9: "No sé" },
  dif: {
    1: "Información contradictoria", 2: "No sé dónde buscarla", 3: "Lenguaje técnico",
    4: "Criterios cambian según docente", 5: "Ninguna dificultad", 6: "Otra",
  },
  canal: {
    docente: "Docente, en clase", secretaria: "Secretaría", rai: "RAI o reglamento",
    pagina_instituto: "Página del instituto", companeros: "Compañeros",
    whatsapp_redes: "WhatsApp o redes", ninguno: "Ningún medio",
  },
};
const CORRECTA = { S1: 1, S2: 2, S3: 3 };
const RANGOS = {
  Claridad_Promocion: [1, 2, 3, 4, 5], Claridad_Final: [1, 2, 3, 4, 5], Conoces_Materias_PD: [1, 2, 3, 4],
  Cuando_Recibiste_Informacion: [1, 2, 3, 4, 5, 6], S1: [1, 2, 3, 9], S2: [1, 2, 3, 9],
  S3: [1, 2, 3, 4, 5, 9], Dificultad: [1, 2, 3, 4, 5, 6],
};

// Colores validados: rampa ordinal de un solo tono (violeta) y un par correcta/incorrecta.
// "No sé" va en gris neutro: no es una categoría más, es ausencia de respuesta sustantiva.
const COLOR = {
  rampa: ["#c69ccb", "#a86fb0", "#8a4693", "#6a2873", "#4a1251"],
  correcta: "#8a4693", incorrecta: "#eb6834", nose: "#a8a7a2",
  barra: "#8a4693", superficie: "#ffffff", grilla: "#ece6ed", texto: "#5f5261", tinta: "#231a24",
};
const TEXTO_CLARO = new Set(["#8a4693", "#6a2873", "#4a1251", "#a86fb0"]);

// ---------- Utilidades ----------

const $ = (id) => document.getElementById(id);
const num1 = (x) => x.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const porc = (a, b) => (b ? (100 * a) / b : 0);
const fPct = (a, b) => num1(porc(a, b)) + " %";
const correctas = (r) => (r.S1 === CORRECTA.S1) + (r.S2 === CORRECTA.S2) + (r.S3 === CORRECTA.S3);
const principal = (r) => (r.Informacion.length ? r.Informacion[0] : "ninguno");

function contar(datos, f) {
  const m = new Map();
  datos.forEach((r) => {
    const v = f(r);
    m.set(v, (m.get(v) || 0) + 1);
  });
  return m;
}

function mediana(v) {
  const a = [...v].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

// Cuartil con interpolación (método "inclusive").
function cuartil(v, q) {
  const a = [...v].sort((x, y) => x - y);
  const pos = (a.length - 1) * q;
  const i = Math.floor(pos);
  return a[i] + (a[Math.min(i + 1, a.length - 1)] - a[i]) * (pos - i);
}

function moda(v) {
  const c = contar(v.map((x) => ({ x })), (r) => r.x);
  return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
}

function desvio(v) {
  const m = v.reduce((s, x) => s + x, 0) / v.length;
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
}

// Para escalas ordinales: si la mediana cae entre dos categorías, se dice así.
function etiquetaOrdinal(valor, etiquetas) {
  if (Number.isInteger(valor)) return etiquetas[valor];
  return "entre " + etiquetas[Math.floor(valor)].toLowerCase() + " y " + etiquetas[Math.ceil(valor)].toLowerCase();
}

function tabla(el, encabezados, filas, total) {
  const th = encabezados.map((h, i) => `<th${i ? ' class="num"' : ""}>${h}</th>`).join("");
  const tr = (f, cls) =>
    `<tr${cls ? ` class="${cls}"` : ""}>` + f.map((c, i) => `<td${i ? ' class="num"' : ""}>${c}</td>`).join("") + "</tr>";
  el.innerHTML = `<table><thead><tr>${th}</tr></thead><tbody>${filas.map((f) => tr(f)).join("")}${
    total ? tr(total, "total") : ""
  }</tbody></table>`;
}

// Tabla de frecuencias absolutas y relativas de una variable.
function tablaFrecuencias(el, categorias, etiquetas, conteo, n, titulo) {
  const filas = categorias.map((c) => [etiquetas[c], conteo.get(c) || 0, fPct(conteo.get(c) || 0, n)]);
  tabla(el, [titulo || "Categoría", "Frecuencia (f)", "Porcentaje"], filas, ["Total", n, "100,0 %"]);
}

function leyenda(el, items) {
  el.innerHTML = items.map(([t, c]) => `<span><i style="background:${c}"></i>${t}</span>`).join("");
}

// ---------- Gráficos ----------

Chart.defaults.font.family = '"Public Sans","Segoe UI",system-ui,sans-serif';
Chart.defaults.font.size = 12;
Chart.defaults.color = COLOR.texto;
Chart.defaults.plugins.legend.display = false;
Chart.defaults.animation.duration = 250;
Chart.defaults.maintainAspectRatio = false;

// Escribe el porcentaje sobre cada barra (al final, arriba o dentro del segmento).
const etiquetas = {
  id: "etiquetas",
  afterDatasetsDraw(chart, args, opts) {
    if (!opts || !opts.modo) return;
    const { ctx } = chart;
    ctx.save();
    ctx.font = '600 12px "Public Sans", system-ui, sans-serif';
    ctx.textBaseline = "middle";
    chart.data.datasets.forEach((ds, i) => {
      chart.getDatasetMeta(i).data.forEach((bar, j) => {
        const v = ds.data[j];
        if (v == null) return;
        if (opts.modo === "fin") {
          ctx.fillStyle = COLOR.tinta;
          ctx.textAlign = "left";
          ctx.fillText(Math.round(v) + " %", bar.x + 6, bar.y);
        } else if (opts.modo === "arriba") {
          ctx.fillStyle = COLOR.tinta;
          ctx.textAlign = "center";
          ctx.fillText(Math.round(v) + " %", bar.x, bar.y - 10);
        } else if (opts.modo === "segmento" && Math.abs(bar.x - bar.base) >= 36) {
          const color = Array.isArray(ds.backgroundColor) ? ds.backgroundColor[j] : ds.backgroundColor;
          ctx.fillStyle = TEXTO_CLARO.has(color) ? "#ffffff" : COLOR.tinta;
          ctx.textAlign = "center";
          ctx.fillText(Math.round(v) + " %", (bar.x + bar.base) / 2, bar.y);
        }
      });
    });
    ctx.restore();
  },
};

// Parte una etiqueta larga en varias líneas para que no se corte en el celular.
function lineas(texto, max = 20) {
  const out = [];
  String(texto).split(" ").forEach((p) => {
    const ult = out[out.length - 1];
    if (ult && (ult + " " + p).length <= max) out[out.length - 1] = ult + " " + p;
    else out.push(p);
  });
  return out;
}

const graficos = {};
function dibujar(id, config) {
  if (graficos[id]) graficos[id].destroy();
  config.plugins = [etiquetas];
  graficos[id] = new Chart($(id), config);
}

// Tooltip común: "Categoría: 34,5 % (20 de 58)".
const tooltip = {
  callbacks: {
    label: (c) => {
      const ds = c.dataset;
      const f = ds.cuentas[c.dataIndex];
      const b = Array.isArray(ds.bases) ? ds.bases[c.dataIndex] : ds.bases;
      return ` ${ds.label ? ds.label + ": " : ""}${num1(c.parsed.x ?? c.parsed.y)} % (${f} de ${b})`;
    },
  },
};

// Barras horizontales simples (una serie).
function barrasH(id, etiquetasCat, cuentas, base, colores) {
  dibujar(id, {
    type: "bar",
    data: {
      labels: etiquetasCat.map((t) => lineas(t)),
      datasets: [{
        data: cuentas.map((f) => porc(f, base)), cuentas, bases: base,
        backgroundColor: colores || COLOR.barra, borderRadius: 4, borderSkipped: "start",
        barPercentage: 0.8, categoryPercentage: 0.85,
      }],
    },
    options: {
      indexAxis: "y",
      layout: { padding: { right: 44 } },
      scales: {
        x: { min: 0, max: 100, grid: { color: COLOR.grilla }, border: { display: false }, ticks: { callback: (v) => v + " %", maxTicksLimit: 6 } },
        y: { grid: { display: false }, border: { display: false } },
      },
      plugins: { tooltip, etiquetas: { modo: "fin" } },
    },
  });
}

// Barras horizontales apiladas al 100 % (una fila por grupo).
function apiladas(id, filas, series) {
  dibujar(id, {
    type: "bar",
    data: {
      labels: filas.map((t) => lineas(t)),
      datasets: series.map((s) => ({
        label: s.nombre, data: s.cuentas.map((f, i) => porc(f, s.bases[i])), cuentas: s.cuentas, bases: s.bases,
        backgroundColor: s.color, borderColor: COLOR.superficie, borderWidth: 1, borderSkipped: false,
        barPercentage: 0.8, categoryPercentage: 0.85,
      })),
    },
    options: {
      indexAxis: "y",
      scales: {
        x: { stacked: true, min: 0, max: 100, grid: { color: COLOR.grilla }, border: { display: false }, ticks: { callback: (v) => v + " %", maxTicksLimit: 6, maxRotation: 0, autoSkip: true } },
        y: { stacked: true, grid: { display: false }, border: { display: false } },
      },
      plugins: { tooltip, etiquetas: { modo: "segmento" } },
    },
  });
}

// ---------- Carga de datos ----------

let BASE = [];
let filtro = "todas";

function normalizar(r) {
  let info = r.Informacion;
  if (typeof info === "string") {
    try { info = JSON.parse(info); } catch (e) { info = []; }
  }
  const out = { ...r, Carrera: String(r.Carrera), Curso: String(r.Curso), Informacion: Array.isArray(info) ? info : [] };
  Object.keys(RANGOS).forEach((k) => (out[k] = Number(r[k])));
  return out;
}

const valido = (r) => MATRICULA[r.Carrera] && MATRICULA[r.Carrera][r.Curso] && Object.entries(RANGOS).every(([k, v]) => v.includes(r[k]));

async function cargar() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(URL_RESULTADOS, { headers: { Accept: "application/json" }, signal: ctrl.signal });
    clearTimeout(t);
    const j = await res.json();
    if (!res.ok || !j.success || !Array.isArray(j.data)) throw new Error("respuesta inválida");
    return { filas: j.data, vivo: true };
  } catch (e) {
    const res = await fetch(RESPALDO);
    const j = await res.json();
    return { filas: j.data, vivo: false };
  }
}

// ---------- Secciones ----------

function renderMuestra() {
  const filas = [];
  let tPrev = 0, tLog = 0, tMat = 0;
  Object.keys(CUPOS).forEach((c) => {
    Object.keys(CUPOS[c]).forEach((a) => {
      const prev = CUPOS[c][a];
      const log = BASE.filter((r) => r.Carrera === c && r.Curso === a).length;
      tPrev += prev; tLog += log; tMat += MATRICULA[c][a];
      filas.push([NOMBRE[c], a + ".°", MATRICULA[c][a], prev, log < prev ? `<span class="bajo">${log}</span>` : log, fPct(log, prev)]);
    });
  });
  tabla($("tablaMuestra"), ["Carrera", "Año", "Matrícula", "Prevista", "Lograda", "% logrado"], filas, ["Total", "", tMat, tPrev, tLog, fPct(tLog, tPrev)]);
  $("tablaMuestra").querySelectorAll("span.bajo").forEach((s) => s.parentElement.classList.add("bajo"));
}

function render() {
  const d = filtro === "todas" ? BASE : BASE.filter((r) => r.Carrera === filtro);
  const n = d.length;
  $("baseFiltro").textContent = "n = " + n + " respuestas válidas";
  document.querySelectorAll("#filtroCarrera button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.c === filtro));

  const pocos = n < MIN_CASOS;
  $("pocos").hidden = !pocos;
  $("contenido").hidden = pocos;
  if (pocos) return;

  const base = `Base: n = ${n} respuestas válidas.`;
  const cuenta = (f) => d.filter(f).length;

  // KPIs
  const previstas = filtro === "todas" ? 76 : Object.values(CUPOS[filtro]).reduce((s, x) => s + x, 0);
  $("kN").textContent = n;
  $("kNb").textContent = `de ${previstas} previstas (${fPct(n, previstas)})`;
  $("kClar").textContent = Math.round(porc(cuenta((r) => r.Claridad_Promocion >= 4), n)) + " %";
  $("kClarB").textContent = `${cuenta((r) => r.Claridad_Promocion >= 4)} de ${n}`;
  const puntajes = d.map(correctas);
  $("kPunt").textContent = String(mediana(puntajes)).replace(".", ",");
  $("kPuntB").textContent = `media ${num1(puntajes.reduce((s, x) => s + x, 0) / n)}`;
  $("kS3").textContent = Math.round(porc(cuenta((r) => r.S3 === 3), n)) + " %";
  $("kS3B").textContent = `${cuenta((r) => r.S3 === 3)} de ${n} (pregunta P12)`;

  // 2. Conocimiento declarado
  const niveles = [1, 2, 3, 4, 5];
  const cP4 = contar(d, (r) => r.Claridad_Promocion);
  const cP5 = contar(d, (r) => r.Claridad_Final);
  leyenda($("leyClaridad"), niveles.map((k, i) => [ETQ.claridad[k], COLOR.rampa[i]]));
  apiladas("chClaridad", ["Promoción (P4)", "Examen final (P5)"], niveles.map((k, i) => ({
    nombre: ETQ.claridad[k], color: COLOR.rampa[i], cuentas: [cP4.get(k) || 0, cP5.get(k) || 0], bases: [n, n],
  })));
  const resumen = (campo) => {
    const v = d.map((r) => r[campo]);
    return `mediana <b>${etiquetaOrdinal(mediana(v), ETQ.claridad).toLowerCase()}</b>, moda <b>${ETQ.claridad[moda(v)].toLowerCase()}</b>, Q1 a Q3: ${etiquetaOrdinal(cuartil(v, 0.25), ETQ.claridad).toLowerCase()} a ${etiquetaOrdinal(cuartil(v, 0.75), ETQ.claridad).toLowerCase()}`;
  };
  $("statsClaridad").innerHTML = `Promoción: ${resumen("Claridad_Promocion")}. Examen final: ${resumen("Claridad_Final")}. ${base}`;
  tabla($("tClaridad"), ["Nivel", "P4 f", "P4 %", "P5 f", "P5 %"],
    niveles.map((k) => [ETQ.claridad[k], cP4.get(k) || 0, fPct(cP4.get(k) || 0, n), cP5.get(k) || 0, fPct(cP5.get(k) || 0, n)]),
    ["Total", n, "100,0 %", n, "100,0 %"]);
  $("lecturaDeclarado").textContent =
    `El ${fPct(cuenta((r) => r.Claridad_Promocion >= 4), n)} dice tener bastante o muy claras las condiciones de promoción, y el ${fPct(cuenta((r) => r.Claridad_Final >= 4), n)} las del examen final.`;

  const cP6 = contar(d, (r) => r.Conoces_Materias_PD);
  barrasH("chP6", [1, 2, 3, 4].map((k) => ETQ.p6[k]), [1, 2, 3, 4].map((k) => cP6.get(k) || 0), n);
  $("baseP6").textContent = base;
  tablaFrecuencias($("tP6"), [1, 2, 3, 4], ETQ.p6, cP6, n, "Respuesta");

  // 3. Comprensión comprobada
  const sit = [["S1", "P10: nota 8 en promoción directa"], ["S2", "P11: nota 5 con recuperatorio"], ["S3", "P12: vigencia de la cursada"]];
  const res = sit.map(([k]) => ({
    ok: cuenta((r) => r[k] === CORRECTA[k]), nose: cuenta((r) => r[k] === 9), mal: cuenta((r) => r[k] !== CORRECTA[k] && r[k] !== 9),
  }));
  leyenda($("leySit"), [["Correcta", COLOR.correcta], ["Incorrecta", COLOR.incorrecta], ["No sé", COLOR.nose]]);
  apiladas("chSit", sit.map((s) => s[1]), [
    { nombre: "Correcta", color: COLOR.correcta, cuentas: res.map((x) => x.ok), bases: [n, n, n] },
    { nombre: "Incorrecta", color: COLOR.incorrecta, cuentas: res.map((x) => x.mal), bases: [n, n, n] },
    { nombre: "No sé", color: COLOR.nose, cuentas: res.map((x) => x.nose), bases: [n, n, n] },
  ]);
  $("baseSit").textContent = base + ' "No sé" se informa aparte de las respuestas incorrectas.';
  tabla($("tSit"), ["Situación", "Correcta", "%", "Incorrecta", "%", "No sé", "%"],
    sit.map((s, i) => [s[1], res[i].ok, fPct(res[i].ok, n), res[i].mal, fPct(res[i].mal, n), res[i].nose, fPct(res[i].nose, n)]));

  const cPunt = contar(d, correctas);
  dibujar("chPunt", {
    type: "bar",
    data: {
      labels: ["0", "1", "2", "3"],
      datasets: [{ data: [0, 1, 2, 3].map((k) => porc(cPunt.get(k) || 0, n)), cuentas: [0, 1, 2, 3].map((k) => cPunt.get(k) || 0), bases: n,
        backgroundColor: COLOR.barra, borderRadius: 4, borderSkipped: "start", barPercentage: 0.7 }],
    },
    options: {
      layout: { padding: { top: 22 } },
      scales: {
        y: { min: 0, max: 100, grid: { color: COLOR.grilla }, border: { display: false }, ticks: { callback: (v) => v + " %", maxTicksLimit: 6 } },
        x: { grid: { display: false }, title: { display: true, text: "Situaciones bien resueltas" } },
      },
      plugins: { tooltip, etiquetas: { modo: "arriba" } },
    },
  });
  const q1 = cuartil(puntajes, 0.25), q3 = cuartil(puntajes, 0.75);
  $("statsPunt").innerHTML = `Media <b>${num1(puntajes.reduce((s, x) => s + x, 0) / n)}</b> · mediana <b>${String(mediana(puntajes)).replace(".", ",")}</b> · desvío estándar <b>${num1(desvio(puntajes))}</b> · Q1 ${String(q1).replace(".", ",")}, Q3 ${String(q3).replace(".", ",")} (rango intercuartílico ${String(q3 - q1).replace(".", ",")}). ${base}`;
  tablaFrecuencias($("tPunt"), [0, 1, 2, 3], { 0: "0", 1: "1", 2: "2", 3: "3" }, cPunt, n, "Puntaje");

  const ordenS3 = [1, 2, 3, 4, 5, 9];
  const cS3 = contar(d, (r) => r.S3);
  barrasH("chS3", ordenS3.map((k) => ETQ.s3[k]), ordenS3.map((k) => cS3.get(k) || 0), n,
    ordenS3.map((k) => (k === 3 ? COLOR.correcta : k === 9 ? COLOR.nose : COLOR.incorrecta)));
  $("baseS3").textContent = base + " Violeta: correcta · naranja: incorrecta · gris: no sé.";
  tablaFrecuencias($("tS3"), ordenS3, ETQ.s3, cS3, n, "Opción elegida");

  $("lecturaComprension").textContent =
    `Las situaciones de promoción se resuelven bien (P10: ${fPct(res[0].ok, n)}, P11: ${fPct(res[1].ok, n)}), pero en P12 solo acierta el ${fPct(res[2].ok, n)} y el ${fPct(res[2].nose, n)} responde "No sé". El ${fPct(cPunt.get(3) || 0, n)} resolvió bien las tres situaciones.`;

  // 4. Cómo se informan
  const canales = Object.keys(ETQ.canal);
  const cCanal = new Map(canales.map((k) => [k, k === "ninguno" ? cuenta((r) => !r.Informacion.length) : cuenta((r) => r.Informacion.includes(k))]));
  const ordenCanal = canales.filter((k) => cCanal.get(k) > 0 || k !== "ninguno").sort((a, b) => cCanal.get(b) - cCanal.get(a));
  barrasH("chCanales", ordenCanal.map((k) => ETQ.canal[k]), ordenCanal.map((k) => cCanal.get(k)), n);
  $("baseCanales").textContent = `Base: n = ${n} estudiantes. Cada uno puede marcar varios medios: los porcentajes suman más de 100 %.`;
  tabla($("tCanales"), ["Medio", "Estudiantes (f)", "% de estudiantes"], ordenCanal.map((k) => [ETQ.canal[k], cCanal.get(k), fPct(cCanal.get(k), n)]));

  const cPrin = contar(d, principal);
  const ordenPrin = canales.filter((k) => cPrin.get(k)).sort((a, b) => cPrin.get(b) - cPrin.get(a));
  barrasH("chPrincipal", ordenPrin.map((k) => ETQ.canal[k]), ordenPrin.map((k) => cPrin.get(k)), n);
  $("basePrincipal").textContent = base + " Con un solo medio marcado, ese es el principal.";
  tablaFrecuencias($("tPrincipal"), ordenPrin, ETQ.canal, cPrin, n, "Medio principal");

  const cCuando = contar(d, (r) => r.Cuando_Recibiste_Informacion);
  barrasH("chCuando", [1, 2, 3, 4, 5, 6].map((k) => ETQ.cuando[k]), [1, 2, 3, 4, 5, 6].map((k) => cCuando.get(k) || 0), n);
  $("baseCuando").textContent = base;
  tablaFrecuencias($("tCuando"), [1, 2, 3, 4, 5, 6], ETQ.cuando, cCuando, n, "Momento");

  const cDif = contar(d, (r) => r.Dificultad);
  const ordenDif = [1, 2, 3, 4, 5, 6].sort((a, b) => (cDif.get(b) || 0) - (cDif.get(a) || 0));
  barrasH("chDif", ordenDif.map((k) => ETQ.dif[k]), ordenDif.map((k) => cDif.get(k) || 0), n);
  $("baseDif").textContent = base;
  tablaFrecuencias($("tDif"), [1, 2, 3, 4, 5, 6], ETQ.dif, cDif, n, "Dificultad");

  $("lecturaCanales").textContent =
    `El ${fPct(cCanal.get("docente"), n)} se informó por el docente, y para el ${fPct(cPrin.get("docente") || 0, n)} fue el medio principal. La página del instituto (${fPct(cCanal.get("pagina_instituto"), n)}) y el RAI (${fPct(cCanal.get("rai"), n)}) casi no se usan.`;

  // 5. Cruces
  renderCruce1(d);
  renderCruce2(d, puntajes);
}

function renderCruce1(d) {
  const porCarrera = filtro === "todas";
  const grupos = porCarrera
    ? Object.keys(NOMBRE).map((c) => [NOMBRE[c], d.filter((r) => r.Carrera === c)])
    : Object.keys(CUPOS[filtro]).map((a) => [a + ".° año", d.filter((r) => r.Curso === a)]);
  $("tituloCruce1").textContent = porCarrera ? "Claridad sobre promoción, por carrera (P1 × P4)" : `Claridad sobre promoción, por año: ${NOMBRE[filtro]} (P2 × P4)`;
  const visibles = grupos.filter(([, g]) => g.length >= MIN_CASOS);
  const ocultos = grupos.filter(([, g]) => g.length < MIN_CASOS);
  const niveles = [1, 2, 3, 4, 5];
  leyenda($("leyCruce1"), niveles.map((k, i) => [ETQ.claridad[k], COLOR.rampa[i]]));
  $("boxCruce1").hidden = !visibles.length;
  if (visibles.length) {
    $("boxCruce1").style.height = 70 + 48 * visibles.length + "px";
    apiladas("chCruce1", visibles.map(([nom, g]) => `${nom} (n\u00a0=\u00a0${g.length})`), niveles.map((k, i) => ({
      nombre: ETQ.claridad[k], color: COLOR.rampa[i],
      cuentas: visibles.map(([, g]) => g.filter((r) => r.Claridad_Promocion === k).length), bases: visibles.map(([, g]) => g.length),
    })));
  }
  const alto = visibles.map(([nom, g]) => `${nom}: ${fPct(g.filter((r) => r.Claridad_Promocion >= 4).length, g.length)}`);
  $("lecturaCruce1").textContent =
    (visibles.length ? `Bastante o muy claras: ${alto.join(" · ")}.` : "Ningún grupo llega a 5 respuestas.") +
    (ocultos.length ? ` Sin mostrar por tener menos de 5 respuestas: ${ocultos.map(([nom, g]) => `${nom} (${g.length})`).join(", ")}.` : "");
  tabla($("tCruce1"), ["Grupo", "n", ...niveles.map((k) => ETQ.claridad[k])],
    visibles.map(([nom, g]) => [nom, g.length, ...niveles.map((k) => fPct(g.filter((r) => r.Claridad_Promocion === k).length, g.length))]));
}

function renderCruce2(d) {
  const grupos = [["Nada o poco claras", [1, 2]], ["Algo claras", [3]], ["Bastante claras", [4]], ["Muy claras", [5]]]
    .map(([nom, v]) => [nom, d.filter((r) => v.includes(r.Claridad_Promocion)).map(correctas)]);
  const visibles = grupos.filter(([, g]) => g.length >= MIN_CASOS);
  const ocultos = grupos.filter(([, g]) => g.length < MIN_CASOS);
  const colores = [COLOR.rampa[0], COLOR.rampa[1], COLOR.rampa[3], COLOR.rampa[4]];
  leyenda($("leyCruce2"), [0, 1, 2, 3].map((k) => [`${k} bien resuelta${k === 1 ? "" : "s"}`, colores[k]]));
  apiladas("chCruce2", visibles.map(([nom, g]) => `${nom} (n\u00a0=\u00a0${g.length})`), [0, 1, 2, 3].map((k) => ({
    nombre: `${k} bien resuelta${k === 1 ? "" : "s"}`, color: colores[k],
    cuentas: visibles.map(([, g]) => g.filter((x) => x === k).length), bases: visibles.map(([, g]) => g.length),
  })));
  const medianas = visibles.map(([, g]) => mediana(g));
  const iguales = medianas.every((m) => m === medianas[0]);
  $("lecturaCruce2").textContent =
    (visibles.length
      ? (iguales
        ? `La mediana del puntaje es ${String(medianas[0]).replace(".", ",")} en todos los niveles de claridad: declarar más claridad no se traduce en resolver mejor las situaciones.`
        : `La mediana del puntaje va de ${Math.min(...medianas)} a ${Math.max(...medianas)} según el nivel de claridad declarada.`) +
        " Es una asociación, no una relación de causa."
      : "Ningún grupo llega a 5 respuestas.") +
    (ocultos.length ? ` Sin mostrar por tener menos de 5 respuestas: ${ocultos.map(([nom, g]) => `${nom} (${g.length})`).join(", ")}.` : "");
  tabla($("tCruce2"), ["Claridad declarada (P4)", "n", "0", "1", "2", "3", "Mediana", "Media"],
    visibles.map(([nom, g]) => [nom, g.length, ...[0, 1, 2, 3].map((k) => fPct(g.filter((x) => x === k).length, g.length)),
      String(mediana(g)).replace(".", ","), num1(g.reduce((s, x) => s + x, 0) / g.length)]));
}

// ---------- Inicio ----------

(async function iniciar() {
  const { filas, vivo } = await cargar();
  const todas = filas.filter((r) => Number(r.ID_Grupo) === CONFIG.ID_GRUPO && r.Modo === "P").map(normalizar);
  BASE = todas.filter(valido);
  const excluidas = todas.length - BASE.length;

  const hora = new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
  $("fuente").textContent = vivo
    ? `Datos en vivo desde la API de la cátedra (consultados: ${hora})`
    : `No se pudo conectar con la API: se muestra la base guardada el ${FECHA_RESPALDO}.`;
  $("fuente").classList.toggle("respaldo", !vivo);
  if (excluidas) $("fuente").textContent += ` ${excluidas} registro(s) excluido(s) por valores fuera de rango.`;
  $("fichaN").textContent = `${BASE.length} respuestas válidas de 76 previstas (${fPct(BASE.length, 76)}).`;

  const botones = [["todas", "Todas"], ...Object.keys(NOMBRE).map((c) => [c, NOMBRE[c]])];
  $("filtroCarrera").innerHTML = botones
    .map(([c, t]) => `<button type="button" data-c="${c}" aria-pressed="false">${t} (${c === "todas" ? BASE.length : BASE.filter((r) => r.Carrera === c).length})</button>`)
    .join("");
  $("filtroCarrera").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    filtro = b.dataset.c;
    render();
  });

  renderMuestra();
  render();
})();
