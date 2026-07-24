/* ============================================================
   Bancorithmics — Colchón (fondo de emergencia)
   ============================================================ */
(function () {
    'use strict';

    var $ = function (id) { return document.getElementById(id); };

    /* Un colchón sano cubre entre 3 y 6 meses de gastos */
    var MESES_RECOMENDADOS = 6;

    function promedioEgresos() {
        var serie = Store.sel.serieMensual(6).filter(function (m) { return m.egresos > 0; });
        if (!serie.length) return 0;
        return Math.round(serie.reduce(function (total, m) { return total + m.egresos; }, 0) / serie.length);
    }

    function metaSugerida() {
        return promedioEgresos() * MESES_RECOMENDADOS;
    }

    /* ---------- Vista principal ---------- */

    function pintarTarjeta() {
        var colchon = Store.estado().colchon;
        var avance = Bank.porcentaje(colchon.saldo, colchon.meta);

        Bank.animarNumero($('colchon-saldo'), colchon.saldo);
        $('colchon-meta').textContent = colchon.meta > 0 ? Bank.fmt(colchon.meta) : 'sin definir';
        $('colchon-porcentaje').textContent = colchon.meta > 0 ? avance + '%' : '—';
        $('colchon-barra').style.width = avance + '%';
        $('colchon-barra').className = 'progress-fill ' + (avance >= 100 ? 'fill-green' : 'fill-blue');

        pintarConsejo();
    }

    function pintarConsejo() {
        var colchon = Store.estado().colchon;
        var promedio = promedioEgresos();
        var sugerida = metaSugerida();

        if (promedio === 0) {
            $('texto-consejo').innerHTML = '<b>¿Para qué sirve el colchón?</b> Es el dinero que guardas para ' +
                'imprevistos: una urgencia médica, una reparación o quedarte sin ingresos. Registra tus gastos ' +
                'durante un mes y te sugeriremos cuánto deberías tener aquí.';
            return;
        }

        var meses = colchon.saldo / promedio;
        var mensaje;

        if (meses >= MESES_RECOMENDADOS) {
            mensaje = '<b>¡Excelente!</b> Tu colchón cubre ' + meses.toFixed(1).replace('.', ',') +
                ' meses de gastos (' + Bank.fmt(promedio) + ' al mes en promedio). ' +
                'Ya tienes un fondo sólido: puedes destinar el excedente a tus bolsillos de ahorro.';
        } else if (meses >= 3) {
            mensaje = '<b>Vas por buen camino.</b> Tu colchón cubre ' + meses.toFixed(1).replace('.', ',') +
                ' meses de gastos. Lo ideal es llegar a ' + MESES_RECOMENDADOS + ' meses, es decir ' +
                Bank.fmt(sugerida) + '.';
        } else {
            mensaje = '<b>Tu colchón es bajo.</b> Cubre solo ' + meses.toFixed(1).replace('.', ',') +
                ' meses de gastos. Gastas en promedio ' + Bank.fmt(promedio) + ' al mes, así que apunta a tener ' +
                Bank.fmt(sugerida) + ' guardados.';
        }

        if (colchon.meta !== sugerida && sugerida > 0) {
            mensaje += ' <button class="btn-ghost" id="btn-usar-sugerida" style="padding:2px 6px">Usar ' +
                Bank.fmt(sugerida) + ' como meta</button>';
        }

        $('texto-consejo').innerHTML = mensaje;

        var boton = $('btn-usar-sugerida');
        if (boton) {
            boton.addEventListener('click', function () {
                Store.acciones.actualizarMetaColchon(sugerida);
                Bank.toast('Meta actualizada a ' + Bank.fmt(sugerida) + '.', 'exito');
            });
        }
    }

    function pintarHistorial() {
        var items = Store.sel.historialCuenta('colchon', 12);
        var contenedor = $('historial-colchon');

        if (!items.length) {
            contenedor.innerHTML = Bank.estadoVacio('Sin movimientos todavía',
                'Cuando ingreses o retires dinero del colchón, el historial aparecerá aquí.');
            return;
        }

        contenedor.innerHTML = items.map(function (item) {
            return '<div class="historial-item">' +
                '<div class="historial-info">' +
                '<div class="historial-flecha ' + (item.entra ? 'entra' : 'sale') + '">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
                (item.entra ? '<path d="M12 19V5M5 12l7-7 7 7"/>' : '<path d="M12 5v14M19 12l-7 7-7-7"/>') +
                '</svg></div>' +
                '<div class="historial-texto">' +
                '<span class="historial-concepto">' + Bank.esc(item.concepto) + '</span>' +
                '<span class="historial-fecha">' + Bank.fecha(item.fecha) + '</span>' +
                '</div></div>' +
                '<span class="historial-monto ' + (item.entra ? 'amount-positive' : 'amount-negative') + '">' +
                Bank.fmtSigno(item.monto, item.entra) + '</span>' +
                '</div>';
        }).join('');
    }

    /* ---------- Modal ---------- */

    function abrirOperacion(pestana) {
        cambiarPestana(pestana || 'ingresar');
        refrescarModal();
        Bank.abrirModal('modal-colchon');
    }

    function cambiarPestana(nombre) {
        Array.prototype.forEach.call(document.querySelectorAll('.modal-tab'), function (boton) {
            boton.classList.toggle('active', boton.dataset.tab === nombre);
        });
        Array.prototype.forEach.call(document.querySelectorAll('#modal-colchon .tab-panel'), function (panel) {
            panel.classList.toggle('active', panel.id === 'tab-' + nombre);
        });
        limpiarErrores();
    }

    function refrescarModal() {
        var colchon = Store.estado().colchon;
        var disponible = Store.sel.totales().disponible;
        var falta = Math.max(0, colchon.meta - colchon.saldo);

        $('modal-colchon-saldo').textContent = Bank.fmt(colchon.saldo);
        $('modal-colchon-meta').textContent = colchon.meta > 0
            ? 'Meta: ' + Bank.fmt(colchon.meta) + ' · ' + Bank.porcentaje(colchon.saldo, colchon.meta) + '% completado'
            : 'Sin meta definida';

        $('disponible-ingresar').textContent = Bank.fmt(disponible);
        $('falta-colchon').textContent = colchon.meta > 0 ? Bank.fmt(falta) : '—';
        $('saldo-retirar').textContent = Bank.fmt(colchon.saldo);

        pintarChips('chips-ingresar', 'input-ingresar', disponible, colchon.meta > 0 ? falta : 0);
        pintarChips('chips-retirar', 'input-retirar', colchon.saldo, 0);

        Bank.escribirMonto($('input-meta-colchon'), colchon.meta);

        var sugerida = metaSugerida();
        $('sugerencia-meta').innerHTML = sugerida > 0
            ? 'Sugerencia: ' + Bank.fmt(sugerida) + ' (' + MESES_RECOMENDADOS + ' meses de tus gastos promedio). ' +
              '<button class="btn-ghost" id="btn-aplicar-sugerida" style="padding:2px 6px">Aplicar</button>'
            : 'Registra algunos egresos y te sugeriremos una meta según tus gastos.';

        var boton = $('btn-aplicar-sugerida');
        if (boton) {
            boton.addEventListener('click', function () {
                Bank.escribirMonto($('input-meta-colchon'), sugerida);
            });
        }
    }

    function pintarChips(contenedor, input, maximo, faltante) {
        var opciones = [];
        [50000, 100000, 500000].forEach(function (monto) {
            if (monto <= maximo) opciones.push({ etiqueta: '+' + Bank.fmtCorto(monto), valor: monto });
        });
        if (faltante > 0 && faltante <= maximo) opciones.push({ etiqueta: 'Completar meta', valor: faltante });
        if (maximo > 0) opciones.push({ etiqueta: 'Todo (' + Bank.fmtCorto(maximo) + ')', valor: maximo });

        $(contenedor).innerHTML = opciones.map(function (opcion) {
            return '<button type="button" class="chip-monto" data-valor="' + opcion.valor +
                '" data-destino="' + input + '">' + Bank.esc(opcion.etiqueta) + '</button>';
        }).join('');
    }

    function limpiarErrores() {
        $('error-ingresar').textContent = '';
        $('error-retirar').textContent = '';
    }

    /* ---------- Acciones ---------- */

    function ingresar() {
        var monto = Bank.leerMonto($('input-ingresar'));
        if (!monto) {
            $('error-ingresar').textContent = 'Escribe un monto mayor a cero.';
            return;
        }
        try {
            Store.acciones.transferir('disponible', 'colchon', monto);
            $('input-ingresar').value = '';
            Bank.toast(Bank.fmt(monto) + ' guardados en tu colchón.', 'exito');
        } catch (e) {
            $('error-ingresar').textContent = e.message;
        }
    }

    function retirar() {
        var monto = Bank.leerMonto($('input-retirar'));
        if (!monto) {
            $('error-retirar').textContent = 'Escribe un monto mayor a cero.';
            return;
        }
        try {
            Store.acciones.transferir('colchon', 'disponible', monto);
            $('input-retirar').value = '';
            Bank.toast(Bank.fmt(monto) + ' devueltos a tu saldo disponible.', 'exito');
        } catch (e) {
            $('error-retirar').textContent = e.message;
        }
    }

    function guardarMeta() {
        Store.acciones.actualizarMetaColchon(Bank.leerMonto($('input-meta-colchon')));
        Bank.toast('Meta del colchón actualizada.', 'exito');
        cambiarPestana('ingresar');
    }

    /* ---------- Eventos ---------- */

    function prepararEventos() {
        $('btn-ingresar').addEventListener('click', function () { abrirOperacion('ingresar'); });
        $('btn-retirar').addEventListener('click', function () { abrirOperacion('retirar'); });
        $('btn-meta').addEventListener('click', function () { abrirOperacion('meta'); });

        document.querySelector('.modal-tabs').addEventListener('click', function (evento) {
            var boton = evento.target.closest('[data-tab]');
            if (boton) cambiarPestana(boton.dataset.tab);
        });

        document.addEventListener('click', function (evento) {
            var chip = evento.target.closest('.chip-monto');
            if (!chip) return;
            var destino = $(chip.dataset.destino);
            Bank.escribirMonto(destino, chip.dataset.valor);
            destino.focus();
        });

        $('btn-confirm-ingresar').addEventListener('click', ingresar);
        $('btn-confirm-retirar').addEventListener('click', retirar);
        $('btn-confirm-meta-colchon').addEventListener('click', guardarMeta);

        $('input-ingresar').addEventListener('keydown', function (e) { if (e.key === 'Enter') ingresar(); });
        $('input-retirar').addEventListener('keydown', function (e) { if (e.key === 'Enter') retirar(); });
        $('input-meta-colchon').addEventListener('keydown', function (e) { if (e.key === 'Enter') guardarMeta(); });

        ['input-ingresar', 'input-retirar', 'input-meta-colchon'].forEach(function (id) {
            Bank.mascaraMonto($(id));
        });
    }

    /* ---------- Arranque ---------- */

    function render() {
        pintarTarjeta();
        pintarHistorial();
        if (!$('modal-colchon').hidden) refrescarModal();
    }

    Bank.alCargar(function () {
        Bank.iniciar();
        prepararEventos();
        render();
        Store.suscribir(render);
    });

})();
