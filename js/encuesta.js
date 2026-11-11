// Recorrido de la encuesta: paso 1 (carrera), paso 2 (año), control de cupo
// y paso 3 (resto del cuestionario).

const $ = (id) => document.getElementById(id);
const marcados = (nombre) =>
  [...document.querySelectorAll(`input[name="${nombre}"]:checked`)].map((i) => i.value);

const form = $("f");
const pregunta = (nombre) => document.querySelector(`fieldset[data-q="${nombre}"]`);

let carrera = null;
let anio = null;

// ---------- Utilidades de pantalla ----------

function mostrar(id, paso) {
  ["p1", "p2", "p3", "full", "done"].forEach((s) => ($(s).hidden = s !== id));
  if (paso) {
    $("plbl").textContent = "Paso " + paso + " de 3";
    [1, 2, 3].forEach((i) => $("s" + i).classList.toggle("on", i <= paso));
  }
  window.scrollTo(0, 0);
}

function limpiarError(fs) {
  fs.classList.remove("err");
  const m = fs.querySelector(".msg");
  if (m) m.remove();
}

function marcarError(fs, texto) {
  fs.classList.add("err");
  if (!fs.querySelector(".msg")) {
    const p = document.createElement("p");
    p.className = "msg";
    p.textContent = texto;
    fs.appendChild(p);
  }
}

function crearOpciones(caja, nombre, tipo, opciones) {
  caja.innerHTML = "";
  opciones.forEach(([valor, texto]) => {
    const id = nombre + "_" + valor;
    const label = document.createElement("label");
    label.className = "opt";
    label.htmlFor = id;
    label.innerHTML = `<input type="${tipo}" id="${id}" name="${nombre}" value="${valor}"><span></span>`;
    label.querySelector("span").textContent = texto;
    caja.appendChild(label);
  });
}

