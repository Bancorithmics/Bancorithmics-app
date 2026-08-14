/* ============================================================
   Bancorithmics — Reportes
   ------------------------------------------------------------
   Gráficas hechas a mano (sin librerías externas):
     · barras agrupadas para la evolución mensual
     · dona para el reparto por categoría

   Los colores salen de las variables --c-* de style.css, que
   fueron validadas para daltonismo y contraste en tema claro y
   oscuro. Además de color, cada dato lleva leyenda, etiqueta y
   una vista de tabla, para no depender solo del color.
   ============================================================ */
(function () {
    'use strict';

    var $ = function (id) { return document.getElementById(id); };

    var periodo = 'actual';   /* 'actual' | 'anterior' | 'todos' | 'YYYY-MM' */
    var tipoCategoria = 'egreso';
    var verTabla = false;

    /* ---------- Utilidades del periodo ---------- */

    function clavePeriodo() {
        if (periodo === 'actual') return Store.sel.claveMes(0);
        if (periodo === 'anterior') return Store.sel.claveMes(-1);
        if (periodo === 'todos') return 'todos';
        return periodo;
    }

    function movimientosDelPeriodo() {
        var clave = clavePeriodo();
        return Store.estado().movimientos.filter(function (mov) {
            return clave === 'todos' || mov.fecha.slice(0, 7) === clave;
        });
    }

    function resumenPeriodo() {
        var ingresos = 0, egresos = 0;
        movimientosDelPeriodo().forEach(function (mov) {
            if (mov.tipo === 'ingreso') ingresos += mov.monto;
            else egresos += mov.monto;
        });
        return { ingresos: ingresos, egresos: egresos, balance: ingresos - egresos };
    }

    function nombrePeriodo() {
        var clave = clavePeriodo();
        return clave === 'todos' ? 'todo el historial' : Bank.nombreMes(clave).toLowerCase();
    }

    /* ---------- Cifras ---------- */

    function pintarCifras() {
        var resumen = resumenPeriodo();

        Bank.animarNumero($('rep-ingresos'), resumen.ingresos);
        Bank.animarNumero($('rep-egresos'), resumen.egresos);
        Bank.animarNumero($('rep-balance'), resumen.balance);

        var etiqueta = 'En ' + nombrePeriodo();
        $('rep-ingresos-sub').textContent = etiqueta;
        $('rep-egresos-sub').textContent = etiqueta;

        $('rep-balance').className = 'summary-amount ' + (resumen.balance >= 0 ? 'texto-verde' : 'texto-rojo');
        $('rep-balance-sub').textContent = resumen.balance >= 0 ? 'Ahorraste dinero' : 'Gastaste más de lo que entró';

        var tasa = resumen.ingresos > 0 ? Math.round((resumen.balance / resumen.ingresos) * 100) : 0;
        $('rep-tasa').textContent = resumen.ingresos > 0 ? tasa + '%' : '—';
        $('rep-tasa-sub').textContent = resumen.ingresos > 0
            ? 'De cada ' + Bank.fmt(100000) + ' guardas ' + Bank.fmt(Math.max(0, tasa) * 1000)
            : 'Sin ingresos registrados';
    }

    /* ---------- Gráfica de barras ---------- */

    function pintarBarras() {
        var serie = Store.sel.serieMensual(6);
        var maximo = serie.reduce(function (mayor, mes) {
            return Math.max(mayor, mes.ingresos, mes.egresos);
        }, 0);

        var claveActual = clavePeriodo();

        $('grafica-meses').innerHTML = serie.map(function (mes) {
            var altoIngreso = maximo > 0 ? (mes.ingresos / maximo) * 100 : 0;
            var altoEgreso = maximo > 0 ? (mes.egresos / maximo) * 100 : 0;
            var destacado = mes.clave === claveActual ? ' destacado' : '';

            return '<div class="barra-mes' + destacado + '" data-clave="' + mes.clave + '">' +
                '<div class="barra-par">' +
                '<div class="barra barra-ingreso" style="height:' + altoIngreso + '%"></div>' +
                '<div class="barra barra-egreso" style="height:' + altoEgreso + '%"></div>' +
                '</div>' +
                '<span class="barra-etiqueta">' + Bank.esc(Bank.nombreMes(mes.clave, true).split(' ')[0]) + '</span>' +
                '</div>';
        }).join('');

        pintarTablaMeses(serie);
    }

    function pintarTablaMeses(serie) {
        $('vista-tabla').innerHTML =
            '<table class="tabla-datos"><thead><tr>' +
            '<th>Mes</th><th>Ingresos</th><th>Egresos</th><th>Balance</th>' +
            '</tr></thead><tbody>' +
            serie.map(function (mes) {
                return '<tr><td>' + Bank.esc(Bank.nombreMes(mes.clave)) + '</td>' +
                    '<td class="amount-positive">' + Bank.fmt(mes.ingresos) + '</td>' +
                    '<td class="amount-negative">' + Bank.fmt(mes.egresos) + '</td>' +
                    '<td class="' + (mes.balance >= 0 ? 'amount-positive' : 'amount-negative') + '">' +
                    Bank.fmt(mes.balance) + '</td></tr>';
            }).join('') +
            '</tbody></table>';
    }

    /* ---------- Dona por categoría ---------- */

    function pintarDona() {
        var clave = clavePeriodo();
        var categorias = Store.sel.porCategoria(tipoCategoria, clave);
        var total = categorias.reduce(function (suma, cat) { return suma + cat.total; }, 0);

        var svg = $('donut').querySelector('svg');
        var radio = 70;
        var circunferencia = 2 * Math.PI * radio;

        $('donut-etiqueta').textContent = tipoCategoria === 'egreso' ? 'Gastado' : 'Recibido';
        $('donut-total').textContent = Bank.fmt(total);

        if (!total) {
            svg.innerHTML = '<circle cx="90" cy="90" r="70" fill="none" stroke="var(--border)" stroke-width="22"/>';
            $('lista-categorias').innerHTML = '<p class="texto-mudo" style="text-align:center;font-size:13px">' +
                'No hay ' + (tipoCategoria === 'egreso' ? 'egresos' : 'ingresos') + ' en ' + Bank.esc(nombrePeriodo()) + '.</p>';
            $('donut-desc').textContent = 'Sin datos para el periodo seleccionado.';
            return;
        }

        var recorrido = 0;
        svg.innerHTML = categorias.map(function (cat) {
            var largo = (cat.total / total) * circunferencia;
            /* 2px de separación entre segmentos contiguos */
            var visible = Math.max(largo - 2, 1);
            var trazo = '<circle class="donut-segmento" cx="90" cy="90" r="' + radio + '" ' +
                'stroke="var(--c-' + cat.color + ')" ' +
                'stroke-dasharray="' + visible + ' ' + (circunferencia - visible) + '" ' +
                'stroke-dashoffset="' + (-recorrido) + '" data-id="' + cat.id + '"></circle>';
            recorrido += largo;
            return trazo;
        }).join('');

        /* Etiquetas directas: cada categoría con su nombre, monto y porcentaje */
        $('lista-categorias').innerHTML = categorias.map(function (cat) {
            var porcentaje = Math.round((cat.total / total) * 100);
            return '<div class="categoria-fila" data-id="' + cat.id + '">' +
                '<div class="categoria-cabecera">' +
                '<span class="categoria-nombre"><i style="background:var(--c-' + cat.color + ')"></i>' +
                Bank.esc(cat.nombre) + '</span>' +
                '<span class="categoria-valor">' + Bank.fmt(cat.total) +
                '<span class="categoria-porcentaje">' + porcentaje + '%</span></span>' +
                '</div>' +
                '<div class="progress-bar"><div class="progress-fill" style="width:' + porcentaje +
                '%;background:var(--c-' + cat.color + ')"></div></div>' +
                '</div>';
        }).join('');

        $('donut-desc').textContent = 'Reparto por categoría: ' + categorias.map(function (cat) {
            return cat.nombre + ' ' + Bank.fmt(cat.total);
        }).join(', ') + '.';
    }

    /* ---------- Mayores movimientos ---------- */

    function pintarMayores() {
        var lista = movimientosDelPeriodo().slice().sort(function (a, b) {
            return b.monto - a.monto;
        }).slice(0, 6);

        if (!lista.length) {
            $('mayores-movimientos').innerHTML = Bank.estadoVacio('Sin movimientos en este periodo',
                'Cambia el periodo o registra nuevos movimientos para ver el reporte.');
            return;
        }

        $('mayores-movimientos').innerHTML = lista.map(function (mov) {
            var categoria = Store.sel.categoria(mov.tipo, mov.categoria);
            var esIngreso = mov.tipo === 'ingreso';
            return '<div class="historial-item">' +
                '<div class="historial-info">' +
                '<div class="historial-flecha ' + (esIngreso ? 'entra' : 'sale') + '">' +
                Bank.iconoCategoria(mov.categoria) + '</div>' +
                '<div class="historial-texto">' +
                '<span class="historial-concepto">' + Bank.esc(mov.concepto) + '</span>' +
                '<span class="historial-fecha">' + Bank.esc(categoria.nombre) + ' · ' + Bank.fecha(mov.fecha) + '</span>' +
                '</div></div>' +
                '<span class="historial-monto ' + (esIngreso ? 'amount-positive' : 'amount-negative') + '">' +
                Bank.fmtSigno(mov.monto, esIngreso) + '</span>' +
                '</div>';
        }).join('');
    }

    /* ---------- Tooltips ---------- */

    function prepararTooltips() {
        var tooltip = $('gr-tooltip');

        function mostrar(html, evento) {
            tooltip.innerHTML = html;
            tooltip.classList.add('visible');
            mover(evento);
        }

        function mover(evento) {
            var ancho = tooltip.offsetWidth;
            var x = Math.min(evento.clientX + 14, window.innerWidth - ancho - 10);
            var y = Math.max(evento.clientY - tooltip.offsetHeight - 12, 8);
            tooltip.style.left = x + 'px';
            tooltip.style.top = y + 'px';
        }

        function ocultar() {
            tooltip.classList.remove('visible');
        }

        /* Barras: se muestra el mes completo */
        $('grafica-meses').addEventListener('mousemove', function (evento) {
            var columna = evento.target.closest('.barra-mes');
            if (!columna) return ocultar();

            var resumen = Store.sel.resumenMes(columna.dataset.clave);
            mostrar('<b>' + Bank.esc(Bank.nombreMes(columna.dataset.clave)) + '</b>' +
                '<div class="fila"><i style="background:var(--c-teal)"></i>Ingresos: ' + Bank.fmt(resumen.ingresos) + '</div>' +
                '<div class="fila"><i style="background:var(--c-red)"></i>Egresos: ' + Bank.fmt(resumen.egresos) + '</div>' +
                '<div class="fila"><i style="background:transparent"></i>Balance: ' + Bank.fmt(resumen.balance) + '</div>',
                evento);
        });
        $('grafica-meses').addEventListener('mouseleave', ocultar);

        /* Dona: se resalta el segmento y se muestra su valor */
        $('donut').addEventListener('mousemove', function (evento) {
            var segmento = evento.target.closest('.donut-segmento');
            if (!segmento) return ocultar();

            var categoria = Store.sel.categoria(tipoCategoria, segmento.dataset.id);
            var categorias = Store.sel.porCategoria(tipoCategoria, clavePeriodo());
            var total = categorias.reduce(function (suma, cat) { return suma + cat.total; }, 0);
            var dato = categorias.filter(function (cat) { return cat.id === segmento.dataset.id; })[0];
            if (!dato) return ocultar();

            mostrar('<b>' + Bank.esc(categoria.nombre) + '</b>' +
                '<div class="fila"><i style="background:var(--c-' + categoria.color + ')"></i>' +
                Bank.fmt(dato.total) + ' · ' + Math.round((dato.total / total) * 100) + '%</div>', evento);
        });
        $('donut').addEventListener('mouseleave', ocultar);
    }

    /* ---------- Informe en Excel ---------- */

    function construirInformeExcel() {
        var resumen = resumenPeriodo();
        var clave = clavePeriodo();
        var tasa = resumen.ingresos > 0 ? Math.round((resumen.balance / resumen.ingresos) * 100) : 0;

        var hojaResumen = {
            nombre: 'Resumen',
            encabezados: ['Concepto', 'Valor'],
            anchos: [26, 20],
            filas: [
                ['Periodo', clave === 'todos' ? 'Todo el historial' : Bank.nombreMes(clave)],
                ['Ingresos', resumen.ingresos],
                ['Egresos', resumen.egresos],
                ['Balance', resumen.balance],
                ['Tasa de ahorro (%)', tasa]
            ]
        };

        var hojaMovimientos = {
            nombre: 'Movimientos',
            encabezados: ['Fecha', 'Concepto', 'Categoría', 'Tipo', 'Cuenta', 'Monto'],
            anchos: [12, 30, 18, 10, 24, 14],
            filas: movimientosDelPeriodo().slice().sort(function (a, b) {
                return a.fecha < b.fecha ? -1 : (a.fecha > b.fecha ? 1 : 0);
            }).map(function (mov) {
                var categoria = Store.sel.categoria(mov.tipo, mov.categoria);
                return [
                    mov.fecha,
                    mov.concepto,
                    categoria.nombre,
                    mov.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
                    Store.sel.nombreCuenta(mov.cuenta),
                    mov.monto
                ];
            })
        };

        var filasCategorias = [];
        ['ingreso', 'egreso'].forEach(function (tipo) {
            Store.sel.porCategoria(tipo, clave).forEach(function (cat) {
                filasCategorias.push([tipo === 'ingreso' ? 'Ingreso' : 'Egreso', cat.nombre, cat.total]);
            });
        });
        var hojaCategorias = {
            nombre: 'Por categoría',
            encabezados: ['Tipo', 'Categoría', 'Total'],
            anchos: [10, 22, 14],
            filas: filasCategorias
        };

        var hojaEvolucion = {
            nombre: 'Evolución mensual',
            encabezados: ['Mes', 'Ingresos', 'Egresos', 'Balance'],
            anchos: [16, 14, 14, 14],
            filas: Store.sel.serieMensual(6).map(function (mes) {
                return [Bank.nombreMes(mes.clave), mes.ingresos, mes.egresos, mes.balance];
            })
        };

        return [hojaResumen, hojaMovimientos, hojaCategorias, hojaEvolucion];
    }

    function descargarInformeExcel() {
        try {
            var nombreArchivo = 'bancorithmics-informe-' + clavePeriodo() + '-' + Bank.hoyISO() + '.xlsx';
            BankXLSX.descargar(nombreArchivo, construirInformeExcel());
            Bank.toast('Informe descargado en Excel.', 'exito');
        } catch (e) {
            Bank.toast('No se pudo generar el informe: ' + e.message, 'error');
        }
    }

    /* ---------- Filtros ---------- */

    function pintarFiltroPeriodo() {
        var meses = {};
        Store.estado().movimientos.forEach(function (mov) { meses[mov.fecha.slice(0, 7)] = true; });
        var claves = Object.keys(meses).sort().reverse().slice(0, 12);

        $('filtro-periodo').innerHTML =
            '<option value="actual">Este mes</option>' +
            '<option value="anterior">Mes pasado</option>' +
            '<option value="todos">Todo el historial</option>' +
            claves.map(function (clave) {
                return '<option value="' + clave + '">' + Bank.esc(Bank.nombreMes(clave)) + '</option>';
            }).join('');
        $('filtro-periodo').value = periodo;
    }

    function prepararEventos() {
        $('filtro-periodo').addEventListener('change', function (evento) {
            periodo = evento.target.value;
            render();
        });

        $('filtro-tipo-categoria').addEventListener('change', function (evento) {
            tipoCategoria = evento.target.value;
            pintarDona();
        });

        $('btn-ver-tabla').addEventListener('click', function () {
            verTabla = !verTabla;
            $('vista-grafica').classList.toggle('oculto', verTabla);
            $('vista-tabla').classList.toggle('oculto', !verTabla);
            this.textContent = verTabla ? 'Ver como gráfica' : 'Ver como tabla';
            this.setAttribute('aria-pressed', verTabla ? 'true' : 'false');
        });

        $('btn-descargar-excel').addEventListener('click', descargarInformeExcel);

        prepararTooltips();
    }

    /* ---------- Arranque ---------- */

    function render() {
        pintarFiltroPeriodo();
        pintarCifras();
        pintarBarras();
        pintarDona();
        pintarMayores();
    }

    Bank.alCargar(function () {
        Bank.iniciar();
        prepararEventos();
        render();
        Store.suscribir(render);
    });

})();
