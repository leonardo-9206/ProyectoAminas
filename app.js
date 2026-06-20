// app.js

document.addEventListener('DOMContentLoaded', () => {
    const pesoInput = document.getElementById('peso');
    const tableBody = document.getElementById('table-body');
    const btnAddRow = document.getElementById('btn-add-row');

    // Medicamentos preconfigurados
    const defaultMeds = [
        {
            nombre: 'Dopamina',
            farmaco: 200,    // mg
            diluyente: 50,   // ml
            unidad: 'mcg/kg/min'
        },
        {
            nombre: 'Dobutamina',
            farmaco: 250,    // mg
            diluyente: 50,   // ml
            unidad: 'mcg/kg/min'
        }
    ];

    // Cargar datos iniciales
    defaultMeds.forEach(med => addRow(med));

    // Agregar nueva fila vacía
    btnAddRow.addEventListener('click', () => {
        addRow({ nombre: '', farmaco: 0, diluyente: 0, unidad: 'mcg/kg/min' });
    });

    // Escuchar cambios en el peso
    pesoInput.addEventListener('input', () => {
        recalculateAllRows();
    });

    /**
     * Agrega una nueva fila a la tabla respetando el nuevo orden:
     * Medicamento | Dosis Real | Unidad | Fármaco | Diluyente | Vol Final | Velocidad | Equivalencia | Acción
     */
    function addRow(data) {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td><input type="text" class="inp-med" value="${data.nombre}" placeholder="Medicamento"></td>
            <td><input type="number" class="inp-dosis" placeholder="0.0" step="0.01" min="0"></td>
            <td>
                <select class="sel-unidad">
                    <option value="mcg/kg/min" ${data.unidad === 'mcg/kg/min' ? 'selected' : ''}>mcg/kg/min</option>
                    <option value="mcg/kg/h" ${data.unidad === 'mcg/kg/h' ? 'selected' : ''}>mcg/kg/h</option>
                    <option value="mg/kg/h" ${data.unidad === 'mg/kg/h' ? 'selected' : ''}>mg/kg/h</option>
                </select>
            </td>
            <td><input type="number" class="inp-farmaco" value="${data.farmaco}" step="0.1" min="0"></td>
            <td><input type="number" class="inp-diluyente" value="${data.diluyente}" step="0.1" min="0"></td>
            <td><input type="number" class="inp-vol-final" readonly value="0"></td>
            <td><input type="number" class="inp-velocidad" placeholder="0.0" step="0.1" min="0"></td>
            <td><input type="number" class="inp-equivalencia" readonly value="0" title="Dosis obtenida por cada 1 ml/h infundido"></td>
            <td><button class="btn btn-danger btn-delete">X</button></td>
        `;

        tableBody.appendChild(tr);
        attachRowEvents(tr);
        updateRowBaseCalculations(tr);
        updateEquivalencia(tr);
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

        // Cuando cambia farmaco o diluyente: recalcula Volumen, Equivalencia y Dosis (manteniendo velocidad fija)
        const onBaseChange = () => {
            updateRowBaseCalculations(tr);
            updateEquivalencia(tr);
            calculateDoseFromRate(tr);
        };
        farmacoInput.addEventListener('input', onBaseChange);
        diluyenteInput.addEventListener('input', onBaseChange);

        // Si cambia la unidad, recalcula Equivalencia y Dosis
        unidadSelect.addEventListener('change', () => {
            updateEquivalencia(tr);
            calculateDoseFromRate(tr);
        });

        // Modificar Velocidad -> Recalcular Dosis
        velocidadInput.addEventListener('change', () => calculateDoseFromRate(tr));
        velocidadInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') calculateDoseFromRate(tr);
        });

        // Modificar Dosis -> Recalcular Velocidad
        dosisInput.addEventListener('change', () => calculateRateFromDose(tr));
        dosisInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') calculateRateFromDose(tr);
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
            updateEquivalencia(tr);
            calculateDoseFromRate(tr);
        });
    }

    /**
     * Calcula el Volumen Final (Asumimos Volumen Final = Diluyente)
     */
    function updateRowBaseCalculations(tr) {
        const diluyente = parseFloat(tr.querySelector('.inp-diluyente').value) || 0;
        tr.querySelector('.inp-vol-final').value = diluyente > 0 ? diluyente.toFixed(1) : 0;
    }

    /**
     * Calcula la Equivalencia: Cuánta dosis representa 1 ml/h de esta dilución
     * Sirve como factor directo: Dosis = Velocidad * Equivalencia
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

        if (vol_final_ml === 0) {
            tr.querySelector('.inp-equivalencia').value = '0';
            return;
        }

        let equivalencia = 0; // dosis por 1 ml/h

        if (unidad === 'mcg/kg/min') {
            // Equivalencia (mcg/kg/min por ml/h) = (mg * 1000 * 1) / (peso * vol_final * 60)
            equivalencia = (farmaco_mg * 1000 * 1) / (peso * vol_final_ml * 60);
        } else if (unidad === 'mcg/kg/h') {
            // Equivalencia (mcg/kg/h por ml/h) = (mg * 1000 * 1) / (peso * vol_final)
            equivalencia = (farmaco_mg * 1000 * 1) / (peso * vol_final_ml);
        } else if (unidad === 'mg/kg/h') {
            // Equivalencia (mg/kg/h por ml/h) = (mg * 1) / (peso * vol_final)
            equivalencia = (farmaco_mg * 1) / (peso * vol_final_ml);
        }

        tr.querySelector('.inp-equivalencia').value = equivalencia > 0 ? equivalencia.toFixed(4) : '0';
    }

    /**
     * Calcula la Dosis Real en base a la Velocidad de Infusión (ml/h)
     */
    function calculateDoseFromRate(tr) {
        const velocidad = parseFloat(tr.querySelector('.inp-velocidad').value) || 0;
        const equivalencia = parseFloat(tr.querySelector('.inp-equivalencia').value) || 0;
        
        // Ya que Equivalencia = dosis obtenida por 1 ml/h
        // La Dosis total es simplemente Velocidad * Equivalencia
        const dosis = velocidad * equivalencia;

        tr.querySelector('.inp-dosis').value = dosis > 0 ? dosis.toFixed(2) : '';
    }

    /**
     * Calcula la Velocidad de Infusión (ml/h) en base a la Dosis deseada
     */
    function calculateRateFromDose(tr) {
        const peso = parseFloat(pesoInput.value);
        if (!peso || peso <= 0) {
            alert('Por favor, ingresa el peso del paciente primero.');
            tr.querySelector('.inp-velocidad').value = '';
            return;
        }

        const dosis = parseFloat(tr.querySelector('.inp-dosis').value) || 0;
        const equivalencia = parseFloat(tr.querySelector('.inp-equivalencia').value) || 0;

        if (equivalencia === 0) return;

        // Ya que Dosis = Velocidad * Equivalencia
        // Entonces Velocidad = Dosis / Equivalencia
        const velocidad = dosis / equivalencia;

        tr.querySelector('.inp-velocidad').value = velocidad > 0 ? velocidad.toFixed(1) : '';
    }
});
