# Encuesta Gasolina · Estudio de Mercado

PWA mobile-first y offline-first para encuestar conductores en filas de estaciones de servicio.
Las respuestas se guardan en el teléfono (localStorage) y se exportan a CSV cuando haga falta.

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4 (modo claro / oscuro con alto contraste)
- Lucide React (iconos), Recharts (gráficos del reporte, cargados bajo demanda)
- vite-plugin-pwa (service worker + manifest, instalable en Android / iOS)

## Desarrollo

```bash
npm install
npm run dev
```

## Build y despliegue

```bash
npm run build
```

La carpeta `dist/` es estática: se puede subir a Vercel, Netlify, GitHub Pages o cualquier hosting.
El service worker solo se registra en `https://` (o `localhost`), así que para instalar la app en el
teléfono hay que servirla por HTTPS.

## Pantallas

1. **Inicio** – estación actual, respuestas de hoy, botones Nueva encuesta / Métricas / Exportar CSV.
2. **Encuesta** – portón de inicio (estación, botón "Iniciar encuesta" que arranca el cronómetro y
   botón "No quiso participar" para la tasa de respuesta), 10 preguntas en 4 bloques (perfil, hoy,
   la app, lead) con botones grandes — una de ellas de selección múltiple —, campos opcionales de
   placa y WhatsApp, y "Guardar y siguiente" que graba la duración y vuelve al portón.
   El diseño y la justificación de cada pregunta están en `docs/propuesta-encuesta-v2.md`.
3. **Métricas / Reporte** – KPIs (entrevistados y tasa de respuesta, % usarían la app, % pagarían
   3–5 %, % irían directo a la estación que la app muestre con gasolina), tabla por tipo de
   conductor, duración de la encuesta, barras
   por pregunta, rosca de métodos de pago, leads con copiar, filtro por estación y exportar CSV.
4. **Ajustes** (engranaje en inicio) – estado de los datos y **Zona de peligro**: borrar todas las
   respuestas o restablecer la app por completo. Cada acción exige escribir `BORRAR` para confirmar.

## Datos

- Clave `encuesta:responses:v3` en localStorage (array JSON de respuestas con timestamp ISO, estación
  y duración); `encuesta:refusals:v1` guarda las negativas.
- El CSV usa `;` como separador y BOM UTF-8 para abrirse en columnas en Excel en español/portugués.
  La pregunta múltiple exporta los códigos unidos por `|` y las etiquetas por ` + `.
- Las preguntas y opciones viven en `src/lib/model.ts`; cambiar textos o códigos ahí. El valor de
  referencia de la carga para los ejemplos en dinero (`REFERENCE_FILL_USD`) también está ahí.
