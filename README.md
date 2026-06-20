# Aminas - PWA de Infusiones Pediátricas

Aplicación Web Progresiva (PWA) diseñada para el cálculo rápido y seguro de infusiones de medicamentos en pediatría. Funciona de manera **100% offline**, ideal para entornos hospitalarios con nula conectividad.

## Características
- **Cálculo bidireccional:** Ingresa la Velocidad de Infusión (ml/h) para obtener la Dosis (mcg/kg/min o mg/kg/h) o viceversa.
- **Funcionamiento Offline:** Gracias al uso de un Service Worker (`sw.js`) y `manifest.json`, la app se puede instalar en la pantalla de inicio de tu smartphone (iOS y Android) y no requiere conexión a internet tras la primera carga.
- **Sin Dependencias Externas:** Construido con HTML, CSS y Vanilla JavaScript. No hay librerías externas que rompan la experiencia sin conexión.

## Instrucciones de Uso (Para el Usuario Final)

1. **Abre la App:** Accede al archivo `index.html` desde cualquier navegador moderno o instálala como app en tu teléfono (En Safari/Chrome móvil, selecciona la opción "Añadir a la pantalla de inicio").
2. **Ingresa el Peso:** En la parte superior, digita el peso del paciente en kg.
3. **Agrega o Modifica Infusiones:**
   - La app incluye medicamentos comunes como Dopamina y Dobutamina preconfigurados.
   - Puedes usar el botón `+ Agregar Medicamento` para crear nuevas filas.
   - Define la *Cantidad de Fármaco (mg)* y el *Diluyente (ml)* (el cual actuará como Volumen Final).
4. **Calcula la Dosis:**
   - Si tienes la velocidad en la bomba de infusión, escríbela en la columna **Velocidad (ml/h)** y presiona *Enter* (o cambia de campo). Se calculará automáticamente la **Dosis Real**.
   - Si sabes qué dosis quieres alcanzar (ej. 5 mcg/kg/min), escríbela en la columna **Dosis Real** y presiona *Enter*. Se calculará automáticamente la **Velocidad (ml/h)** para programar en tu bomba.

## Fórmulas Médicas Utilizadas
Las conversiones matemáticas implementadas en `app.js` son las siguientes:

### Para unidades en `mcg/kg/min`:
- **Dosis =** `(Velocidad (ml/h) * Concentración (mg/ml) * 1000) / (Peso (kg) * 60)`
- **Velocidad =** `(Dosis * Peso (kg) * 60) / (Concentración (mg/ml) * 1000)`

### Para unidades en `mg/kg/h`:
- **Dosis =** `(Velocidad (ml/h) * Concentración (mg/ml)) / Peso (kg)`
- **Velocidad =** `(Dosis * Peso (kg)) / Concentración (mg/ml)`

*(La Concentración siempre es = mg de fármaco / volumen final en ml).*

## Licencia
Uso médico responsable y libre. Se recomienda siempre que el personal médico verifique los cálculos acorde a las prácticas clínicas de su institución.
