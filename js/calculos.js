const MILISEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;
const NOMBRES_DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/* ---------- Formato y fechas ---------- */

function formatearPrecio(monto) {
  return formatoMoneda.format(monto);
}

function redondearAlCentenar(monto) {
  return Math.round(monto / 100) * 100;
}

function rellenarConCeros(numero) {
  return String(numero).padStart(2, "0");
}

function obtenerFechaLocalISO(fecha) {
  const anio = fecha.getFullYear();
  const mes = rellenarConCeros(fecha.getMonth() + 1);
  const dia = rellenarConCeros(fecha.getDate());
  return `${anio}-${mes}-${dia}`;
}

function convertirISOaFecha(fechaISO) {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

function formatearFechaLarga(fechaISO) {
  const texto = convertirISOaFecha(fechaISO).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatearTelefono(telefono) {
  return `${telefono.slice(0, 4)} ${telefono.slice(4, 6)}-${telefono.slice(6)}`;
}

function generarCodigoPedido() {
  return `PA-${Date.now().toString(36).toUpperCase()}`;
}

function generarIdItem() {
  return `IT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/* ---------- Calendario de entregas ---------- */

function obtenerDiasDeAnticipacion(fechaISO, hoy = new Date()) {
  const inicioDeHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((convertirISOaFecha(fechaISO) - inicioDeHoy) / MILISEGUNDOS_POR_DIA);
}

function obtenerEstadoDia(fechaISO, catalogo, hoy = new Date()) {
  const { reglas } = catalogo.configuracion;
  const diaSemana = convertirISOaFecha(fechaISO).getDay();
  const diasDeAnticipacion = obtenerDiasDeAnticipacion(fechaISO, hoy);

  if (reglas.diasDescanso.includes(diaSemana)) {
    return { disponible: false, urgente: false, motivo: `Los ${NOMBRES_DIAS[diaSemana]}s descansamos` };
  }
  if (diasDeAnticipacion < reglas.diasAnticipacionMinima) {
    return { disponible: false, urgente: false, motivo: "Fecha demasiado próxima" };
  }
  return { disponible: true, urgente: diasDeAnticipacion < reglas.diasAnticipacionNormal, motivo: "" };
}

function obtenerFranjasDelDia(fechaISO, horarios) {
  const diaSemana = convertirISOaFecha(fechaISO).getDay();
  const horario = horarios.find((horarioDelDia) => horarioDelDia.diaSemana === diaSemana);
  return horario ? horario.franjas : [];
}

/* ---------- Figuras de número y letra ---------- */

function obtenerFigurasActivas({ formatoId, formaEspecialId, letras, numeros }) {
  if (formatoId !== "especial" || formaEspecialId !== "figuras") return [];

  const figurasLetras = letras.map((valor) => ({ tipo: "Letra", valor }));
  const figurasNumeros = numeros.map((valor) => ({ tipo: "Número", valor }));
  return [...figurasLetras, ...figurasNumeros];
}

function distribuirPorciones(totalPorciones, cantidadFiguras) {
  if (cantidadFiguras === 0) return [];

  const porcionesBase = Math.floor(totalPorciones / cantidadFiguras);
  const porcionesSobrantes = totalPorciones % cantidadFiguras;

  return Array.from({ length: cantidadFiguras }, (valorVacio, indice) =>
    indice < porcionesSobrantes ? porcionesBase + 1 : porcionesBase
  );
}

function obtenerAlturaFigura(porciones, tamanosFigura) {
  const tramo = tamanosFigura.find(({ porcionesHasta }) => porciones <= porcionesHasta);
  return tramo ? tramo.alturaCm : tamanosFigura[tamanosFigura.length - 1].alturaCm;
}

function calcularFigurasConTamano(configuracion, catalogo) {
  const figuras = obtenerFigurasActivas(configuracion);
  const porcionesPorFigura = distribuirPorciones(configuracion.porciones, figuras.length);

  return figuras.map((figura, indice) => ({
    ...figura,
    porciones: porcionesPorFigura[indice],
    alturaCm: obtenerAlturaFigura(porcionesPorFigura[indice], catalogo.tortas.tamanosFigura),
  }));
}

function calcularPorcionesMinimas(cantidadFiguras, reglas) {
  return cantidadFiguras * reglas.porcionesMinimasPorFigura;
}

/* ---------- Torta: medidas, detalle y precio ---------- */

function buscarPorId(lista, id) {
  return lista.find((elemento) => elemento.id === id);
}

function describirMedidas(configuracion, catalogo) {
  const { porciones: opcionesPorciones, formatos, formasEspeciales } = catalogo.tortas;
  const { formatoId, formaEspecialId, porciones } = configuracion;
  const { diametroCm, rectangularCm } = opcionesPorciones.find(({ cantidad }) => cantidad === porciones);

  if (formatoId === "redonda") return `Redonda de ${diametroCm} cm de diámetro`;
  if (formatoId === "rectangular") return `Rectangular de ${rectangularCm} cm`;

  const forma = buscarPorId(formasEspeciales, formaEspecialId);
  return forma.tipo === "figuras"
    ? buscarPorId(formatos, "especial").nombre
    : `En forma de ${forma.nombre.toLowerCase()}, de unos ${diametroCm} cm de ancho`;
}

function armarNombreTorta(configuracion, catalogo) {
  const { formatos, formasEspeciales } = catalogo.tortas;
  const { formatoId, formaEspecialId, letras, numeros } = configuracion;

  if (formatoId !== "especial") return `Torta ${buscarPorId(formatos, formatoId).nombre.toLowerCase()}`;

  const forma = buscarPorId(formasEspeciales, formaEspecialId);
  if (forma.tipo !== "figuras") return `Torta en forma de ${forma.nombre.toLowerCase()}`;
  if (letras.length > 0 && numeros.length > 0) return "Torta con letras y números";
  return letras.length > 0 ? "Torta con letras" : "Torta con números";
}

function armarDetalleTorta(configuracion, catalogo) {
  const { masas, rellenos, decoraciones } = catalogo.tortas;
  const { porciones, masaId, rellenoId, decoracionId, mensaje } = configuracion;

  const detalle = [`${describirMedidas(configuracion, catalogo)}, ${porciones} porciones`];

  calcularFigurasConTamano(configuracion, catalogo).forEach(({ tipo, valor, porciones: porcionesFigura, alturaCm }) => {
    detalle.push(`${tipo} ${valor}: ${porcionesFigura} porciones, ${alturaCm} cm de alto`);
  });

  detalle.push(`Masa: ${buscarPorId(masas, masaId).nombre}`);
  detalle.push(`Relleno: ${buscarPorId(rellenos, rellenoId).nombre}`);
  detalle.push(`Decoración: ${buscarPorId(decoraciones, decoracionId).nombre}`);

  if (mensaje.trim()) detalle.push(`Mensaje o tema: ${mensaje.trim()}`);
  return detalle;
}

function calcularPrecioDecoracion(decoracion, porciones) {
  return decoracion.precioFijo + decoracion.precioPorPorcion * porciones;
}

function calcularPrecioTorta(configuracion, catalogo) {
  const { precios, formatos, formasEspeciales, masas, rellenos, decoraciones } = catalogo.tortas;
  const { recargoSinGlutenPorcentaje } = catalogo.configuracion.reglas;
  const { porciones, gluten, formatoId, formaEspecialId, masaId, rellenoId, decoracionId } = configuracion;

  const lineas = [];
  const agregarLinea = (concepto, monto) => {
    if (monto > 0) lineas.push({ concepto, monto: redondearAlCentenar(monto) });
  };

  const masa = buscarPorId(masas, masaId);
  const relleno = buscarPorId(rellenos, rellenoId);
  const decoracion = buscarPorId(decoraciones, decoracionId);

  agregarLinea(`Base de la torta, ${porciones} porciones`, precios.armadoBase + precios.porPorcion * porciones);
  agregarLinea(`Masa de ${masa.nombre.toLowerCase()}`, masa.extraPorPorcion * porciones);
  agregarLinea(`Relleno de ${relleno.nombre.toLowerCase()}`, relleno.extraPorPorcion * porciones);

  if (gluten === "sin") {
    const subtotalIngredientes = lineas.reduce((suma, { monto }) => suma + monto, 0);
    agregarLinea(`Elaboración sin gluten (${recargoSinGlutenPorcentaje}%)`, (subtotalIngredientes * recargoSinGlutenPorcentaje) / 100);
  }

  if (formatoId === "especial") {
    const forma = buscarPorId(formasEspeciales, formaEspecialId);
    const cantidadFiguras = obtenerFigurasActivas(configuracion).length;

    if (forma.tipo === "figuras") {
      const textoFiguras = cantidadFiguras === 1 ? "1 figura" : `${cantidadFiguras} figuras`;
      agregarLinea(`Forma de número o letra (${textoFiguras})`, forma.extraPorFigura * cantidadFiguras);
    } else {
      agregarLinea(`Forma de ${forma.nombre.toLowerCase()}`, forma.extra);
    }
  } else {
    const formato = buscarPorId(formatos, formatoId);
    agregarLinea(`Formato ${formato.nombre.toLowerCase()}`, formato.extra);
  }

  agregarLinea(`Decoración ${decoracion.nombre.toLowerCase()}`, calcularPrecioDecoracion(decoracion, porciones));

  const total = lineas.reduce((suma, { monto }) => suma + monto, 0);
  return { lineas, total };
}

/* ---------- Otros productos y totales del pedido ---------- */

function calcularPrecioProducto(producto, gluten, reglas) {
  const multiplicador = gluten === "sin" ? 1 + reglas.recargoSinGlutenPorcentaje / 100 : 1;
  return redondearAlCentenar(producto.precio * multiplicador);
}

function calcularTotalesPedido({ items, fecha, entrega }, catalogo) {
  const { reglas } = catalogo.configuracion;
  const zona = catalogo.entregas.zonasEnvio.find(({ id }) => id === entrega.zonaId);

  const subtotal = items.reduce((suma, { precioUnitario, cantidad }) => suma + precioUnitario * cantidad, 0);
  const esUrgente = Boolean(fecha) && obtenerDiasDeAnticipacion(fecha) < reglas.diasAnticipacionNormal;
  const recargoUrgente = esUrgente ? redondearAlCentenar((subtotal * reglas.recargoUrgentePorcentaje) / 100) : 0;
  const envio = zona ? zona.costo : 0;

  return { subtotal, esUrgente, recargoUrgente, envio, total: subtotal + recargoUrgente + envio };
}

function contarItemsPorGluten(items) {
  return items.reduce(
    (conteo, { gluten, cantidad }) => ({ ...conteo, [gluten]: conteo[gluten] + cantidad }),
    { con: 0, sin: 0 }
  );
}
