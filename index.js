const express = require("express");
const sql = require("mssql");
const app = express();

// Configuración desde variables de ambiente
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: false
  },
  requestTimeout: 60000
};

// ---------------------------------------------------
// Endpoint para leer inventario por centro, almacén, material y lote
// Tabla: MCHB
// Centros:
// PAL3 - Almacén P202
// CCP1 - Almacén CC01
// ---------------------------------------------------
app.get("/inventario/lotes", async (req, res) => {
  try {
    const pool = await sql.connect(config);

    const result = await pool.request().query(`
      SELECT
          WERKS AS Centro,
          LGORT AS Almacen,
          MATNR AS Material,
          CHARG AS Lote,
          SUM(CAST([/CWM/CLABS] AS DECIMAL(18,3))) AS CantidadReal
      FROM MCHB
      WHERE 
          (
              WERKS = 'PAL3'
              AND LGORT = 'P202'
          )
          OR
          (
              WERKS = 'CCP1'
              AND LGORT = 'CC01'
          )
      GROUP BY
          WERKS,
          LGORT,
          MATNR,
          CHARG
      HAVING SUM(CAST([/CWM/CLABS] AS DECIMAL(18,3))) <> 0
      ORDER BY
          WERKS,
          LGORT,
          MATNR,
          CHARG;
    `);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json(result.recordset);

  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`API Inventario MCHB corriendo en puerto ${PORT}`);
});
