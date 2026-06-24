// app.js

document.addEventListener('DOMContentLoaded', () => {
    const pesoInput = document.getElementById('peso');
    const tableBody = document.getElementById('table-body');
    const btnAddRow = document.getElementById('btn-add-row');
    const tabsContainer = document.getElementById('tabs-container');
    const currentPatientName = document.getElementById('current-patient-name');
    const btnDeletePatient = document.getElementById('btn-delete-patient');

    const defaultMeds = [
        { nombre: 'Dopamina', dosis: 5, diluyente: 12, velocidad: 1, unidad: 'mcg/kg/min', farmaco_unidad: 'mg', equiv_unidad: 'mcg/kg/min' },
        { nombre: 'Dobutamina', dosis: 5, diluyente: 12, velocidad: 1, unidad: 'mcg/kg/min', farmaco_unidad: 'mg', equiv_unidad: 'mcg/kg/min' },
        { nombre: 'Norepinefrina', dosis: 0.1, diluyente: 12, velocidad: 1, unidad: 'mcg/kg/min', farmaco_unidad: 'mg', equiv_unidad: 'mcg/kg/min' },
        { nombre: 'Adrenalina', dosis: 0.1, diluyente: 12, velocidad: 1, unidad: 'mcg/kg/min', farmaco_unidad: 'mg', equiv_unidad: 'mcg/kg/min' },
        { nombre: 'Milrinona', dosis: 0.5, diluyente: 12, velocidad: 1, unidad: 'mcg/kg/min', farmaco_unidad: 'mg', equiv_unidad: 'mcg/kg/min' },
        { nombre: 'Midazolam', dosis: 0.1, diluyente: 12, velocidad: 1, unidad: 'mg/kg/h', farmaco_unidad: 'mg', equiv_unidad: 'mg/kg/h' },
        { nombre: 'Fentanyl', dosis: 1, diluyente: 12, velocidad: 1, unidad: 'mcg/kg/h', farmaco_unidad: 'mcg', equiv_unidad: 'mcg/kg/h' }, // Fentanyl suele usarse en mcg
        { nombre: 'Dexmedetomidina', dosis: 0.5, diluyente: 12, velocidad: 1, unidad: 'mcg/kg/h', farmaco_unidad: 'mcg', equiv_unidad: 'mcg/kg/h' }, // Dex también
        { nombre: 'Propofol', dosis: 1, diluyente: 12, velocidad: 1, unidad: 'mg/kg/h', farmaco_unidad: 'mg', equiv_unidad: 'mg/kg/h' }
    ];

    // Estado Global (Múltiples Pacientes)
    let appState = {
        activePatientId: 1,
        nextPatientId: 2,
        patients: [
            {
                id: 1,
                name: 'Paciente 1',
                peso: '',
                meds: JSON.parse(JSON.stringify(defaultMeds))
            }
        ]
    };

    // Inicialización
    loadState();
    renderTabs();
    renderActivePatient();

    /**======================
     * SISTEMA DE ESTADO
     * ======================*/
    function loadState() {
        const saved = localStorage.getItem('aminas_pwa_data');
        if (saved) {
            try {
                appState = JSON.parse(saved);
            } catch (e) {
                console.error("Error al cargar estado", e);
            }
        }
    }

    // Se llama cada vez que cambia CUALQUIER input
    function saveState() {
        const activePatient = appState.patients.find(p => p.id === appState.activePatientId);
        if (!activePatient) return;

        activePatient.name = currentPatientName.innerText;
        activePatient.peso = pesoInput.value;

        const rows = tableBody.querySelectorAll('tr');
        activePatient.meds = Array.from(rows).map(tr => {
            return {
                nombre: tr.querySelector('.inp-med').value,
                dosis: tr.querySelector('.inp-dosis').value,
                unidad: tr.querySelector('.sel-unidad').value,
                farmaco: tr.querySelector('.inp-farmaco').value, // guardamos el valor actual (mg o mcg)
                farmaco_unidad: tr.querySelector('.sel-farmaco-unidad').value,
                diluyente: tr.querySelector('.inp-diluyente').value,
                velocidad: tr.querySelector('.inp-velocidad').value,
                equiv_unidad: tr.querySelector('.sel-equiv-unidad').value
            };
        });

        localStorage.setItem('aminas_pwa_data', JSON.stringify(appState));
    }

    /**======================
     * INTERFAZ MULTI-PACIENTE
     * ======================*/
    function renderTabs() {
        tabsContainer.innerHTML = '';
        
        appState.patients.forEach(p => {
            const btn = document.createElement('button');
            btn.className = 'tab' + (p.id === appState.activePatientId ? ' active' : '');
            btn.innerText = p.name || `Paciente ${p.id}`;
            btn.onclick = () => switchPatient(p.id);
            tabsContainer.appendChild(btn);
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'tab tab-add';
        addBtn.innerText = '+ Nuevo';
        addBtn.onclick = createNewPatient;
        tabsContainer.appendChild(addBtn);
    }

    function switchPatient(id) {
        // Guardamos antes de cambiar por si acaso
        saveState();
        appState.activePatientId = id;
        saveState();
        renderTabs();
        renderActivePatient();
    }

    function createNewPatient() {
        saveState();
        const newId = appState.nextPatientId++;
        appState.patients.push({
            id: newId,
            name: `Paciente ${newId}`,
            peso: '',
            meds: JSON.parse(JSON.stringify(defaultMeds))
        });
        appState.activePatientId = newId;
        saveState();
        renderTabs();
        renderActivePatient();
    }

    btnDeletePatient.addEventListener('click', () => {
        if (appState.patients.length === 1) {
            alert('Debe haber al menos un paciente.');
            return;
        }
        if (confirm(`¿Eliminar a ${currentPatientName.innerText}?`)) {
            appState.patients = appState.patients.filter(p => p.id !== appState.activePatientId);
            appState.activePatientId = appState.patients[0].id;
            saveState();
            renderTabs();
            renderActivePatient();
        }
    });

    currentPatientName.addEventListener('blur', () => {
        saveState();
        renderTabs(); // Para actualizar el nombre en la pestaña
    });
    currentPatientName.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            currentPatientName.blur();
        }
    });

    function renderActivePatient() {
        const activePatient = appState.patients.find(p => p.id === appState.activePatientId);
        if (!activePatient) return;

        currentPatientName.innerText = activePatient.name;
        pesoInput.value = activePatient.peso;
        tableBody.innerHTML = '';

        activePatient.meds.forEach(med => addRow(med));
        recalculateAllRows();
    }

    /**======================
     * LÓGICA DE LA TABLA
     * ======================*/
    btnAddRow.addEventListener('click', () => {
        addRow({ nombre: '', dosis: 0, diluyente: 12, velocidad: 1, unidad: 'mcg/kg/min', farmaco_unidad: 'mg', equiv_unidad: 'mcg/kg/min' });
        saveState();
    });

    pesoInput.addEventListener('input', () => {
        recalculateAllRows();
        saveState();
    });

    function getDecimals(tr, defaultDec) {
        const medName = tr.querySelector('.inp-med').value.trim().toLowerCase();
        if (['norepinefrina', 'adrenalina', 'milrinona'].includes(medName)) {
            return 3;
        }
        return defaultDec;
    }

    function addRow(data) {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td><input type="text" class="inp-med" value="${data.nombre}" placeholder="Medicamento" readonly></td>
            <td><input type="number" class="inp-dosis" value="${data.dosis || ''}" placeholder="0.0" step="0.01" min="0"></td>
            <td>
                <select class="sel-unidad">
                    <option value="mcg/kg/min" ${data.unidad === 'mcg/kg/min' ? 'selected' : ''}>mcg/kg/min</option>
                    <option value="mcg/kg/h" ${data.unidad === 'mcg/kg/h' ? 'selected' : ''}>mcg/kg/h</option>
                    <option value="mg/kg/h" ${data.unidad === 'mg/kg/h' ? 'selected' : ''}>mg/kg/h</option>
                </select>
            </td>
            <td class="td-farmaco">
                <div class="equiv-group">
                    <input type="number" class="inp-farmaco" value="${data.farmaco || ''}" placeholder="0.0" step="0.1" min="0" title="Calculado automáticamente">
                    <select class="sel-farmaco-unidad">
                        <option value="mg" ${data.farmaco_unidad === 'mg' ? 'selected' : ''}>mg</option>
                        <option value="mcg" ${data.farmaco_unidad === 'mcg' ? 'selected' : ''}>mcg</option>
                    </select>
                </div>
            </td>
            <td><input type="number" class="inp-diluyente" value="${data.diluyente}" step="0.1" min="0"></td>
            <td><input type="number" class="inp-vol-final" readonly value="0"></td>
            <td><input type="number" class="inp-velocidad" value="${data.velocidad}" placeholder="1.0" step="0.1" min="0"></td>
            <td class="td-equivalencia">
                <div class="equiv-group">
                    <input type="text" class="inp-equivalencia" readonly value="0" title="Dosis obtenida por cada 1 ml/h infundido">
                    <select class="sel-equiv-unidad">
                        <option value="mcg/kg/min" ${data.equiv_unidad === 'mcg/kg/min' ? 'selected' : ''}>mcg/kg/min</option>
                        <option value="mcg/kg/h" ${data.equiv_unidad === 'mcg/kg/h' ? 'selected' : ''}>mcg/kg/h</option>
                        <option value="mg/kg/h" ${data.equiv_unidad === 'mg/kg/h' ? 'selected' : ''}>mg/kg/h</option>
                    </select>
                </div>
            </td>
            <td><button class="btn btn-danger btn-delete">X</button></td>
        `;

        if (!data.nombre) {
            tr.querySelector('.inp-med').removeAttribute('readonly');
        }

        tableBody.appendChild(tr);
        attachRowEvents(tr);
        updateRowBaseCalculations(tr);
    }

    function attachRowEvents(tr) {
        const inputs = tr.querySelectorAll('input, select');
        
        // Cada vez que un valor de la fila cambie, guardamos el estado
        inputs.forEach(input => {
            input.addEventListener('change', saveState);
            if(input.type === 'number' || input.type === 'text') {
                input.addEventListener('input', saveState);
            }
        });

        const farmacoInput = tr.querySelector('.inp-farmaco');
        const diluyenteInput = tr.querySelector('.inp-diluyente');
        const velocidadInput = tr.querySelector('.inp-velocidad');
        const dosisInput = tr.querySelector('.inp-dosis');
        const unidadSelect = tr.querySelector('.sel-unidad');
        const farmacoUnidadSelect = tr.querySelector('.sel-farmaco-unidad');
        const equivUnidadSelect = tr.querySelector('.sel-equiv-unidad');
        const btnDelete = tr.querySelector('.btn-delete');

        const triggerCalculateFarmaco = () => {
            updateRowBaseCalculations(tr);
            calculateFarmaco(tr);
            updateEquivalencia(tr);
        };

        dosisInput.addEventListener('input', triggerCalculateFarmaco);
        diluyenteInput.addEventListener('input', triggerCalculateFarmaco);
        unidadSelect.addEventListener('change', triggerCalculateFarmaco);
        farmacoUnidadSelect.addEventListener('change', triggerCalculateFarmaco);

        const triggerCalculateDose = () => {
            updateRowBaseCalculations(tr);
            calculateDose(tr);
            updateEquivalencia(tr);
        };

        velocidadInput.addEventListener('input', triggerCalculateDose);
        farmacoInput.addEventListener('input', triggerCalculateDose);

        equivUnidadSelect.addEventListener('change', () => updateEquivalencia(tr));

        btnDelete.addEventListener('click', () => {
            tr.remove();
            saveState();
        });
    }

    function recalculateAllRows() {
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(tr => {
            calculateFarmaco(tr);
            updateEquivalencia(tr);
        });
    }

    function updateRowBaseCalculations(tr) {
        const diluyente = parseFloat(tr.querySelector('.inp-diluyente').value) || 0;
        const decimals = getDecimals(tr, 1);
        tr.querySelector('.inp-vol-final').value = diluyente > 0 ? diluyente.toFixed(decimals) : 0;
    }

    function calculateFarmaco(tr) {
        const peso = parseFloat(pesoInput.value);
        if (!peso || peso <= 0) return;

        const dosis = parseFloat(tr.querySelector('.inp-dosis').value) || 0;
        const vol_final_ml = parseFloat(tr.querySelector('.inp-vol-final').value) || 0;
        const velocidad_ml_h = parseFloat(tr.querySelector('.inp-velocidad').value) || 0;
        const unidad = tr.querySelector('.sel-unidad').value;
        const farmaco_unidad = tr.querySelector('.sel-farmaco-unidad').value;

        if (velocidad_ml_h === 0 || vol_final_ml === 0) return;

        let farmaco_mg = 0;

        if (unidad === 'mcg/kg/min') {
            farmaco_mg = (dosis * peso * vol_final_ml * 60) / (1000 * velocidad_ml_h);
        } else if (unidad === 'mcg/kg/h') {
            farmaco_mg = (dosis * peso * vol_final_ml) / (1000 * velocidad_ml_h);
        } else if (unidad === 'mg/kg/h') {
            farmaco_mg = (dosis * peso * vol_final_ml) / velocidad_ml_h;
        }

        let display_val = farmaco_mg;
        if (farmaco_unidad === 'mcg') {
            display_val = farmaco_mg * 1000;
        }

        const decimals = getDecimals(tr, 1);
        tr.querySelector('.inp-farmaco').value = display_val > 0 ? display_val.toFixed(decimals) : '';
    }

    function calculateDose(tr) {
        const peso = parseFloat(pesoInput.value);
        if (!peso || peso <= 0) {
            tr.querySelector('.inp-farmaco').value = '';
            return;
        }

        const input_farmaco = parseFloat(tr.querySelector('.inp-farmaco').value) || 0;
        const farmaco_unidad = tr.querySelector('.sel-farmaco-unidad').value;
        const farmaco_mg = farmaco_unidad === 'mcg' ? input_farmaco / 1000 : input_farmaco;

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

        const decimals = getDecimals(tr, 2);
        tr.querySelector('.inp-dosis').value = dosis > 0 ? dosis.toFixed(decimals) : '';
    }

    function updateEquivalencia(tr) {
        const peso = parseFloat(pesoInput.value);
        if (!peso || peso <= 0) {
            tr.querySelector('.inp-equivalencia').value = '0';
            return;
        }

        const input_farmaco = parseFloat(tr.querySelector('.inp-farmaco').value) || 0;
        const farmaco_unidad = tr.querySelector('.sel-farmaco-unidad').value;
        const farmaco_mg = farmaco_unidad === 'mcg' ? input_farmaco / 1000 : input_farmaco;

        const vol_final_ml = parseFloat(tr.querySelector('.inp-vol-final').value) || 0;
        const equivUnidad = tr.querySelector('.sel-equiv-unidad').value;

        if (vol_final_ml === 0 || farmaco_mg === 0) {
            tr.querySelector('.inp-equivalencia').value = '0';
            return;
        }

        let equivalencia = 0;

        if (equivUnidad === 'mcg/kg/min') {
            equivalencia = (farmaco_mg * 1000 * 1) / (peso * vol_final_ml * 60);
        } else if (equivUnidad === 'mcg/kg/h') {
            equivalencia = (farmaco_mg * 1000 * 1) / (peso * vol_final_ml);
        } else if (equivUnidad === 'mg/kg/h') {
            equivalencia = (farmaco_mg * 1) / (peso * vol_final_ml);
        }

        const decimals = getDecimals(tr, 1);
        tr.querySelector('.inp-equivalencia').value = equivalencia > 0 ? equivalencia.toFixed(decimals) : '0';
    }
});
