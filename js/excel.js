/* ============================================================
   Bancorithmics — Generador de Excel (.xlsx)
   ------------------------------------------------------------
   Arma un archivo .xlsx real (Office Open XML dentro de un .zip)
   escribiendo el XML a mano y empaquetándolo con un ZIP mínimo
   (compresión "stored", sin comprimir). Sin librerías externas.

   Uso:
     BankXLSX.descargar('informe.xlsx', [
       { nombre: 'Resumen', encabezados: ['Concepto', 'Valor'],
         anchos: [24, 16], filas: [['Ingresos', 1500000], ...] }
     ]);
   Los valores numéricos de las filas se escriben como celdas
   numéricas con formato "#,##0"; el resto, como texto.
   ============================================================ */
(function (global) {
    'use strict';

    /* ---------- ZIP mínimo (método "stored", sin compresión) ---------- */

    var TABLA_CRC = (function () {
        var tabla = [];
        for (var n = 0; n < 256; n++) {
            var c = n;
            for (var k = 0; k < 8; k++) {
                c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            }
            tabla[n] = c >>> 0;
        }
        return tabla;
    })();

    function crc32(bytes) {
        var c = 0xFFFFFFFF;
        for (var i = 0; i < bytes.length; i++) {
            c = TABLA_CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
        }
        return (c ^ 0xFFFFFFFF) >>> 0;
    }

    function utf8(texto) {
        return new TextEncoder().encode(texto);
    }

    function u16(valor) {
        return [valor & 0xFF, (valor >>> 8) & 0xFF];
    }

    function u32(valor) {
        return [valor & 0xFF, (valor >>> 8) & 0xFF, (valor >>> 16) & 0xFF, (valor >>> 24) & 0xFF];
    }

    /* Junta los .xml de las "partes" del .xlsx en un .zip sin comprimir */
    function crearZip(archivos) {
        var FECHA_DOS = 0x21, HORA_DOS = 0x00; /* fecha fija: no es relevante para Excel */
        var piezas = [], centrales = [], desplazamiento = 0;

        archivos.forEach(function (archivo) {
            var nombre = utf8(archivo.nombre);
            var datos = utf8(archivo.contenido);
            var suma = crc32(datos);

            var cabeceraLocal = new Uint8Array([].concat(
                u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(HORA_DOS), u16(FECHA_DOS),
                u32(suma), u32(datos.length), u32(datos.length), u16(nombre.length), u16(0)
            ).concat(Array.prototype.slice.call(nombre)));

            piezas.push(cabeceraLocal, datos);

            var cabeceraCentral = new Uint8Array([].concat(
                u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(HORA_DOS), u16(FECHA_DOS),
                u32(suma), u32(datos.length), u32(datos.length), u16(nombre.length), u16(0), u16(0),
                u16(0), u16(0), u32(0), u32(desplazamiento)
            ).concat(Array.prototype.slice.call(nombre)));
            centrales.push(cabeceraCentral);

            desplazamiento += cabeceraLocal.length + datos.length;
        });

        var inicioCentral = desplazamiento;
        var tamanoCentral = centrales.reduce(function (suma, parte) { return suma + parte.length; }, 0);

        var fin = new Uint8Array([].concat(
            u32(0x06054b50), u16(0), u16(0), u16(archivos.length), u16(archivos.length),
            u32(tamanoCentral), u32(inicioCentral), u16(0)
        ));

        return new Blob(piezas.concat(centrales).concat([fin]), {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
    }

    /* ---------- XML del libro ---------- */

    function escXML(texto) {
        return String(texto == null ? '' : texto)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    function nombreHojaValido(nombre, indice) {
        var limpio = String(nombre || ('Hoja' + (indice + 1))).replace(/[:\\/?*\[\]]/g, ' ').trim();
        return (limpio || ('Hoja' + (indice + 1))).slice(0, 31);
    }

    /* 0 -> "A", 25 -> "Z", 26 -> "AA"... */
    function letraColumna(indiceCero) {
        var n = indiceCero + 1, letra = '';
        while (n > 0) {
            var resto = (n - 1) % 26;
            letra = String.fromCharCode(65 + resto) + letra;
            n = Math.floor((n - 1) / 26);
        }
        return letra;
    }

    function celdaXML(valor, ref, esEncabezado) {
        if (typeof valor === 'number' && isFinite(valor)) {
            return '<c r="' + ref + '" s="' + (esEncabezado ? 1 : 2) + '" t="n"><v>' + valor + '</v></c>';
        }
        var texto = escXML(valor == null ? '' : String(valor));
        return '<c r="' + ref + '" s="' + (esEncabezado ? 1 : 0) + '" t="inlineStr"><is><t xml:space="preserve">' + texto + '</t></is></c>';
    }

    function hojaXML(hoja) {
        var todasFilas = [hoja.encabezados || []].concat(hoja.filas || []);

        var filasXML = todasFilas.map(function (fila, indiceFila) {
            var numeroFila = indiceFila + 1;
            var celdas = fila.map(function (valor, indiceCol) {
                return celdaXML(valor, letraColumna(indiceCol) + numeroFila, indiceFila === 0);
            }).join('');
            return '<row r="' + numeroFila + '">' + celdas + '</row>';
        }).join('');

        var cols = '';
        if (hoja.anchos && hoja.anchos.length) {
            cols = '<cols>' + hoja.anchos.map(function (ancho, i) {
                return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + ancho + '" customWidth="1"/>';
            }).join('') + '</cols>';
        }

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
            cols + '<sheetData>' + filasXML + '</sheetData></worksheet>';
    }

    function stylesXML() {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
            '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0"/></numFmts>' +
            '<fonts count="2">' +
            '<font><sz val="11"/><name val="Calibri"/></font>' +
            '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
            '</fonts>' +
            '<fills count="3">' +
            '<fill><patternFill patternType="none"/></fill>' +
            '<fill><patternFill patternType="gray125"/></fill>' +
            '<fill><patternFill patternType="solid"><fgColor rgb="FF16A34A"/><bgColor indexed="64"/></patternFill></fill>' +
            '</fills>' +
            '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
            '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
            '<cellXfs count="3">' +
            '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
            '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
            '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
            '</cellXfs></styleSheet>';
    }

    function workbookXML(hojas) {
        var sheets = hojas.map(function (hoja, i) {
            return '<sheet name="' + escXML(hoja.nombre) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
        }).join('');
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
            '<sheets>' + sheets + '</sheets></workbook>';
    }

    function workbookRelsXML(hojas) {
        var rels = '';
        for (var i = 0; i < hojas.length; i++) {
            rels += '<Relationship Id="rId' + (i + 1) + '" ' +
                'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" ' +
                'Target="worksheets/sheet' + (i + 1) + '.xml"/>';
        }
        rels += '<Relationship Id="rId' + (hojas.length + 1) + '" ' +
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rels + '</Relationships>';
    }

    function contentTypesXML(hojas) {
        var overrides = '';
        for (var i = 0; i < hojas.length; i++) {
            overrides += '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ' +
                'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
        }
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
            '<Default Extension="xml" ContentType="application/xml"/>' +
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
            overrides + '</Types>';
    }

    var ROOT_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>';

    function generarLibro(hojasCrudas) {
        if (!hojasCrudas || !hojasCrudas.length) throw new Error('No hay datos para generar el archivo.');
        var hojas = hojasCrudas.map(function (hoja, i) {
            return { nombre: nombreHojaValido(hoja.nombre, i), encabezados: hoja.encabezados, anchos: hoja.anchos, filas: hoja.filas };
        });

        var archivos = [
            { nombre: '[Content_Types].xml', contenido: contentTypesXML(hojas) },
            { nombre: '_rels/.rels', contenido: ROOT_RELS },
            { nombre: 'xl/workbook.xml', contenido: workbookXML(hojas) },
            { nombre: 'xl/_rels/workbook.xml.rels', contenido: workbookRelsXML(hojas) },
            { nombre: 'xl/styles.xml', contenido: stylesXML() }
        ];
        hojas.forEach(function (hoja, i) {
            archivos.push({ nombre: 'xl/worksheets/sheet' + (i + 1) + '.xml', contenido: hojaXML(hoja) });
        });

        return crearZip(archivos);
    }

    /* ---------- Descarga ---------- */

    function descargar(nombreArchivo, hojas) {
        var blob = generarLibro(hojas);
        var enlace = document.createElement('a');
        enlace.href = URL.createObjectURL(blob);
        enlace.download = nombreArchivo;
        document.body.appendChild(enlace);
        enlace.click();
        document.body.removeChild(enlace);
        setTimeout(function () { URL.revokeObjectURL(enlace.href); }, 2000);
    }

    global.BankXLSX = {
        generarLibro: generarLibro,
        descargar: descargar
    };

})(window);
