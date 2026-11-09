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

## Modos

Todo se maneja desde `js/config.js`, con `MODO`:

- `"local"` (por defecto): no envía nada. Los cupos se simulan en el navegador, al final se muestra el JSON que recibiría la API y abajo aparece un panel para llenar cupos y probar el aviso.
- `"T"`: prueba piloto contra la API de la cátedra. Se guarda con `Modo: "T"` y no cuenta para los cupos reales.
- `"P"`: encuesta real. Es el modo que va en el QR.

Los cupos se controlan con `POST /controlar_cantidades/1`, que cuenta las respuestas por `ID_Grupo`, `Modo`, `Carrera` y `Curso`. Las respuestas en `T` no ocupan cupos de `P`.

## Publicarlo con GitHub Pages

1. En el repositorio, entrá a **Settings → Pages**.
2. En **Source** elegí **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
3. A los pocos minutos queda en `https://<usuario>.github.io/<repositorio>/`. Ese link es el que va en el QR.

## Datos del envío

`POST /guardar_encuesta/1` con los campos de la API. Las respuestas van como enteros según el libro de códigos de `js/config.js` (`CODIGOS`).

```json
{
  "ID_Grupo": 1,
  "Modo": "P",
  "Carrera": "psicopedagogia",
  "Curso": "2",
  "Otra_Carrera": "no",
  "Claridad_Promocion": 3,
  "Claridad_Final": 2,
  "Conoces_Materias_PD": 2,
  "Informacion": ["docente", "companeros"],
  "Cuando_Recibiste_Informacion": 2,
  "S1": 1,
  "S2": 1,
  "S3": 9,
  "Dificultad": 2
}
```

- `Informacion` (P7): el primer elemento es el canal principal (P8). "No me informé por ningún medio" se envía como `[]`.
- `S1`, `S2`, `S3` (P10 a P12): 9 = "No sé". Correctas: S1 = 1, S2 = 2, S3 = 3.
- `Dificultad` (P13): obligatoria, códigos 1 a 6.
