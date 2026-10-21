# Pastelería Amelia

Creé un simulador de pedidos para mi propia pastelería, la idea es poder realizar pedidos completamente personalizados desde el e-commerce. Hay dos secciones principales, con y sin gluten, tanto en tortas como en “otras opciones”, en donde tenés botones para elegir una u otra; en cuanto a las tortas, una vez elegida la opción con o sin gluten, te deriva a la personalización: forma, sabor de masa, relleno, cantidad de porciones y decoración. Se confirma el pedido cuando el cliente ingresa los datos y elige si quiere retirar en el local o si prefiere que sea un envío a domicilio, el cual también tiene un cargo extra.

Para la fecha de entrega hay un calendario que respeta ciertas reglas: hay que pedir con al menos 7 días de anticipación, o se cobra un recargo si es antes, y los domingos no se entrega. Además, los pedidos quedan guardados, así que el cliente puede volver a verlos después, modificarlos o cancelarlos.

El enfoque principal fue que sea intuitivo y fácil para el cliente utilizarlo, reducir el tiempo de atención al cliente, aunque te da mi teléfono para poder contactarme en caso de ser necesario, y que en todo momento el cliente pueda saber los costos de cada producto.

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
