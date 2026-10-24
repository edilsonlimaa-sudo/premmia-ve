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
2. **Encuesta** – selector de estación + 5 preguntas de selección única con botones grandes,
   campos opcionales de placa y WhatsApp, botón "Guardar y siguiente" que limpia y vuelve a P1.
3. **Métricas / Reporte** – KPIs (entrevistados, % usarían la app, % pagarían 3–5 %), rosca de
   métodos de pago, barras de tiempo perdido / intención / recargo / frecuencia, tabla de leads
   con copiar, filtro por estación y exportar CSV.
4. **Ajustes** (engranaje en inicio) – estado de los datos y **Zona de peligro**: borrar todas las
   respuestas o restablecer la app por completo. Cada acción exige escribir `BORRAR` para confirmar.

## Datos

- Clave `encuesta:responses:v1` en localStorage (array JSON de respuestas con timestamp ISO y estación).
- El CSV usa `;` como separador y BOM UTF-8 para abrirse en columnas en Excel en español/portugués.
- Las preguntas y opciones viven en `src/lib/model.ts`; cambiar textos o códigos ahí.