function mezclar(lista) {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function botonOcupado(boton, ocupado) {
  boton.disabled = ocupado;
  boton.dataset.texto = boton.dataset.texto || boton.textContent;
  boton.textContent = ocupado ? "Un momento…" : boton.dataset.texto;
}

// Las opciones de P10 a P12 se muestran en orden aleatorio; "No sé" queda última.
document.querySelectorAll("#f .opts[data-shuffle]").forEach((caja) => {
  const items = [...caja.children];
  const noSe = items.filter((l) => l.querySelector("input").value === "no_sabe");
  mezclar(items.filter((l) => !noSe.includes(l))).concat(noSe).forEach((l) => caja.appendChild(l));
});

document.addEventListener("change", (e) => {
  const fs = e.target.closest("fieldset");
  if (fs) limpiarError(fs);
});

// ---------- Paso 1: carrera ----------

$("next1").addEventListener("click", () => {
  const c = marcados("carrera_referencia")[0];
  if (!c) return marcarError(pregunta("carrera_referencia"), "Elegí tu carrera para seguir.");
  if (c !== carrera) anio = null;
  carrera = c;
  $("chipCarrera2").textContent = CARRERAS[c];

  // P2 muestra solo los años de la carrera elegida.
  const anios = Object.keys(CUPOS[c]);
  crearOpciones($("anios"), "anio_cursada", "radio", anios.map((a) => [a, a + ".° año"]));
  if (anios.length === 1) document.querySelector('input[name="anio_cursada"]').checked = true;
  else if (anio) {
    const previo = document.querySelector(`input[name="anio_cursada"][value="${anio}"]`);
    if (previo) previo.checked = true;
  }
  mostrar("p2", 2);
});

// ---------- Paso 2: año y control de cupo ----------

$("back2").addEventListener("click", () => mostrar("p1", 1));

$("next2").addEventListener("click", async () => {
  const a = marcados("anio_cursada")[0];
  const fs = pregunta("anio_cursada");
  if (!a) return marcarError(fs, "Elegí el año para seguir.");
  anio = a;

  botonOcupado($("next2"), true);
  try {
    if (await cupoCompleto(carrera, anio)) return mostrar("full");
    $("chipCarrera3").textContent = CARRERAS[carrera];
    $("chipAnio3").textContent = anio + ".° año";
    mostrar("p3", 3);
  } catch (err) {
    marcarError(fs, "No pudimos verificar el cupo. Revisá la conexión y volvé a intentar.");
  } finally {
    botonOcupado($("next2"), false);
  }
});

// ---------- Paso 3: cuestionario ----------

// P7: "ninguno" desmarca y bloquea el resto. P8 aparece solo con dos medios o más.
function actualizarCanales(e) {
  const casillas = [...form.querySelectorAll('input[name="canales_informacion"]')];
  const ninguno = casillas.find((c) => c.value === "ninguno");
  if (e && e.target === ninguno && ninguno.checked) casillas.forEach((c) => c !== ninguno && (c.checked = false));
  casillas.forEach((c) => c !== ninguno && (c.disabled = ninguno.checked));

  const elegidos = casillas.filter((c) => c.checked && c !== ninguno);
  const fs = pregunta("canal_principal");
  const previo = marcados("canal_principal")[0];
  fs.hidden = elegidos.length < 2;
  if (elegidos.length >= 2) {
    const opciones = elegidos.map((c) => [c.value, c.nextElementSibling.textContent]);
    crearOpciones($("principal"), "canal_principal", "radio", opciones);
    if (previo && opciones.some(([v]) => v === previo)) {
      form.querySelector(`input[name="canal_principal"][value="${previo}"]`).checked = true;
    }
  }
}

form.addEventListener("change", (e) => {
  if (e.target.name === "canales_informacion") actualizarCanales(e);
});

// Arma el registro con los nombres y códigos de la API.
function armarRegistro() {
  // P7: "ninguno" se envía como lista vacía.
  let medios = marcados("canales_informacion").filter((v) => v !== "ninguno");
  // P8: la API no tiene un campo aparte; el canal principal va primero en la lista.
  if (medios.length >= 2) {
    const principal = marcados("canal_principal")[0];
    medios = [principal, ...medios.filter((v) => v !== principal)];
  }
  const codigo = (tabla, nombre) => CODIGOS[tabla][marcados(nombre)[0]];

  return {
    ID_Grupo: CONFIG.ID_GRUPO,
    Modo: esLocal ? "T" : CONFIG.MODO,
    Carrera: carrera,
    Curso: String(anio),
    Otra_Carrera: marcados("cursa_otra_carrera")[0],
    Claridad_Promocion: codigo("claridad", "claridad_promocion"),
    Claridad_Final: codigo("claridad", "claridad_final"),
    Conoces_Materias_PD: codigo("conoce_materias_promocion", "conoce_materias_promocion"),
    Informacion: medios,
    Cuando_Recibiste_Informacion: codigo("anticipacion_info", "anticipacion_info"),
    S1: codigo("situacion_promocion", "situacion_promocion"),
    S2: codigo("situacion_nota_intermedia", "situacion_nota_intermedia"),
    S3: codigo("situacion_vigencia", "situacion_vigencia"),
    Dificultad: codigo("dificultad_principal", "dificultad_principal"),
  };
}

function mensajeError(err) {
  if (err.status === 429) return "Hubo muchos envíos seguidos. Esperá un minuto y tocá Enviar de nuevo.";
  if (err.status === 422) return "La respuesta no pasó la validación de la API. Avisale a quien te dio el QR.";
  return "No se pudo enviar. Revisá la conexión y tocá Enviar de nuevo.";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const aviso = $("formmsg");

  let primera = null;
  [...form.querySelectorAll("fieldset[data-q]")]
    .filter((fs) => !fs.hidden)
    .forEach((fs) => {
      limpiarError(fs);
      if (fs.hasAttribute("data-req") && marcados(fs.dataset.q).length === 0) {
        marcarError(fs, "Falta responder esta pregunta.");
        primera = primera || fs;
      }
    });
  if (primera) {
    aviso.hidden = false;
    aviso.textContent = "Revisá las preguntas marcadas antes de enviar.";
    primera.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  aviso.hidden = true;

  botonOcupado($("send"), true);
  try {
    // Segunda verificación: el cupo pudo completarse mientras la persona respondía.
    if (await cupoCompleto(carrera, anio)) return mostrar("full");
    const enviado = await enviarRespuesta(armarRegistro());
    if (esLocal) {
      $("json").textContent = JSON.stringify(enviado, null, 2);
      renderPanelCupos();
    }
    mostrar("done");
  } catch (err) {
    aviso.hidden = false;
    aviso.textContent = mensajeError(err);
  } finally {
    botonOcupado($("send"), false);
  }
});

// ---------- Volver a empezar ----------

function reiniciar() {
  form.reset();
  actualizarCanales();
  document
    .querySelectorAll('input[name="carrera_referencia"], input[name="anio_cursada"]')
    .forEach((i) => (i.checked = false));
  carrera = null;
  anio = null;
  mostrar("p1", 1);
}
$("restart1").addEventListener("click", reiniciar);
$("restart2").addEventListener("click", reiniciar);

// ---------- Panel de prueba (solo en modo prueba) ----------

function renderPanelCupos() {
  const conteo = leerConteoPrueba();
  const tbody = $("cupos");
  tbody.innerHTML = "";
  Object.entries(CUPOS).forEach(([c, anios]) =>
    Object.entries(anios).forEach(([a, cupo]) => {
      const n = conteo[claveCupo(c, a)] || 0;
      const tr = document.createElement("tr");
      if (n >= cupo) tr.className = "full";
      tr.innerHTML = `<td>${CARRERAS[c]}</td><td>${a}.°</td><td class="num">${n}</td><td class="num">${cupo}</td><td><button type="button" class="ghost small">Llenar</button></td>`;
      tr.querySelector("button").addEventListener("click", () => {
        conteo[claveCupo(c, a)] = cupo;
        guardarConteoPrueba(conteo);
        renderPanelCupos();
      });
      tbody.appendChild(tr);
    })
  );
}


// En la encuesta real no se ofrece responder de nuevo desde el mismo celular.
if (CONFIG.MODO === "P") $("restart2").hidden = true;

if (esLocal) {
  ["avisoPrueba", "textoPrueba", "json", "lab"].forEach((id) => ($(id).hidden = false));
  $("resetCupos").addEventListener("click", () => {
    guardarConteoPrueba({});
    renderPanelCupos();
  });
  renderPanelCupos();
}

mostrar("p1", 1);
