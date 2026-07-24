/* ============================================================
   Bancorithmics — Bolsillos
   Crear, editar y eliminar bolsillos; guardar y sacar dinero.
   ============================================================ */
(function () {
    'use strict';

    var $ = function (id) { return document.getElementById(id); };

    var idActual = null;                       /* bolsillo abierto en el modal */
    var seleccionCrear = { color: 'blue', icono: 'ahorro' };
    var seleccionEditar = { color: 'blue', icono: 'ahorro' };

    /* ---------- Cuadrícula ---------- */

    function pintarResumen() {
        var estado = Store.estado();
        var totales = Store.sel.totales();

        Bank.animarNumero($('total-bolsillos'), totales.bolsillos);
        Bank.animarNumero($('saldo-disponible-view'), totales.disponible);

        $('extra-bolsillos').textContent = estado.bolsillos.length +
            (estado.bolsillos.length === 1 ? ' bolsillo activo' : ' bolsillos activos');

        var conMeta = estado.bolsillos.filter(function (b) { return b.meta > 0; });
        var metaTotal = conMeta.reduce(function (suma, b) { return suma + b.meta; }, 0);
        var ahorradoEnMetas = conMeta.reduce(function (suma, b) { return suma + Math.min(b.saldo, b.meta); }, 0);
        var avance = Bank.porcentaje(ahorradoEnMetas, metaTotal);

        $('avance-metas').textContent = metaTotal > 0 ? avance + '%' : '—';
        $('barra-metas').style.width = avance + '%';

        $('subtitulo').textContent = metaTotal > 0
            ? 'Has ahorrado ' + Bank.fmt(ahorradoEnMetas) + ' de ' + Bank.fmt(metaTotal) + ' en metas'
            : 'Organiza tu dinero por categorías';
    }

    function pintarGrid() {
        var bolsillos = Store.estado().bolsillos;
        var grid = $('bolsillos-grid');

        if (!bolsillos.length) {
            grid.innerHTML = '<div class="panel" style="grid-column:1/-1">' +
                Bank.estadoVacio('Todavía no tienes bolsillos',
                    'Los bolsillos separan tu dinero por objetivos: transporte, comida, emergencias, un viaje... ' +
                    'El dinero sale de tu saldo disponible y puedes devolverlo cuando quieras.',
                    'Crear mi primer bolsillo', 'btn-vacio-crear') + '</div>';
            var boton = $('btn-vacio-crear');
            if (boton) boton.addEventListener('click', abrirCrear);
            return;
        }

        grid.innerHTML = bolsillos.map(function (bolsillo) {
            var avance = Bank.porcentaje(bolsillo.saldo, bolsillo.meta);
            var completo = bolsillo.meta > 0 && bolsillo.saldo >= bolsillo.meta;

            return '<button class="bolsillo-card borde-' + bolsillo.color + '" data-id="' + bolsillo.id + '" id="' + bolsillo.id + '">' +
                '<div class="bolsillo-card-header">' +
                '<div class="bolsillo-encabezado-izq">' +
                '<div class="bolsillo-icono icon-' + bolsillo.color + '-bg">' + Bank.iconoSVG(bolsillo.icono) + '</div>' +
                '<span class="bolsillo-title">' + Bank.esc(bolsillo.nombre) + '</span>' +
                '</div>' +
                (completo ? '<span class="bolsillo-insignia">Meta lista</span>' : '') +
                '</div>' +
                '<span class="bolsillo-amount">' + Bank.fmt(bolsillo.saldo) + '</span>' +
                '<div class="progress-bar"><div class="progress-fill fill-' + bolsillo.color +
                '" style="width:' + avance + '%"></div></div>' +
                '<div class="bolsillo-footer">' +
                '<span>' + (bolsillo.meta > 0 ? 'Meta: ' + Bank.fmt(bolsillo.meta) : 'Sin meta definida') + '</span>' +
                '<span>' + (bolsillo.meta > 0 ? avance + '%' : '') + '</span>' +
                '</div></button>';
        }).join('') +
            '<button class="bolsillo-card bolsillo-nuevo" id="btn-card-nuevo">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>' +
            'Nuevo bolsillo</button>';
    }

    /* ---------- Selectores de color e icono ---------- */

    function pintarSelectores(contenedorColor, contenedorIcono, seleccion) {
        $(contenedorColor).innerHTML = Store.COLORES.map(function (color) {
            return '<button type="button" class="opcion-color fill-' + color +
                (color === seleccion.color ? ' activo' : '') + '" data-color="' + color +
                '" aria-label="Color ' + color + '"></button>';
        }).join('');

        $(contenedorIcono).innerHTML = Store.ICONOS.map(function (icono) {
            return '<button type="button" class="opcion-icono' + (icono === seleccion.icono ? ' activo' : '') +
                '" data-icono="' + icono + '" aria-label="Icono ' + icono + '">' + Bank.iconoSVG(icono) + '</button>';
        }).join('');
    }

    function conectarSelectores(contenedorColor, contenedorIcono, seleccion) {
        $(contenedorColor).addEventListener('click', function (evento) {
            var boton = evento.target.closest('[data-color]');
            if (!boton) return;
            seleccion.color = boton.dataset.color;
            Array.prototype.forEach.call(this.children, function (hijo) {
                hijo.classList.toggle('activo', hijo === boton);
            });
        });

        $(contenedorIcono).addEventListener('click', function (evento) {
            var boton = evento.target.closest('[data-icono]');
            if (!boton) return;
            seleccion.icono = boton.dataset.icono;
            Array.prototype.forEach.call(this.children, function (hijo) {
                hijo.classList.toggle('activo', hijo === boton);
            });
        });
    }

    /* ---------- Modal de gestión ---------- */

    function abrirGestion(idBolsillo) {
        var bolsillo = Store.sel.bolsillo(idBolsillo);
        if (!bolsillo) return;

        idActual = idBolsillo;
        cambiarPestana('guardar');
        refrescarModal();
        Bank.abrirModal('modal-transfer');
    }

    function refrescarModal() {
        var bolsillo = Store.sel.bolsillo(idActual);
        if (!bolsillo) {
            Bank.cerrarModal('modal-transfer');
            return;
        }

        var disponible = Store.sel.totales().disponible;
        var falta = Math.max(0, bolsillo.meta - bolsillo.saldo);

        $('modal-pocket-title').textContent = bolsillo.nombre;
        $('modal-pocket-balance').textContent = Bank.fmt(bolsillo.saldo);
        $('modal-pocket-goal').textContent = bolsillo.meta > 0
            ? 'Meta: ' + Bank.fmt(bolsillo.meta) + ' · ' + Bank.porcentaje(bolsillo.saldo, bolsillo.meta) + '% completado'
            : 'Sin meta definida';

        $('disponible-guardar').textContent = Bank.fmt(disponible);
        $('falta-meta').textContent = bolsillo.meta > 0 ? Bank.fmt(falta) : '—';
        $('en-bolsillo-sacar').textContent = Bank.fmt(bolsillo.saldo);

        pintarChips('chips-guardar', 'input-guardar', disponible, bolsillo.meta > 0 ? falta : 0);
        pintarChips('chips-sacar', 'input-sacar', bolsillo.saldo, 0);

        /* Pestaña de edición */
        $('input-nombre-editar').value = bolsillo.nombre;
        Bank.escribirMonto($('input-meta'), bolsillo.meta);
        seleccionEditar.color = bolsillo.color;
        seleccionEditar.icono = bolsillo.icono;
        pintarSelectores('colores-editar', 'iconos-editar', seleccionEditar);

        limpiarErrores();
    }

    /* Atajos: montos frecuentes + "todo" + "completar meta" */
    function pintarChips(contenedor, input, maximo, faltante) {
        var opciones = [];
        [50000, 100000, 200000].forEach(function (monto) {
            if (monto <= maximo) opciones.push({ etiqueta: '+' + Bank.fmtCorto(monto), valor: monto });
        });
        if (faltante > 0 && faltante <= maximo) {
            opciones.push({ etiqueta: 'Completar meta', valor: faltante });
        }
        if (maximo > 0) opciones.push({ etiqueta: 'Todo (' + Bank.fmtCorto(maximo) + ')', valor: maximo });

        $(contenedor).innerHTML = opciones.map(function (opcion) {
            return '<button type="button" class="chip-monto" data-valor="' + opcion.valor + '" data-destino="' +
                input + '">' + Bank.esc(opcion.etiqueta) + '</button>';
        }).join('');
    }

    function cambiarPestana(nombre) {
        Array.prototype.forEach.call(document.querySelectorAll('.modal-tab'), function (boton) {
            boton.classList.toggle('active', boton.dataset.tab === nombre);
        });
        Array.prototype.forEach.call(document.querySelectorAll('#modal-transfer .tab-panel'), function (panel) {
            panel.classList.toggle('active', panel.id === 'tab-' + nombre);
        });
    }

    function limpiarErrores() {
        ['error-guardar', 'error-sacar', 'error-editar', 'error-crear'].forEach(function (id) {
            var elemento = $(id);
            if (elemento) elemento.textContent = '';
        });
    }

    /* ---------- Modal de creación ---------- */

    function abrirCrear() {
        $('input-nombre-nuevo').value = '';
        $('input-meta-nuevo').value = '';
        $('input-inicial-nuevo').value = '';
        $('disponible-crear').textContent = Bank.fmt(Store.sel.totales().disponible);

        seleccionCrear.color = Store.COLORES[Store.estado().bolsillos.length % Store.COLORES.length];
        seleccionCrear.icono = 'ahorro';
        pintarSelectores('colores-crear', 'iconos-crear', seleccionCrear);

        limpiarErrores();
        Bank.abrirModal('modal-crear');
    }

    /* ---------- Acciones ---------- */

    function guardarEnBolsillo() {
        var monto = Bank.leerMonto($('input-guardar'));
        if (!monto) {
            $('error-guardar').textContent = 'Escribe un monto mayor a cero.';
            return;
        }
        try {
            Store.acciones.transferir('disponible', idActual, monto);
            $('input-guardar').value = '';
            Bank.toast(Bank.fmt(monto) + ' guardados en "' + Store.sel.bolsillo(idActual).nombre + '".', 'exito');
        } catch (e) {
            $('error-guardar').textContent = e.message;
        }
    }

    function sacarDeBolsillo() {
        var monto = Bank.leerMonto($('input-sacar'));
        if (!monto) {
            $('error-sacar').textContent = 'Escribe un monto mayor a cero.';
            return;
        }
        try {
            var nombre = Store.sel.bolsillo(idActual).nombre;
            Store.acciones.transferir(idActual, 'disponible', monto);
            $('input-sacar').value = '';
            Bank.toast(Bank.fmt(monto) + ' devueltos de "' + nombre + '" a tu saldo disponible.', 'exito');
        } catch (e) {
            $('error-sacar').textContent = e.message;
        }
    }

    function guardarCambios() {
        try {
            Store.acciones.editarBolsillo(idActual, {
                nombre: $('input-nombre-editar').value,
                meta: Bank.leerMonto($('input-meta')),
                color: seleccionEditar.color,
                icono: seleccionEditar.icono
            });
            Bank.toast('Bolsillo actualizado.', 'exito');
            cambiarPestana('guardar');
        } catch (e) {
            $('error-editar').textContent = e.message;
        }
    }

    function eliminarBolsillo() {
        var bolsillo = Store.sel.bolsillo(idActual);
        if (!bolsillo) return;

        Bank.confirmar({
            titulo: '¿Eliminar "' + bolsillo.nombre + '"?',
            mensaje: bolsillo.saldo > 0
                ? 'Los ' + Bank.fmt(bolsillo.saldo) + ' que tiene guardados volverán a tu saldo disponible.'
                : 'Este bolsillo está vacío y se eliminará por completo.',
            textoOk: 'Eliminar',
            peligro: true
        }).then(function (confirmado) {
            if (!confirmado) return;
            try {
                var devuelto = Store.acciones.eliminarBolsillo(idActual);
                Bank.cerrarModal('modal-transfer');
                Bank.toast(devuelto > 0
                    ? 'Bolsillo eliminado. ' + Bank.fmt(devuelto) + ' volvieron a tu saldo disponible.'
                    : 'Bolsillo eliminado.', 'exito');
            } catch (e) {
                Bank.toast(e.message, 'error');
            }
        });
    }

    function crearBolsillo() {
        try {
            var bolsillo = Store.acciones.crearBolsillo({
                nombre: $('input-nombre-nuevo').value,
                meta: Bank.leerMonto($('input-meta-nuevo')),
                montoInicial: Bank.leerMonto($('input-inicial-nuevo')),
                color: seleccionCrear.color,
                icono: seleccionCrear.icono
            });
            Bank.cerrarModal('modal-crear');
            Bank.toast('Bolsillo "' + bolsillo.nombre + '" creado.', 'exito');
        } catch (e) {
            $('error-crear').textContent = e.message;
        }
    }

    /* ---------- Eventos ---------- */

    function prepararEventos() {
        $('btn-crear-bolsillo').addEventListener('click', abrirCrear);

        $('bolsillos-grid').addEventListener('click', function (evento) {
            if (evento.target.closest('#btn-card-nuevo')) return abrirCrear();
            var tarjeta = evento.target.closest('[data-id]');
            if (tarjeta) abrirGestion(tarjeta.dataset.id);
        });

        document.querySelector('.modal-tabs').addEventListener('click', function (evento) {
            var boton = evento.target.closest('[data-tab]');
            if (boton) {
                cambiarPestana(boton.dataset.tab);
                limpiarErrores();
            }
        });

        /* Atajos de monto */
        document.addEventListener('click', function (evento) {
            var chip = evento.target.closest('.chip-monto');
            if (!chip) return;
            var destino = $(chip.dataset.destino);
            Bank.escribirMonto(destino, chip.dataset.valor);
            destino.focus();
        });

        $('btn-confirm-guardar').addEventListener('click', guardarEnBolsillo);
        $('btn-confirm-sacar').addEventListener('click', sacarDeBolsillo);
        $('btn-confirm-meta').addEventListener('click', guardarCambios);
        $('btn-eliminar-bolsillo').addEventListener('click', eliminarBolsillo);
        $('btn-confirm-crear').addEventListener('click', crearBolsillo);

        /* Enter para confirmar */
        $('input-guardar').addEventListener('keydown', function (e) { if (e.key === 'Enter') guardarEnBolsillo(); });
        $('input-sacar').addEventListener('keydown', function (e) { if (e.key === 'Enter') sacarDeBolsillo(); });
        $('input-nombre-nuevo').addEventListener('keydown', function (e) { if (e.key === 'Enter') crearBolsillo(); });

        ['input-guardar', 'input-sacar', 'input-meta', 'input-meta-nuevo', 'input-inicial-nuevo'].forEach(function (id) {
            Bank.mascaraMonto($(id));
        });

        conectarSelectores('colores-crear', 'iconos-crear', seleccionCrear);
        conectarSelectores('colores-editar', 'iconos-editar', seleccionEditar);
    }

    /* ---------- Arranque ---------- */

    function render() {
        pintarResumen();
        pintarGrid();
        if (idActual && !$('modal-transfer').hidden) refrescarModal();
    }

    Bank.alCargar(function () {
        Bank.iniciar();
        prepararEventos();
        render();
        Store.suscribir(render);

        /* Permite llegar desde el inicio con bolsillos.html#id */
        var ancla = window.location.hash.slice(1);
        if (ancla && Store.sel.bolsillo(ancla)) abrirGestion(ancla);
    });

})();
