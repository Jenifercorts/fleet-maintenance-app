# Fleet Maintenance

Panel de control de flota para gestión de mantenimiento **preventivo** y **correctivo** de vehículos pesados. Prototipo funcional, sin backend: todo se ejecuta en el navegador y los datos se guardan localmente (localStorage).

## Características

- **Hasta 200 vehículos** en la flota, con foto, placa, marca, modelo, año, configuración, VIN y normativa de emisiones.
- **Plan de mantenimiento preventivo cíclico**: los intervalos (10.000, 20.000, 30.000 ... 100.000 km) se repiten indefinidamente, por lo que la app calcula alertas para cualquier kilometraje sin importar qué tan alto sea (10.000 km o 10.000.000 km), sin necesidad de una tabla infinita.
- **Alertas automáticas** de mantenimiento preventivo según el kilometraje actual de cada vehículo, agrupando las tareas que coinciden en el mismo punto de servicio (ej. cambio de aceite + aceite de transmisión + diferencial).
- **Registro de correctivos**: reporta fallas o reparaciones no programadas, con prioridad, estado, costo estimado y fotos adjuntas.
- **Matriz de vehículos por archivo plano (CSV)**: importa y exporta la flota completa desde un archivo `.csv`, para crecer la base de datos con el tiempo. Ver `data/plantilla_vehiculos.csv`.
- **Matriz de mantenimiento editable**: el plan de intervalos y tareas (`data/plan_mantenimiento.json`) se puede ajustar desde la app (⚙️ Configuración) sin tocar código.
- **Costos del mes**: total, desglose preventivo/correctivo y costo por vehículo.
- Vehículo de ejemplo: **UD Trucks FVZ 2026, Euro VI**.

## Uso

Abre `index.html` en el navegador, o publica el repositorio con GitHub Pages (Settings → Pages → rama `main`, carpeta `/`).

1. Ve a **Vehículos** para agregar unidades manualmente o importar un CSV con la plantilla incluida.
2. En **Panel Principal**, selecciona el vehículo actual: verás su kilometraje, la barra de progreso hacia el próximo preventivo y las tareas alertadas.
3. Usa **Agendar Cita** para programar el preventivo sugerido, o **Ingresar Correctivo** para reportar una falla.
4. Revisa **Preventivos** para ver el estado de toda la flota, **Correctivos** para el historial de fallas, y **Costos Mes** para el resumen financiero.

## Notas técnicas

- Los datos (vehículos, mantenimientos, fotos) se guardan en `localStorage` del navegador donde se use la app; no se sincronizan entre dispositivos ni se suben a ningún servidor.
- Las fotos se redimensionan automáticamente antes de guardarse para no agotar el espacio de almacenamiento local. Si la flota crece mucho con muchas fotos, considera migrar el almacenamiento a IndexedDB o a un backend real.
- El botón **Vaciar datos** restaura los datos de ejemplo y borra todo lo guardado en el navegador.
