# Encuesta de promoción y acreditación

Trabajo final de Estadística y Probabilidades (Instituto Superior IDRA). Mide cuánto conocen y comprenden los estudiantes las condiciones de promoción y acreditación del Régimen Académico Marco.

El proyecto tiene dos páginas: el **formulario** con el que respondieron los estudiantes y el **dashboard** con los resultados. Las dos son páginas estáticas (HTML, CSS y JavaScript), sin paso de compilación, y se conectan con la API de la cátedra.

| Página | Enlace |
| --- | --- |
| Formulario | https://matiasrosa12.github.io/Encuesta-TP-Estadistica-TDS/ |
| Dashboard | https://matiasrosa12.github.io/Encuesta-TP-Estadistica-TDS/dashboard.html |

**Estado:** el relevamiento se cerró el 18/11/2026, por indicación del docente, con 58 respuestas válidas de las 76 previstas. El formulario sigue publicado, pero ya no es necesario responderlo.

## Estructura

```
index.html                          Formulario: las 13 preguntas, en tres pasos
dashboard.html                      Dashboard de resultados
css/estilos.css                     Estilos del formulario (colores y tipografías de IDRA)
css/dashboard.css                   Estilos del dashboard
js/config.js                        Modo, datos de la API, cupos por carrera y año y libro de códigos
js/api.js                           Formulario: envío de respuestas y consulta de cupos
js/encuesta.js                      Formulario: recorrido y validaciones
js/dashboard.js                     Dashboard: carga de datos, cálculos, gráficos y filtro
datos/base_original_2026-11-18.json Base original de las 58 respuestas (sin modificar)
```

`js/config.js` lo usan las dos páginas: los cupos y los datos de la API se definen una sola vez.

## Formulario

### Recorrido

1. **Paso 1:** carrera de referencia (P1).
2. **Paso 2:** año de cursada (P2). Solo aparecen los años de la carrera elegida.
3. **Control de cupo:** si esa carrera y año ya llegaron a su cupo, se muestra un aviso y no se guarda nada.
4. **Paso 3:** resto del cuestionario (P3 a P13). Antes de enviar se vuelve a verificar el cupo.

Validaciones: todas las preguntas son obligatorias; "No me informé por ningún medio" bloquea las demás opciones de P7; P8 aparece solo si se marcaron dos medios o más; las opciones de P10 y P11 salen en orden aleatorio, y las de P12 (fechas) en orden cronológico.

### Modos

Se elige con `MODO` en `js/config.js`:

- `"local"`: no envía nada. Los cupos se simulan en el navegador, al final se muestra el JSON que recibiría la API y abajo aparece un panel para llenar cupos y probar el aviso.
- `"T"`: prueba piloto contra la API de la cátedra. Se guarda con `Modo: "T"` y no ocupa cupos reales.
- `"P"`: encuesta real. Es el modo publicado y el que se usó en el QR.

Los cupos se controlan con `POST /controlar_cantidades/1`, que cuenta las respuestas por `ID_Grupo`, `Modo`, `Carrera` y `Curso`.

### Datos del envío

`POST /guardar_encuesta/1` con los campos de la API. Las respuestas van como enteros, según el libro de códigos de `js/config.js` (`CODIGOS`).

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
- `Dificultad` (P13): códigos 1 a 6.

## Dashboard

Lee las respuestas reales en vivo con `GET /ver_resultados/1?ID_Grupo=1&Modo=P`. Si la API no responde, usa la base guardada en `datos/` y lo avisa arriba de todo, así que se puede mostrar sin conexión con la API.

Contenido:

- Ficha del estudio: objetivo, población, muestreo, período y respuestas obtenidas.
- Indicadores principales y muestra prevista y lograda por carrera y año.
- Conocimiento declarado (P4 a P6), comprensión comprobada (P10 a P12 y puntaje de 0 a 3) y cómo se informan (P7 a P9 y P13).
- Dos cruces interpretados: carrera × claridad sobre promoción, y claridad declarada × puntaje de comprensión.
- Conclusiones, limitaciones y recomendaciones.

Criterios de cálculo:

- Cada gráfico indica su base (n de respuestas válidas) y tiene su tabla de frecuencias absolutas y relativas.
- **Filtro por carrera:** actualiza todos los gráficos, tablas y la cantidad de casos. Con una carrera elegida, el cruce 1 pasa a mostrarse por año.
- Las escalas ordinales se resumen con mediana, moda y cuartiles; el puntaje de comprensión, con media, mediana y desvío.
- "No sé" se informa aparte de las respuestas incorrectas.
- En P7 los porcentajes suman más de 100 %, porque se puede marcar más de un medio.
- No se muestran resultados ni filas de un cruce con menos de 5 respuestas, para que nadie pueda ser identificado.

Usa [Chart.js](https://www.chartjs.org/) 4.4.1 desde cdnjs.

## Base de datos

`datos/base_original_2026-11-18.json` guarda las 58 respuestas en Modo P (IDs 10 a 67) tal como las devolvió la API al cierre del relevamiento. No se modifica: cualquier limpieza o cálculo se hace sobre una copia. No tiene faltantes ni valores fuera de rango; los IDs 30 y 31 son idénticos y se conservan como posible duplicado.

## Probarlo en la compu

Levantá un servidor local en la carpeta del proyecto:

```
python3 -m http.server 8000
```

y entrá a http://localhost:8000 (formulario) o http://localhost:8000/dashboard.html (dashboard). El dashboard necesita el servidor: abierto con doble clic, el navegador no deja leer la base de respaldo.

## Publicarlo con GitHub Pages

1. En el repositorio, entrá a **Settings → Pages**.
2. En **Source** elegí **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
3. A los pocos minutos queda publicado en `https://<usuario>.github.io/<repositorio>/`.
