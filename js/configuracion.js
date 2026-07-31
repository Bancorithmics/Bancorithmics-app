/* ============================================================
   Bancorithmics — Configuración
   Perfil, apariencia, moneda y gestión de los datos guardados.
   ============================================================ */
(function () {
    'use strict';

    var $ = function (id) { return document.getElementById(id); };

    /* ---------- Perfil ---------- */

    function iniciales(nombre) {
        return String(nombre || '?').trim().split(/\s+/).slice(0, 2).map(function (parte) {
            return parte.charAt(0).toUpperCase();
        }).join('');
    }

    function pintarPerfil() {
        var perfil = Store.estado().perfil;

        /* No pisamos lo que el usuario está escribiendo en ese momento */
        if (document.activeElement !== $('input-nombre')) $('input-nombre').value = perfil.nombre;
        if (document.activeElement !== $('input-avatar')) $('input-avatar').value = perfil.avatar || '';

        actualizarPrevia($('input-nombre').value, $('input-avatar').value.trim());
    }

    function actualizarPrevia(nombre, avatar) {
        $('preview-nombre').textContent = nombre || 'Mi cuenta';

        var imagen = $('avatar-img');
        var letras = $('avatar-letras');

        if (avatar) {
            imagen.src = avatar;
            imagen.hidden = false;
            letras.hidden = true;
            imagen.onerror = function () {
                imagen.hidden = true;
                letras.hidden = false;
            };
        } else {
            imagen.hidden = true;
            letras.hidden = false;
        }
        letras.textContent = iniciales(nombre);
    }

    function guardarPerfil() {
        var nombre = $('input-nombre').value.trim();
        if (!nombre) {
            Bank.toast('Escribe un nombre para tu perfil.', 'error');
            $('input-nombre').focus();
            return;
        }
        Store.acciones.actualizarPerfil({ nombre: nombre, avatar: $('input-avatar').value.trim() });
        Bank.toast('Perfil actualizado.', 'exito');
    }

    /* ---------- Apariencia ---------- */

    function pintarApariencia() {
        var perfil = Store.estado().perfil;
        var oscuro = perfil.tema === 'oscuro';

        $('switch-tema').classList.toggle('activo', oscuro);
        $('switch-tema').setAttribute('aria-checked', oscuro ? 'true' : 'false');
        $('select-moneda').value = perfil.moneda || 'COP';
    }

    /* ---------- Datos ---------- */

    function pintarResumenDatos() {
        var estado = Store.estado();
        var peso = Math.round(JSON.stringify(estado).length / 1024);

        $('resumen-datos').textContent = estado.movimientos.length + ' movimientos · ' +
            estado.bolsillos.length + ' bolsillos · ' + (peso || 1) + ' KB';

        $('texto-almacenamiento').textContent = Store.almacenamientoDisponible
            ? 'La información se guarda solo en este navegador (almacenamiento local). Descarga una copia de vez en cuando.'
            : 'Este navegador bloquea el almacenamiento local: los cambios se perderán al recargar la página.';
    }

    function exportar() {
        var contenido = Store.acciones.exportar();
        var hoy = Bank.hoyISO();
        var blob = new Blob([contenido], { type: 'application/json' });
        var enlace = document.createElement('a');

        enlace.href = URL.createObjectURL(blob);
        enlace.download = 'bancorithmics-' + hoy + '.json';
        document.body.appendChild(enlace);
        enlace.click();
        document.body.removeChild(enlace);

        setTimeout(function () { URL.revokeObjectURL(enlace.href); }, 2000);
        Bank.toast('Copia de seguridad descargada.', 'exito');
    }

    function importar(archivo) {
        var lector = new FileReader();

        lector.onload = function () {
            Bank.confirmar({
                titulo: '¿Reemplazar tus datos?',
                mensaje: 'Se sustituirán todos los movimientos, bolsillos y saldos actuales por los del archivo.',
                textoOk: 'Importar',
                peligro: true
            }).then(function (confirmado) {
                if (!confirmado) return;
                try {
                    Store.acciones.importar(lector.result);
                    Bank.toast('Datos importados correctamente.', 'exito');
                } catch (e) {
                    Bank.toast(e.message, 'error');
                }
            });
        };

        lector.onerror = function () {
            Bank.toast('No se pudo leer el archivo.', 'error');
        };

        lector.readAsText(archivo);
    }

    function restablecerDemo() {
        Bank.confirmar({
            titulo: '¿Restablecer los datos de ejemplo?',
            mensaje: 'Se perderán tus movimientos y bolsillos actuales, y volverán los de demostración.',
            textoOk: 'Restablecer',
            peligro: true
        }).then(function (confirmado) {
            if (!confirmado) return;
            Store.acciones.restablecerDemo();
            Bank.toast('Datos de ejemplo restablecidos.', 'exito');
        });
    }

    function borrarTodo() {
        Bank.confirmar({
            titulo: '¿Borrar toda tu información?',
            mensaje: 'Se eliminarán movimientos, bolsillos, colchón y saldos. Esta acción no se puede deshacer. ' +
                'Si quieres conservarlos, descarga primero una copia de seguridad.',
            textoOk: 'Borrar todo',
            peligro: true
        }).then(function (confirmado) {
            if (!confirmado) return;
            Store.acciones.borrarTodo();
            Bank.toast('Todos los datos fueron borrados.', 'exito');
        });
    }

    /* ---------- Eventos ---------- */

    function prepararEventos() {
        $('btn-guardar-perfil').addEventListener('click', guardarPerfil);

        $('input-nombre').addEventListener('input', function () {
            actualizarPrevia(this.value, $('input-avatar').value.trim());
        });
        $('input-nombre').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') guardarPerfil();
        });
        $('input-avatar').addEventListener('change', function () {
            actualizarPrevia($('input-nombre').value, this.value.trim());
        });

        $('switch-tema').addEventListener('click', function () {
            var oscuro = Store.estado().perfil.tema === 'oscuro';
            Store.acciones.actualizarPerfil({ tema: oscuro ? 'claro' : 'oscuro' });
        });

        $('select-moneda').addEventListener('change', function () {
            Store.acciones.actualizarPerfil({ moneda: this.value });
            Bank.toast('Moneda actualizada a ' + this.value + '.', 'exito');
        });

        $('btn-exportar').addEventListener('click', exportar);

        $('btn-importar').addEventListener('click', function () {
            $('archivo-importar').click();
        });

        $('archivo-importar').addEventListener('change', function () {
            if (this.files && this.files[0]) importar(this.files[0]);
            this.value = '';
        });

        $('btn-demo').addEventListener('click', restablecerDemo);
        $('btn-borrar').addEventListener('click', borrarTodo);
    }

    /* ---------- Arranque ---------- */

    function render() {
        pintarPerfil();
        pintarApariencia();
        pintarResumenDatos();
    }

    Bank.alCargar(function () {
        Bank.iniciar();
        prepararEventos();
        render();
        Store.suscribir(render);
    });

})();
