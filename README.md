# Encuesta de promoción y acreditación

Formulario del trabajo final de Estadística y Probabilidades (Instituto Superior IDRA). Mide cuánto conocen y comprenden los estudiantes las condiciones de promoción y acreditación del Régimen Académico Marco.

Es una página estática: HTML, CSS y JavaScript, sin dependencias ni paso de compilación.

## Estructura

```
index.html        Las 13 preguntas, en tres pasos
css/estilos.css   Estilos (colores y tipografías en el estilo de IDRA)
js/config.js      Modo, datos de la API y cupos por carrera y año
js/api.js         Envío de respuestas y consulta de cupos
js/encuesta.js    Recorrido de la encuesta y validaciones
```

## Recorrido

1. **Paso 1:** carrera de referencia (P1).
2. **Paso 2:** año de cursada (P2). Solo aparecen los años de la carrera elegida.
3. **Control de cupo:** si esa carrera y año ya llegaron a su cupo, se muestra un aviso y no se guarda nada.
4. **Paso 3:** resto del cuestionario (P3 a P13). Antes de enviar se vuelve a verificar el cupo.

Validaciones: preguntas obligatorias, "No me informé por ningún medio" bloquea las demás opciones de P7, P8 aparece solo si se marcaron dos medios o más, y las opciones de P10 a P12 salen en orden aleatorio.

## Probarlo en la compu

Abrí `index.html` con el navegador, o levantá un servidor local:

```
python3 -m http.server 8000
```

y entrá a http://localhost:8000.

## Modo prueba y modo real

Todo se maneja desde `js/config.js`:

- `MODO: "prueba"` (por defecto): no envía nada. Los cupos se simulan en el navegador, al final se muestra el JSON que recibiría la API y abajo aparece un panel para llenar cupos y probar el aviso.
- `MODO: "real"`: envía cada respuesta con un POST a `API_URL`, con el `TOKEN` del equipo y `VERSION_FORMULARIO`.

Para el control de cupos en modo real, `CONTEO_URL` tiene que devolver `{"cantidad": N}` para `?carrera=...&anio=...`. Si queda vacío, no se controlan cupos.

`config.js` es público: cualquiera que abra la página puede verlo. El token de envío puede ir ahí, pero el acceso de lectura de la API no.

## Publicarlo con GitHub Pages

1. En el repositorio, entrá a **Settings → Pages**.
2. En **Source** elegí **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
3. A los pocos minutos queda en `https://<usuario>.github.io/<repositorio>/`. Ese link es el que va en el QR.

## Datos del envío

```json
{
  "token": "TOKEN_DEL_EQUIPO",
  "version_formulario": 1,
  "respuestas": {
    "carrera_referencia": "psicopedagogia",
    "anio_cursada": "2",
    "cursa_otra_carrera": "no",
    "claridad_promocion": "algo",
    "claridad_final": "poco",
    "conoce_materias_promocion": "algunas",
    "canales_informacion": ["docente", "companeros"],
    "canal_principal": "docente",
    "anticipacion_info": "primeras_2_semanas",
    "situacion_promocion": "sin_final",
    "situacion_nota_intermedia": "promociona",
    "situacion_vigencia": "no_sabe",
    "dificultad_principal": null
  }
}
```

Los códigos de cada campo están en el diccionario de datos de la Entrega 1.
