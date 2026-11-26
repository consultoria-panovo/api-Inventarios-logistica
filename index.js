// 1. Importaciones necesarias
const express = require('express');
const sql = require('mssql'); // Asumiendo que usas mssql

// 2. Inicialización de la aplicación
const app = express();
app.disable("x-powered-by");

// --- Seguridad: solo el proxy (edge function sap-proxy) puede llamar esta API ---
// La llave vive en la variable de entorno API_KEY de Render; nunca en el código.
const crypto = require("crypto");
function requireApiKey(req, res, next) {
  const expected = process.env.API_KEY;
  if (!expected) {
    // Falla cerrado: sin llave configurada no se sirve nada.
    console.error("API_KEY no configurada; solicitud rechazada");
    return res.status(503).json({ error: "service_unavailable" });
  }
  const given = req.get("x-api-key") || "";
  // Compara hashes de longitud fija para que el tiempo no revele la llave.
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  if (!crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}
// Ruta pública SOLO para el health check de Render (no devuelve datos).
app.get("/healthz", (req, res) => res.status(200).send("ok"));

app.use(requireApiKey);
const PORT = process.env.PORT || 3000;

// 3. Configuración de tu base de datos (¡Ojo! En producción usa variables de entorno)
const config = {
    user: process.env.DB_USER || 'tu_usuario',
    password: process.env.DB_PASSWORD || 'tu_password',
    server: process.env.DB_SERVER || 'tu_servidor', 
    database: process.env.DB_NAME || 'tu_base_de_datos',
    options: {
        encrypt: true, 
        trustServerCertificate: true // Importante dependiendo de tu tipo de servidor SQL
    }
};

// 4. TU RUTA (Aquí va el código que me compartiste)
app.get("/consumo/pal4", async (req, res) => {
  try {
    const pool = await sql.connect(config);

    const result = await pool.request().query(`
      SELECT 
          MATNR,
          WERKS,
          LGORT,
          SUM(
              CASE 
                  -- REVISIÓN IMPORTANTE EN ESTA PARTE:
                  WHEN BWART = 601 THEN ABS(MENGE)
                  WHEN BWART = 602 THEN -ABS(MENGE)
                  ELSE 0
              END
          ) AS ConsumoUltimos3Meses,
          MAX(BUDAT_MKPF) AS UltimaFecha
      FROM MovimientosDeInventario
      WHERE LGORT IN ('P202', 'CC01')
        AND BUDAT_MKPF >= DATEADD(MONTH, -3, GETDATE())
        AND BWART IN (601,602)
      GROUP BY MATNR, WERKS, LGORT;
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Error en la ruta:", err);
    console.error("Error en " + req.path + ":", err.message);
    res.status(500).json({ error: "internal_error" });
  }
});

// 5. Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
