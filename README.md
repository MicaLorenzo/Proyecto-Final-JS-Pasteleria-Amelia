# Pastelería Amelia

Simulador de pedidos de una pastelería. Se puede pedir tortas con gluten y sin gluten, y otras opciones de pastelería. Cada tipo de pedido tiene su propio apartado. El pedido se completa eligiendo fecha, retiro o envío y datos de contacto.

link de GitHub Pages: https://micalorenzo.github.io/Proyecto-Final-JS-Pasteleria-Amelia/

Contacto: Micaela Lorenzo, teléfono 2284 58-1294.

## Cómo probarlo

`fetch` no funciona si el `index.html` se abre con doble clic (protocolo `file://`). Hay que usar un servidor local:

1. Abrir la carpeta en VS Code.
2. Instalar la extensión **Live Server**.
3. Clic derecho sobre `index.html` y elegir **Open with Live Server**.

También funciona publicado en GitHub Pages. Se necesita internet para cargar SweetAlert2, Toastify y las tipografías.

## Apartados

| Ruta | Contenido |
| --- | --- |
| `#/` | Inicio: elegir qué pedir |
| `#/tortas/con-gluten` | Configurador de tortas con gluten |
| `#/tortas/sin-gluten` | Configurador de tortas sin gluten |
| `#/otras-opciones` | Otros productos, con o sin gluten |
| `#/pedido` | Pedido en curso, calendario, envío y datos |
| `#/mis-pedidos` | Pedidos confirmados: modificar, cancelar o vaciar |

## Estructura

```
index.html
assets/img/        logo, portada, categorías, iconos/, decoraciones/ y productos/
css/styles.css     estilos propios
data/              configuracion.json, tortas.json, productos.json, entregas.json
js/datos.js        fetch de los JSON y operaciones de localStorage
js/calculos.js     precios, porciones por figura, calendario y recargos
js/app.js          apartados, DOM y eventos
```

## Cómo cambiar precios y reglas

Todo está en `data/`, sin tocar el código:

- `configuracion.json`: días de anticipación (7), recargo urgente (40%), recargo sin gluten (30%), día de descanso, máximo de letras y números (3).
- `tortas.json`: precio base, porciones y medidas, formatos y cargos extra, formas especiales, decoraciones, masas y rellenos.
- `productos.json`: otras opciones de pastelería.
- `entregas.json`: zonas y costo de envío, y horarios de entrega por día (el sábado llega hasta las 20:00).

El teléfono de contacto está en `index.html` (pie de página) y en `data/configuracion.json`.

## Imágenes

Las imágenes actuales son de referencia y muestran su medida. Para reemplazarlas hay que guardar la foto con el mismo nombre y en formato `.jpg`.

| Archivos | Medida | Proporción |
| --- | --- | --- |
| `assets/img/portada.jpg` | 1000 x 1250 px | 4:5 vertical |
| `assets/img/categoria-*.jpg` y `assets/img/productos/*.jpg` | 800 x 600 px | 4:3 horizontal |
| `assets/img/decoraciones/*.jpg` | 400 x 400 px | 1:1 cuadrada |

## Requisitos de la consigna

| Requisito | Dónde se cumple |
| --- | --- |
| DOM sin diálogos nativos | Toda la interfaz se arma con `crearElemento` en `app.js` |
| Arrays de objetos en `.json` con `fetch` | `data/*.json`, leídos en `datos.js` |
| Funciones de orden superior | `map`, `filter`, `reduce`, `find`, `some`, `forEach` y `sort` |
| Storage: guardar, modificar, borrar y vaciar | `guardarPedido`, `modificarPedido`, `eliminarPedido` y `vaciarAlmacenamiento` en `datos.js` |
| Ternario, OR y destructuring | En todo `app.js` y `calculos.js` |
| `async`/`await`, `try`/`catch`/`finally` | `iniciarAplicacion` en `app.js`, con panel de error y botón para reintentar |
| Librerías externas | SweetAlert2 (alertas y confirmaciones) y Toastify (avisos) |
