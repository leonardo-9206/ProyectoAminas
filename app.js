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
    pesoInput.addEventListener('input', recalculateAllRows);

    /**
     * Agrega una nueva fila a la tabla
     * @param {Object} data Datos iniciales de la fila
     */
    function addRow(data) {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td><input type="text" class="inp-med" value="${data.nombre}" placeholder="Medicamento"></td>
            <td><input type="number" class="inp-farmaco" value="${data.farmaco}" step="0.1" min="0"></td>
            <td><input type="number" class="inp-diluyente" value="${data.diluyente}" step="0.1" min="0"></td>
            <td><input type="number" class="inp-vol-final" readonly value="0"></td>
            <td><input type="number" class="inp-equivalencia" readonly value="0"></td>
            <td><input type="number" class="inp-velocidad" placeholder="0.0" step="0.1" min="0"></td>
            <td><input type="number" class="inp-dosis" placeholder="0.0" step="0.01" min="0"></td>
            <td>
                <select class="sel-unidad">
                    <option value="mcg/kg/min" ${data.unidad === 'mcg/kg/min' ? 'selected' : ''}>mcg/kg/min</option>
                    <option value="mg/kg/h" ${data.unidad === 'mg/kg/h' ? 'selected' : ''}>mg/kg/h</option>
                </select>
            </td>
            <td><button class="btn btn-danger btn-delete">X</button></td>
        `;

        tableBody.appendChild(tr);
        attachRowEvents(tr);
        updateRowBaseCalculations(tr); // Calcula volumen final y equivalencia
    }

    /**
     * Asocia los eventos a los inputs de una fila específica
     * @param {HTMLElement} tr Fila de la tabla
     */
    function attachRowEvents(tr) {
        const farmacoInput = tr.querySelector('.inp-farmaco');
        const diluyenteInput = tr.querySelector('.inp-diluyente');
        const velocidadInput = tr.querySelector('.inp-velocidad');
        const dosisInput = tr.querySelector('.inp-dosis');
        const unidadSelect = tr.querySelector('.sel-unidad');
        const btnDelete = tr.querySelector('.btn-delete');

        // Cuando cambia farmaco o diluyente, actualiza base y recalcula dosis manteniendo la velocidad
        const updateBase = () => {
            updateRowBaseCalculations(tr);
            calculateDoseFromRate(tr);
        };
        farmacoInput.addEventListener('input', updateBase);
        diluyenteInput.addEventListener('input', updateBase);

        // Si cambia la unidad, recalcula la dosis
        unidadSelect.addEventListener('change', () => calculateDoseFromRate(tr));

        // Eventos bidireccionales (keyup con Enter o change)
        velocidadInput.addEventListener('change', () => calculateDoseFromRate(tr));
        velocidadInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') calculateDoseFromRate(tr);
        });

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
            // Asumimos que la velocidad dictamina la dosis si hay un cambio de peso
            // (Comportamiento común: la bomba de infusión ya está a una velocidad)
            calculateDoseFromRate(tr);
        });
    }

    /**
     * Calcula el Volumen Final y la Equivalencia (Concentración)
     * Volumen Final = Diluyente (Asumimos que el fármaco ya está diluido en este volumen, práctica común)
     * Equivalencia = mg de fármaco / ml de volumen final
     * @param {HTMLElement} tr Fila de la tabla
     */
    function updateRowBaseCalculations(tr) {
        const farmaco = parseFloat(tr.querySelector('.inp-farmaco').value) || 0;
        const diluyente = parseFloat(tr.querySelector('.inp-diluyente').value) || 0;
        
        // En algunas prácticas Volumen Final = Diluyente + Volumen del Fármaco. 
        // Para estandarizar, usaremos el diluyente como volumen final (ej: aforar a 50ml).
        // Si se requiere sumar, se puede cambiar a: const volFinal = farmacoVol + diluyente;
        const volFinal = diluyente; 
        
        tr.querySelector('.inp-vol-final').value = volFinal > 0 ? volFinal.toFixed(1) : 0;

        let equivalencia = 0;
        if (volFinal > 0) {
            equivalencia = farmaco / volFinal; // mg/ml
        }
        tr.querySelector('.inp-equivalencia').value = equivalencia.toFixed(2);
    }

    /**
     * Calcula la Dosis Real en base a la Velocidad de Infusión (ml/h)
     * @param {HTMLElement} tr Fila de la tabla
     */
    function calculateDoseFromRate(tr) {
        const peso = parseFloat(pesoInput.value);
        if (!peso || peso <= 0) return; // Requiere peso

        const velocidad = parseFloat(tr.querySelector('.inp-velocidad').value) || 0;
        const equivalencia = parseFloat(tr.querySelector('.inp-equivalencia').value) || 0; // mg/ml
        const unidad = tr.querySelector('.sel-unidad').value;

        let dosis = 0;

        if (unidad === 'mcg/kg/min') {
            // FÓRMULA: Dosis (mcg/kg/min) = (Velocidad (ml/h) * Concentración (mg/ml) * 1000) / (Peso (kg) * 60)
            dosis = (velocidad * equivalencia * 1000) / (peso * 60);
        } else if (unidad === 'mg/kg/h') {
            // FÓRMULA: Dosis (mg/kg/h) = (Velocidad (ml/h) * Concentración (mg/ml)) / Peso (kg)
            dosis = (velocidad * equivalencia) / peso;
        }

        tr.querySelector('.inp-dosis').value = dosis > 0 ? dosis.toFixed(2) : '';
    }

    /**
     * Calcula la Velocidad de Infusión (ml/h) en base a la Dosis deseada
     * @param {HTMLElement} tr Fila de la tabla
     */
    function calculateRateFromDose(tr) {
        const peso = parseFloat(pesoInput.value);
        if (!peso || peso <= 0) {
            alert('Por favor, ingresa el peso del paciente primero.');
            tr.querySelector('.inp-dosis').value = '';
            return;
        }

        const dosis = parseFloat(tr.querySelector('.inp-dosis').value) || 0;
        const equivalencia = parseFloat(tr.querySelector('.inp-equivalencia').value) || 0; // mg/ml
        const unidad = tr.querySelector('.sel-unidad').value;

        if (equivalencia === 0) return;

        let velocidad = 0;

        if (unidad === 'mcg/kg/min') {
            // FÓRMULA: Velocidad (ml/h) = (Dosis (mcg/kg/min) * Peso (kg) * 60) / (Concentración (mg/ml) * 1000)
            velocidad = (dosis * peso * 60) / (equivalencia * 1000);
        } else if (unidad === 'mg/kg/h') {
            // FÓRMULA: Velocidad (ml/h) = (Dosis (mg/kg/h) * Peso (kg)) / Concentración (mg/ml)
            velocidad = (dosis * peso) / equivalencia;
        }

        tr.querySelector('.inp-velocidad').value = velocidad > 0 ? velocidad.toFixed(1) : '';
    }
});
