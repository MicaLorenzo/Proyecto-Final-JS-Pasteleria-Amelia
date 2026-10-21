const CLAVES_ALMACENAMIENTO = {
  pedidos: "pasteleriaAmelia.pedidos",
  borrador: "pasteleriaAmelia.borrador",
};

const RUTAS_CATALOGO = {
  configuracion: "data/configuracion.json",
  tortas: "data/tortas.json",
  productos: "data/productos.json",
  entregas: "data/entregas.json",
};

/* ---------- Lectura de los archivos JSON ---------- */

async function obtenerJson(ruta) {
  const respuesta = await fetch(ruta);

  if (!respuesta.ok) {
    throw new Error(`No se pudo leer ${ruta} (estado ${respuesta.status})`);
  }

  return respuesta.json();
}

async function cargarCatalogo() {
  const { configuracion, tortas, productos, entregas } = RUTAS_CATALOGO;

  const [datosConfiguracion, datosTortas, datosProductos, datosEntregas] = await Promise.all([
    obtenerJson(configuracion),
    obtenerJson(tortas),
    obtenerJson(productos),
    obtenerJson(entregas),
  ]);

  return {
    configuracion: datosConfiguracion,
    tortas: datosTortas,
    productos: datosProductos,
    entregas: datosEntregas,
  };
}

/* ---------- Almacenamiento en el navegador ---------- */

function leerAlmacenamiento(clave, valorPorDefecto) {
  try {
    const contenido = localStorage.getItem(clave);
    return contenido ? JSON.parse(contenido) : valorPorDefecto;
  } catch (error) {
    return valorPorDefecto;
  }
}

function escribirAlmacenamiento(clave, valor) {
  localStorage.setItem(clave, JSON.stringify(valor));
}

function obtenerPedidos() {
  return leerAlmacenamiento(CLAVES_ALMACENAMIENTO.pedidos, []);
}

function guardarPedido(pedidoNuevo) {
  const pedidos = obtenerPedidos();
  escribirAlmacenamiento(CLAVES_ALMACENAMIENTO.pedidos, [...pedidos, pedidoNuevo]);
}

function modificarPedido(idPedido, cambios) {
  const pedidosActualizados = obtenerPedidos().map((pedido) =>
    pedido.id === idPedido ? { ...pedido, ...cambios } : pedido
  );
  escribirAlmacenamiento(CLAVES_ALMACENAMIENTO.pedidos, pedidosActualizados);
}

function eliminarPedido(idPedido) {
  const pedidosRestantes = obtenerPedidos().filter((pedido) => pedido.id !== idPedido);
  escribirAlmacenamiento(CLAVES_ALMACENAMIENTO.pedidos, pedidosRestantes);
}

function vaciarAlmacenamiento() {
  localStorage.clear();
}

function obtenerBorrador() {
  return leerAlmacenamiento(CLAVES_ALMACENAMIENTO.borrador, null);
}

function guardarBorrador(borrador) {
  escribirAlmacenamiento(CLAVES_ALMACENAMIENTO.borrador, borrador);
}

function borrarBorrador() {
  localStorage.removeItem(CLAVES_ALMACENAMIENTO.borrador);
}
