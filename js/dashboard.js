/* ============================================================
   Bancorithmics — Página de inicio
   ============================================================ */
(function () {
    'use strict';

    var $ = function (id) { return document.getElementById(id); };

    /* ---------- Saludo ---------- */

    function pintarSaludo() {
        var hora = new Date().getHours();
        var momento = hora < 12 ? 'Buenos días' : (hora < 19 ? 'Buenas tardes' : 'Buenas noches');
        var nombre = Store.estado().perfil.nombre.split(' ')[0];
        $('saludo').textContent = momento + ', ' + nombre + '. Este es el resumen de tus finanzas.';
    }

    /* ---------- Tarjetas de resumen ---------- */

    function comparar(actual, anterior) {
        if (!anterior) return null;
        return Math.round(((actual - anterior) / anterior) * 100);
    }

    function textoComparativo(variacion, subeEsBueno) {
        if (variacion === null || variacion === 0) return { texto: 'Sin cambios frente al mes pasado', clase: '' };
        var sube = variacion > 0;
        var bueno = sube === subeEsBueno;
        return {
            texto: (sube ? '▲ ' : '▼ ') + Math.abs(variacion) + '% vs. mes pasado',
            clase: bueno ? 'positivo' : 'negativo'
        };
    }

    function pintarResumen() {
        var totales = Store.sel.totales();
        var mes = Store.sel.resumenMes(Store.sel.claveMes(0));
        var mesAnterior = Store.sel.resumenMes(Store.sel.claveMes(-1));

        Bank.animarNumero($('dato-disponible'), totales.disponible);
        Bank.animarNumero($('dato-colchon'), totales.colchon);
        Bank.animarNumero($('dato-ingresos'), mes.ingresos);
        Bank.animarNumero($('dato-egresos'), mes.egresos);
        Bank.animarNumero($('dato-patrimonio'), totales.patrimonio);

        /* Cuántos meses de gastos cubre el colchón */
        var gastoPromedio = promedioEgresos();
        var meses = gastoPromedio > 0 ? (totales.colchon / gastoPromedio) : 0;
        $('sub-colchon').textContent = gastoPromedio > 0
            ? 'Cubre ' + meses.toFixed(1).replace('.', ',') + ' meses de gastos'
            : 'Fondo de emergencia';

        var libre = totales.patrimonio > 0 ? Bank.porcentaje(totales.disponible, totales.patrimonio) : 0;
        $('sub-disponible').textContent = libre + '% de tu patrimonio sin asignar';

        var varIngresos = textoComparativo(comparar(mes.ingresos, mesAnterior.ingresos), true);
        $('sub-ingresos').textContent = varIngresos.texto;
        $('sub-ingresos').className = 'summary-sub ' + varIngresos.clase;

        var varEgresos = textoComparativo(comparar(mes.egresos, mesAnterior.egresos), false);
        $('sub-egresos').textContent = varEgresos.texto;
        $('sub-egresos').className = 'summary-sub ' + varEgresos.clase;
    }

    function promedioEgresos() {
        var serie = Store.sel.serieMensual(6).filter(function (m) { return m.egresos > 0; });
        if (!serie.length) return 0;
        var suma = serie.reduce(function (total, m) { return total + m.egresos; }, 0);
        return suma / serie.length;
    }

    /* ---------- Barra de patrimonio ---------- */

    function pintarPatrimonio() {
        var totales = Store.sel.totales();
        var partes = [
            { nombre: 'Disponible', valor: totales.disponible, clase: 'fill-green' },
            { nombre: 'Colchón', valor: totales.colchon, clase: 'fill-blue' },
            { nombre: 'Bolsillos', valor: totales.bolsillos, clase: 'fill-purple' }
        ];

        var total = totales.patrimonio;
        $('patrimonio-barra').innerHTML = total > 0
            ? partes.map(function (parte) {
                var ancho = (parte.valor / total) * 100;
                if (ancho <= 0) return '';
                return '<div class="patrimonio-segmento ' + parte.clase + '" style="width:' + ancho + '%" ' +
                    'title="' + Bank.esc(parte.nombre) + ': ' + Bank.fmt(parte.valor) + '"></div>';
            }).join('')
            : '<div class="patrimonio-segmento fill-gray" style="width:100%"></div>';

        $('patrimonio-leyenda').innerHTML = partes.map(function (parte) {
            return '<span class="leyenda-item"><i class="' + parte.clase + '"></i>' +
                Bank.esc(parte.nombre) + ' <b>' + Bank.fmt(parte.valor) + '</b></span>';
        }).join('');
    }

    /* ---------- Movimientos recientes ---------- */

    function pintarMovimientos() {
        var lista = Store.sel.movimientosOrdenados().slice(0, 5);
        var contenedor = $('lista-movimientos');

        if (!lista.length) {
            contenedor.innerHTML = Bank.estadoVacio(
                'Aún no hay movimientos',
                'Registra tu primer ingreso o egreso para empezar a llevar el control de tu dinero.',
                'Registrar movimiento', 'btn-vacio-movimiento');
            var boton = $('btn-vacio-movimiento');
            if (boton) boton.addEventListener('click', function () { Bank.formularioMovimiento(); });
            return;
        }

        contenedor.innerHTML = lista.map(function (mov) {
            var categoria = Store.sel.categoria(mov.tipo, mov.categoria);
            var esIngreso = mov.tipo === 'ingreso';
            return '<button class="movement-item" data-id="' + mov.id + '">' +
                '<div class="movement-left">' +
                '<div class="movement-icon icon-' + categoria.color + '-bg">' + Bank.iconoCategoria(mov.categoria) + '</div>' +
                '<div class="movement-info">' +
                '<span class="movement-name">' + Bank.esc(mov.concepto) + '</span>' +
                '<span class="movement-type">' + (esIngreso ? 'Ingreso' : 'Egreso') + ' · ' + Bank.esc(categoria.nombre) + '</span>' +
                '</div></div>' +
                '<div class="movement-right">' +
                '<span class="movement-amount ' + (esIngreso ? 'positive' : 'negative') + '">' +
                Bank.fmtSigno(mov.monto, esIngreso) + '</span>' +
                '<span class="movement-date">' + Bank.fecha(mov.fecha, 'corto') + '</span>' +
                '</div></button>';
        }).join('');
    }

    /* ---------- Bolsillos ---------- */

    function pintarBolsillos() {
        var bolsillos = Store.estado().bolsillos.slice().sort(function (a, b) { return b.saldo - a.saldo; }).slice(0, 5);
        var contenedor = $('lista-bolsillos');

        if (!bolsillos.length) {
            contenedor.innerHTML = Bank.estadoVacio(
                'Sin bolsillos todavía',
                'Los bolsillos te ayudan a separar tu dinero por categorías: transporte, comida, ahorros...',
                'Crear bolsillo', 'btn-vacio-bolsillo');
            var boton = $('btn-vacio-bolsillo');
            if (boton) boton.addEventListener('click', function () { window.location.href = 'bolsillos.html'; });
            return;
        }

        contenedor.innerHTML = bolsillos.map(function (bolsillo) {
            var avance = Bank.porcentaje(bolsillo.saldo, bolsillo.meta);
            return '<a class="pocket-item" href="bolsillos.html#' + bolsillo.id + '">' +
                '<div class="pocket-row">' +
                '<div class="pocket-left">' +
                '<div class="pocket-icon icon-' + bolsillo.color + '-bg">' + Bank.iconoSVG(bolsillo.icono) + '</div>' +
                '<span class="pocket-name">' + Bank.esc(bolsillo.nombre) + '</span>' +
                '</div>' +
                '<span class="pocket-amount">' + Bank.fmt(bolsillo.saldo) + '</span>' +
                '</div>' +
                '<div class="progress-bar"><div class="progress-fill fill-' + bolsillo.color +
                '" style="width:' + (bolsillo.meta > 0 ? avance : 0) + '%"></div></div>' +
                '</a>';
        }).join('');
    }

    /* ---------- Avisos ---------- */

    function calcularAvisos() {
        var avisos = [];
        var estado = Store.estado();
        var totales = Store.sel.totales();
        var mes = Store.sel.resumenMes(Store.sel.claveMes(0));

        if (mes.egresos > mes.ingresos && mes.ingresos > 0) {
            avisos.push({
                tipo: 'alerta',
                texto: 'Este mes gastaste ' + Bank.fmt(mes.egresos - mes.ingresos) + ' más de lo que ingresaste.'
            });
        }

        var gastoPromedio = promedioEgresos();
        if (gastoPromedio > 0 && totales.colchon < gastoPromedio * 3) {
            avisos.push({
                tipo: 'alerta',
                texto: 'Tu colchón cubre menos de 3 meses de gastos. Se recomienda tener entre 3 y 6.'
            });
        }

        estado.bolsillos.forEach(function (bolsillo) {
            if (bolsillo.meta > 0 && bolsillo.saldo >= bolsillo.meta) {
                avisos.push({ tipo: 'logro', texto: '¡Alcanzaste la meta del bolsillo "' + bolsillo.nombre + '"!' });
            }
        });

        if (totales.disponible === 0 && totales.patrimonio > 0) {
            avisos.push({ tipo: 'info', texto: 'No tienes saldo disponible: todo tu dinero está asignado.' });
        }

        if (!estado.movimientos.length) {
            avisos.push({ tipo: 'info', texto: 'Registra tu primer movimiento para ver reportes y estadísticas.' });
        }

        return avisos;
    }

    var ICONO_AVISO = {
        alerta: '<path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>',
        logro: '<path d="M20 6L9 17l-5-5"/>',
        info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'
    };

    function pintarAvisos() {
        var avisos = calcularAvisos();
        var lista = $('avisos-lista');

        $('punto-avisos').classList.toggle('oculto', !avisos.some(function (a) { return a.tipo === 'alerta'; }));

        lista.innerHTML = avisos.length
            ? avisos.map(function (aviso) {
                return '<div class="aviso aviso-' + aviso.tipo + '">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                    ICONO_AVISO[aviso.tipo] + '</svg>' +
                    '<span>' + Bank.esc(aviso.texto) + '</span></div>';
            }).join('')
            : '<div class="aviso aviso-logro"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg><span>Todo en orden. ¡Buen trabajo!</span></div>';
    }

    /* ---------- Eventos ---------- */

    function prepararEventos() {
        $('btn-nuevo-movimiento').addEventListener('click', function () {
            Bank.formularioMovimiento();
        });

        $('lista-movimientos').addEventListener('click', function (evento) {
            var item = evento.target.closest('[data-id]');
            if (item) Bank.formularioMovimiento({ id: item.dataset.id });
        });

        /* Panel de avisos */
        var panel = $('avisos-panel');
        var boton = $('btn-avisos');

        boton.addEventListener('click', function (evento) {
            evento.stopPropagation();
            var abierto = !panel.hidden;
            panel.hidden = abierto;
            boton.setAttribute('aria-expanded', abierto ? 'false' : 'true');
        });

        document.addEventListener('click', function (evento) {
            if (!panel.hidden && !panel.contains(evento.target)) {
                panel.hidden = true;
                boton.setAttribute('aria-expanded', 'false');
            }
        });

        /* Tema claro / oscuro */
        $('btn-tema').addEventListener('click', function () {
            var actual = Store.estado().perfil.tema;
            Store.acciones.actualizarPerfil({ tema: actual === 'oscuro' ? 'claro' : 'oscuro' });
        });
    }

    function actualizarIconoTema() {
        var oscuro = Store.estado().perfil.tema === 'oscuro';
        $('btn-tema').innerHTML = oscuro
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';
        $('btn-tema').setAttribute('aria-label', oscuro ? 'Activar tema claro' : 'Activar tema oscuro');
    }

    /* ---------- Arranque ---------- */

    function render() {
        pintarSaludo();
        pintarResumen();
        pintarPatrimonio();
        pintarMovimientos();
        pintarBolsillos();
        pintarAvisos();
        actualizarIconoTema();
    }

    Bank.alCargar(function () {
        Bank.iniciar();
        prepararEventos();
        render();
        Store.suscribir(render);
    });

})();
