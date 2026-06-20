// app.js

document.addEventListener('DOMContentLoaded', () => {
    const pesoInput = document.getElementById('peso');
    const tableBody = document.getElementById('table-body');
    const btnAddRow = document.getElementById('btn-add-row');

    // Medicamentos preconfigurados (Ahora enfocados en Dosis Objetivo)
    const defaultMeds = [
        {
            nombre: 'Dopamina',
            dosis: 5,        // mcg/kg/min objetivo
            diluyente: 50,   // ml volumen total
            velocidad: 1,    // ml/h
            unidad: 'mcg/kg/min'
        },
        {
            nombre: 'Dobutamina',
            dosis: 5,        // mcg/kg/min objetivo
            diluyente: 50,   // ml volumen total
            velocidad: 1,    // ml/h
            unidad: 'mcg/kg/min'
        }
    ];

    // Cargar datos iniciales
    defaultMeds.forEach(med => addRow(med));

    // Agregar nueva fila vacía
    btnAddRow.addEventListener('click', () => {
        addRow({ nombre: '', dosis: 0, diluyente: 50, velocidad: 1, unidad: 'mcg/kg/min' });
    });

    // Escuchar cambios en el peso
    pesoInput.addEventListener('input', () => {
        recalculateAllRows();
    });

    /**
     * Agrega una nueva fila a la tabla
     */
    function addRow(data) {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td><input type="text" class="inp-med" value="${data.nombre}" placeholder="Medicamento"></td>
            <td><input type="number" class="inp-dosis" value="${data.dosis || ''}" placeholder="0.0" step="0.01" min="0"></td>
            <td>
                <select class="sel-unidad">
                    <option value="mcg/kg/min" ${data.unidad === 'mcg/kg/min' ? 'selected' : ''}>mcg/kg/min</option>
                    <option value="mcg/kg/h" ${data.unidad === 'mcg/kg/h' ? 'selected' : ''}>mcg/kg/h</option>
                    <option value="mg/kg/h" ${data.unidad === 'mg/kg/h' ? 'selected' : ''}>mg/kg/h</option>
                </select>
            </td>
            <td><input type="number" class="inp-farmaco" placeholder="0.0" step="0.1" min="0" title="Calculado automáticamente"></td>
            <td><input type="number" class="inp-diluyente" value="${data.diluyente}" step="0.1" min="0"></td>
            <td><input type="number" class="inp-vol-final" readonly value="0"></td>
            <td><input type="number" class="inp-velocidad" value="${data.velocidad}" placeholder="1.0" step="0.1" min="0"></td>
            <td><input type="text" class="inp-equivalencia" readonly value="0" title="Dosis obtenida por cada 1 ml/h infundido"></td>
            <td><button class="btn btn-danger btn-delete">X</button></td>
        `;

        tableBody.appendChild(tr);
        attachRowEvents(tr);
        updateRowBaseCalculations(tr);
        
        // Si hay peso, calcula el fármaco desde el inicio
        if (parseFloat(pesoInput.value) > 0) {
            calculateFarmaco(tr);
            updateEquivalencia(tr);
        }
    }

    /**
     * Asocia los eventos a los inputs de una fila específica
     */
    function attachRowEvents(tr) {
        const farmacoInput = tr.querySelector('.inp-farmaco');
        const diluyenteInput = tr.querySelector('.inp-diluyente');
        const velocidadInput = tr.querySelector('.inp-velocidad');
        const dosisInput = tr.querySelector('.inp-dosis');
        const unidadSelect = tr.querySelector('.sel-unidad');
        const btnDelete = tr.querySelector('.btn-delete');

        // Eventos que calculan el FÁRMACO (mg) - El flujo principal
        const triggerCalculateFarmaco = () => {
            updateRowBaseCalculations(tr);
            calculateFarmaco(tr);
            updateEquivalencia(tr);
        };

        dosisInput.addEventListener('input', triggerCalculateFarmaco);
        diluyenteInput.addEventListener('input', triggerCalculateFarmaco);
        velocidadInput.addEventListener('input', triggerCalculateFarmaco);
        unidadSelect.addEventListener('change', triggerCalculateFarmaco);

        // Evento Inverso: Si el usuario escribe manualmente los FÁRMACOS (mg),
        // recalculamos la DOSIS real.
        farmacoInput.addEventListener('change', () => {
            calculateDose(tr);
            updateEquivalencia(tr);
        });
        farmacoInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                calculateDose(tr);
                updateEquivalencia(tr);
            }
        });

        // Botón eliminar
        btnDelete.addEventListener('click', () => {
            tr.remove();
        });
    }

    /**
     * Recalcula todas las filas cuando cambia el peso del paciente
     */
    function recalculateAllRows() {
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(tr => {
            // Cuando cambia el peso, recalculamos los miligramos necesarios para mantener la dosis
            calculateFarmaco(tr);
            updateEquivalencia(tr);
        });
    }

    /**
     * Calcula el Volumen Final (Volumen Final = Diluyente)
     */
    function updateRowBaseCalculations(tr) {
        const diluyente = parseFloat(tr.querySelector('.inp-diluyente').value) || 0;
        tr.querySelector('.inp-vol-final').value = diluyente > 0 ? diluyente.toFixed(1) : 0;
    }

    /**
     * Calcula la Cantidad de Fármaco (mg) necesaria para la Dosis deseada
     */
    function calculateFarmaco(tr) {
        const peso = parseFloat(pesoInput.value);
        if (!peso || peso <= 0) return;

        const dosis = parseFloat(tr.querySelector('.inp-dosis').value) || 0;
        const vol_final_ml = parseFloat(tr.querySelector('.inp-vol-final').value) || 0;
        const velocidad_ml_h = parseFloat(tr.querySelector('.inp-velocidad').value) || 0;
        const unidad = tr.querySelector('.sel-unidad').value;

        if (velocidad_ml_h === 0 || vol_final_ml === 0) return;

        let farmaco_mg = 0;

        // Fórmulas despejadas para mg:
        if (unidad === 'mcg/kg/min') {
            // mg = (Dosis_mcg/kg/min * Peso_kg * Volumen_Total_ml * 60) / (1000 * Velocidad_ml_h)
            farmaco_mg = (dosis * peso * vol_final_ml * 60) / (1000 * velocidad_ml_h);
        } else if (unidad === 'mcg/kg/h') {
            // mg = (Dosis_mcg/kg/h * Peso_kg * Volumen_Total_ml) / (1000 * Velocidad_ml_h)
            farmaco_mg = (dosis * peso * vol_final_ml) / (1000 * velocidad_ml_h);
        } else if (unidad === 'mg/kg/h') {
            // mg = (Dosis_mg/kg/h * Peso_kg * Volumen_Total_ml) / Velocidad_ml_h
            farmaco_mg = (dosis * peso * vol_final_ml) / velocidad_ml_h;
        }

        tr.querySelector('.inp-farmaco').value = farmaco_mg > 0 ? farmaco_mg.toFixed(1) : '';
    }

    /**
     * Función inversa: Calcula la Dosis si el usuario ingresa manualmente los mg
     */
    function calculateDose(tr) {
        const peso = parseFloat(pesoInput.value);
        if (!peso || peso <= 0) {
            alert('Por favor, ingresa el peso del paciente primero.');
            tr.querySelector('.inp-farmaco').value = '';
            return;
        }

        const farmaco_mg = parseFloat(tr.querySelector('.inp-farmaco').value) || 0;
        const vol_final_ml = parseFloat(tr.querySelector('.inp-vol-final').value) || 0;
        const velocidad_ml_h = parseFloat(tr.querySelector('.inp-velocidad').value) || 0;
        const unidad = tr.querySelector('.sel-unidad').value;

        if (vol_final_ml === 0 || velocidad_ml_h === 0) return;

        let dosis = 0;

        if (unidad === 'mcg/kg/min') {
            dosis = (farmaco_mg * 1000 * velocidad_ml_h) / (peso * vol_final_ml * 60);
        } else if (unidad === 'mcg/kg/h') {
            dosis = (farmaco_mg * 1000 * velocidad_ml_h) / (peso * vol_final_ml);
        } else if (unidad === 'mg/kg/h') {
            dosis = (farmaco_mg * velocidad_ml_h) / (peso * vol_final_ml);
        }

        tr.querySelector('.inp-dosis').value = dosis > 0 ? dosis.toFixed(2) : '';
    }

    /**
     * Calcula la Equivalencia: Cuánta dosis representa 1 ml/h de esta mezcla
     */
    function updateEquivalencia(tr) {
        const peso = parseFloat(pesoInput.value);
        if (!peso || peso <= 0) {
            tr.querySelector('.inp-equivalencia').value = '0';
            return;
        }

        const farmaco_mg = parseFloat(tr.querySelector('.inp-farmaco').value) || 0;
        const vol_final_ml = parseFloat(tr.querySelector('.inp-vol-final').value) || 0;
        const unidad = tr.querySelector('.sel-unidad').value;

        if (vol_final_ml === 0 || farmaco_mg === 0) {
            tr.querySelector('.inp-equivalencia').value = '0';
            return;
        }

        let equivalencia = 0;

        if (unidad === 'mcg/kg/min') {
            equivalencia = (farmaco_mg * 1000 * 1) / (peso * vol_final_ml * 60);
        } else if (unidad === 'mcg/kg/h') {
            equivalencia = (farmaco_mg * 1000 * 1) / (peso * vol_final_ml);
        } else if (unidad === 'mg/kg/h') {
            equivalencia = (farmaco_mg * 1) / (peso * vol_final_ml);
        }

        const val = equivalencia > 0 ? equivalencia.toFixed(3) : '0';
        
        // Mostrar con unidades
        tr.querySelector('.inp-equivalencia').value = val !== '0' ? val + ' ' + unidad + ' / ml/h' : '0';
    }
});
