/* ============================================================
   Bancorithmics — Ingresos y Egresos
   Visualizador de movimientos con filtros, orden y paginación.
   ============================================================ */
(function () {
    'use strict';

    var $ = function (id) { return document.getElementById(id); };
    var POR_PAGINA = 8;

    var filtros = {
        tipo: 'todos',
        texto: '',
        mes: 'todos',
        categoria: 'todas',
        campo: 'fecha',
        direccion: 'desc',
        pagina: 1
    };

    /* ---------- Filtrado y orden ---------- */

    function movimientosVisibles() {
        var texto = filtros.texto.trim().toLowerCase();

        var lista = Store.estado().movimientos.filter(function (mov) {
            if (filtros.tipo !== 'todos' && mov.tipo !== filtros.tipo) return false;
            if (filtros.mes !== 'todos' && mov.fecha.slice(0, 7) !== filtros.mes) return false;
            if (filtros.categoria !== 'todas' && mov.categoria !== filtros.categoria) return false;
            if (texto) {
                var categoria = Store.sel.categoria(mov.tipo, mov.categoria).nombre.toLowerCase();
                if (mov.concepto.toLowerCase().indexOf(texto) === -1 && categoria.indexOf(texto) === -1) return false;
            }
            return true;
        });

        var factor = filtros.direccion === 'asc' ? 1 : -1;
        lista.sort(function (a, b) {
            var izquierda = a[filtros.campo];
            var derecha = b[filtros.campo];
            if (filtros.campo === 'concepto') {
                izquierda = izquierda.toLowerCase();
                derecha = derecha.toLowerCase();
            }
            if (izquierda === derecha) return a.id < b.id ? 1 : -1;
            return (izquierda > derecha ? 1 : -1) * factor;
        });

        return lista;
    }

    /* ---------- Resumen de lo filtrado ---------- */

    function pintarResumen(lista) {
        var ingresos = 0, egresos = 0;
        lista.forEach(function (mov) {
            if (mov.tipo === 'ingreso') ingresos += mov.monto;
            else egresos += mov.monto;
        });

        Bank.animarNumero($('stat-ingresos'), ingresos);
        Bank.animarNumero($('stat-egresos'), egresos);

        var balance = ingresos - egresos;
        Bank.animarNumero($('stat-balance'), balance);
        $('stat-balance').className = 'mini-stat-valor ' + (balance >= 0 ? 'amount-positive' : 'amount-negative');

        var etiqueta = filtros.mes === 'todos' ? 'todo el historial' : Bank.nombreMes(filtros.mes).toLowerCase();
        $('subtitulo').textContent = lista.length + ' movimiento' + (lista.length === 1 ? '' : 's') + ' · ' + etiqueta;
    }

    /* ---------- Tabla ---------- */

    function pintarTabla(lista) {
        var totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
        if (filtros.pagina > totalPaginas) filtros.pagina = totalPaginas;

        var inicio = (filtros.pagina - 1) * POR_PAGINA;
        var pagina = lista.slice(inicio, inicio + POR_PAGINA);

        var cuerpo = $('cuerpo-tabla');
        var vacio = $('sin-resultados');

        if (!lista.length) {
            cuerpo.innerHTML = '';
            var hayDatos = Store.estado().movimientos.length > 0;
            vacio.innerHTML = hayDatos
                ? Bank.estadoVacio('Sin resultados',
                    'Ningún movimiento coincide con los filtros aplicados. Prueba a limpiarlos.',
                    'Limpiar filtros', 'btn-vacio-limpiar')
                : Bank.estadoVacio('Todavía no hay movimientos',
                    'Registra tu primer ingreso o egreso para empezar a llevar el control de tu dinero.',
                    'Registrar movimiento', 'btn-vacio-nuevo');

            var limpiar = $('btn-vacio-limpiar');
            if (limpiar) limpiar.addEventListener('click', limpiarFiltros);
            var nuevo = $('btn-vacio-nuevo');
            if (nuevo) nuevo.addEventListener('click', function () { Bank.formularioMovimiento(); });

            $('paginacion').innerHTML = '';
            return;
        }

        vacio.innerHTML = '';

        cuerpo.innerHTML = pagina.map(function (mov) {
            var categoria = Store.sel.categoria(mov.tipo, mov.categoria);
            var esIngreso = mov.tipo === 'ingreso';
            var cuenta = mov.cuenta !== 'disponible' ? Store.sel.nombreCuenta(mov.cuenta) : '';

            return '<tr data-id="' + mov.id + '">' +
                '<td class="concept">' + Bank.esc(mov.concepto) +
                (cuenta ? '<small>' + Bank.esc(cuenta) + '</small>' : '') + '</td>' +
                '<td><span class="tag tag-' + categoria.color + '">' + Bank.esc(categoria.nombre) + '</span></td>' +
                '<td><span class="pill ' + (esIngreso ? 'pill-income' : 'pill-expense') + '">' +
                (esIngreso ? 'Ingreso' : 'Egreso') + '</span></td>' +
                '<td class="amount ' + (esIngreso ? 'amount-positive' : 'amount-negative') + '">' +
                Bank.fmtSigno(mov.monto, esIngreso) + '</td>' +
                '<td class="date">' + Bank.fecha(mov.fecha) + '</td>' +
                '<td class="celda-acciones">' +
                '<button class="btn-icono" data-accion="editar" aria-label="Editar ' + Bank.esc(mov.concepto) + '">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
                '<button class="btn-icono peligro" data-accion="eliminar" aria-label="Eliminar ' + Bank.esc(mov.concepto) + '">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
                '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg></button>' +
                '</td></tr>';
        }).join('');

        pintarPaginacion(lista.length, totalPaginas, inicio, pagina.length);
    }

    function pintarPaginacion(total, totalPaginas, inicio, mostrados) {
        var contenedor = $('paginacion');

        var info = '<span class="pagination-info">Mostrando ' + (inicio + 1) + '-' + (inicio + mostrados) +
            ' de ' + total + '</span>';

        if (totalPaginas <= 1) {
            contenedor.innerHTML = info;
            return;
        }

        var botones = '';
        var desde = Math.max(1, filtros.pagina - 2);
        var hasta = Math.min(totalPaginas, desde + 4);
        desde = Math.max(1, hasta - 4);

        if (desde > 1) botones += '<button class="page-num" data-pagina="1">1</button>' +
            (desde > 2 ? '<span class="texto-mudo">…</span>' : '');

        for (var i = desde; i <= hasta; i++) {
            botones += '<button class="page-num' + (i === filtros.pagina ? ' page-active' : '') +
                '" data-pagina="' + i + '">' + i + '</button>';
        }

        if (hasta < totalPaginas) botones += (hasta < totalPaginas - 1 ? '<span class="texto-mudo">…</span>' : '') +
            '<button class="page-num" data-pagina="' + totalPaginas + '">' + totalPaginas + '</button>';

        contenedor.innerHTML = info +
            '<button class="page-arrow" data-pagina="' + (filtros.pagina - 1) + '" aria-label="Página anterior"' +
            (filtros.pagina === 1 ? ' disabled' : '') + '>' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg></button>' +
            botones +
            '<button class="page-arrow" data-pagina="' + (filtros.pagina + 1) + '" aria-label="Página siguiente"' +
            (filtros.pagina === totalPaginas ? ' disabled' : '') + '>' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></button>';
    }

    /* ---------- Filtros ---------- */

    function pintarFiltroMeses() {
        var meses = {};
        Store.estado().movimientos.forEach(function (mov) { meses[mov.fecha.slice(0, 7)] = true; });

        var claves = Object.keys(meses).sort().reverse();
        $('filtro-mes').innerHTML = '<option value="todos">Todos los meses</option>' +
            claves.map(function (clave) {
                return '<option value="' + clave + '">' + Bank.esc(Bank.nombreMes(clave)) + '</option>';
            }).join('');
        $('filtro-mes').value = filtros.mes;
        if (!$('filtro-mes').value) {
            filtros.mes = 'todos';
            $('filtro-mes').value = 'todos';
        }
    }

    function pintarFiltroCategorias() {
        var lista = [];
        if (filtros.tipo === 'todos') {
            lista = Store.CATEGORIAS.ingreso.concat(Store.CATEGORIAS.egreso);
        } else {
            lista = Store.CATEGORIAS[filtros.tipo];
        }

        $('filtro-categoria').innerHTML = '<option value="todas">Todas las categorías</option>' +
            lista.map(function (cat) {
                return '<option value="' + cat.id + '">' + Bank.esc(cat.nombre) + '</option>';
            }).join('');

        $('filtro-categoria').value = filtros.categoria;
        if (!$('filtro-categoria').value) {
            filtros.categoria = 'todas';
            $('filtro-categoria').value = 'todas';
        }
    }

    function pintarCabecerasOrden() {
        Array.prototype.forEach.call(document.querySelectorAll('th.orden'), function (th) {
            var flecha = th.querySelector('.flecha');
            if (flecha) flecha.remove();
            if (th.dataset.campo === filtros.campo) {
                var marca = document.createElement('span');
                marca.className = 'flecha';
                marca.textContent = filtros.direccion === 'asc' ? '▲' : '▼';
                th.appendChild(marca);
            }
        });
    }

    function limpiarFiltros() {
        filtros.tipo = 'todos';
        filtros.texto = '';
        filtros.mes = 'todos';
        filtros.categoria = 'todas';
        filtros.pagina = 1;
        $('buscador').value = '';
        marcarPestana();
        render();
    }

    function marcarPestana() {
        Array.prototype.forEach.call($('tabs').children, function (boton) {
            boton.classList.toggle('tab-active', boton.dataset.tipo === filtros.tipo);
        });
    }

    /* ---------- Eventos ---------- */

    function prepararEventos() {
        $('btn-nuevo-movimiento').addEventListener('click', function () {
            Bank.formularioMovimiento({ tipo: filtros.tipo === 'ingreso' ? 'ingreso' : 'egreso' });
        });

        $('tabs').addEventListener('click', function (evento) {
            var boton = evento.target.closest('[data-tipo]');
            if (!boton) return;
            filtros.tipo = boton.dataset.tipo;
            filtros.categoria = 'todas';
            filtros.pagina = 1;
            marcarPestana();
            render();
        });

        var temporizador = null;
        $('buscador').addEventListener('input', function (evento) {
            clearTimeout(temporizador);
            var valor = evento.target.value;
            temporizador = setTimeout(function () {
                filtros.texto = valor;
                filtros.pagina = 1;
                render();
            }, 180);
        });

        $('filtro-mes').addEventListener('change', function (evento) {
            filtros.mes = evento.target.value;
            filtros.pagina = 1;
            render();
        });

        $('filtro-categoria').addEventListener('change', function (evento) {
            filtros.categoria = evento.target.value;
            filtros.pagina = 1;
            render();
        });

        $('btn-limpiar').addEventListener('click', limpiarFiltros);

        document.querySelector('thead').addEventListener('click', function (evento) {
            var th = evento.target.closest('th.orden');
            if (!th) return;
            if (filtros.campo === th.dataset.campo) {
                filtros.direccion = filtros.direccion === 'asc' ? 'desc' : 'asc';
            } else {
                filtros.campo = th.dataset.campo;
                filtros.direccion = th.dataset.campo === 'concepto' ? 'asc' : 'desc';
            }
            render();
        });

        $('cuerpo-tabla').addEventListener('click', function (evento) {
            var fila = evento.target.closest('tr[data-id]');
            if (!fila) return;
            var boton = evento.target.closest('[data-accion]');

            if (boton && boton.dataset.accion === 'eliminar') {
                eliminar(fila.dataset.id);
                return;
            }
            Bank.formularioMovimiento({ id: fila.dataset.id });
        });

        $('paginacion').addEventListener('click', function (evento) {
            var boton = evento.target.closest('[data-pagina]');
            if (!boton || boton.disabled) return;
            filtros.pagina = Number(boton.dataset.pagina);
            render();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    function eliminar(idMovimiento) {
        var movimiento = null;
        Store.estado().movimientos.forEach(function (mov) {
            if (mov.id === idMovimiento) movimiento = mov;
        });
        if (!movimiento) return;

        Bank.confirmar({
            titulo: '¿Eliminar "' + movimiento.concepto + '"?',
            mensaje: 'Se devolverá ' + Bank.fmt(movimiento.monto) + ' a "' +
                Store.sel.nombreCuenta(movimiento.cuenta) + '". Esta acción no se puede deshacer.',
            textoOk: 'Eliminar',
            peligro: true
        }).then(function (confirmado) {
            if (!confirmado) return;
            try {
                Store.acciones.eliminarMovimiento(idMovimiento);
                Bank.toast('Movimiento eliminado.', 'exito');
            } catch (e) {
                Bank.toast(e.message, 'error');
            }
        });
    }

    /* ---------- Arranque ---------- */

    function leerParametros() {
        var parametros = new URLSearchParams(window.location.search);
        var tipo = parametros.get('tipo');
        if (tipo === 'ingreso' || tipo === 'egreso') filtros.tipo = tipo;
        var mes = parametros.get('mes');
        if (mes) filtros.mes = mes;
    }

    function render() {
        pintarFiltroMeses();
        pintarFiltroCategorias();
        pintarCabecerasOrden();
        var lista = movimientosVisibles();
        pintarResumen(lista);
        pintarTabla(lista);
    }

    Bank.alCargar(function () {
        Bank.iniciar();
        leerParametros();
        marcarPestana();
        prepararEventos();
        render();
        Store.suscribir(render);
    });

})();
