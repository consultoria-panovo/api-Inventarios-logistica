const express = require("express");
const sql = require("mssql");

const app = express();

app.use(express.json());

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

// Ruta inicial para validar que la API está viva
app.get("/", (req, res) => {
  res.send("API Inventarios Logística funcionando correctamente");
});

// ---------------------------------------------------
// Endpoint principal: Inventario por centro, almacén, material y lote
// PAL3 - P202
// CCP1 - CC01
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
          SUM(TRY_CONVERT(DECIMAL(18,3), [/CWM/CLABS])) AS CantidadReal
      FROM MCHB
      WHERE 
          (
              LTRIM(RTRIM(WERKS)) = 'PAL3'
              AND LTRIM(RTRIM(LGORT)) = 'P202'
          )
          OR
          (
              LTRIM(RTRIM(WERKS)) = 'CCP1'
              AND LTRIM(RTRIM(LGORT)) = 'CC01'
          )
      GROUP BY
          WERKS,
          LGORT,
          MATNR,
          CHARG
      HAVING SUM(TRY_CONVERT(DECIMAL(18,3), [/CWM/CLABS])) <> 0
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

// ---------------------------------------------------
// Endpoint de prueba: ver qué almacenes existen para PAL3 y CCP1
// ---------------------------------------------------
app.get("/inventario/almacenes", async (req, res) => {
  try {
    const pool = await sql.connect(config);

    const result = await pool.request().query(`
      SELECT
          WERKS AS Centro,
          LGORT AS Almacen,
          COUNT(*) AS Registros,
          SUM(TRY_CONVERT(DECIMAL(18,3), [/CWM/CLABS])) AS CantidadTotal
      FROM MCHB
      WHERE LTRIM(RTRIM(WERKS)) IN ('PAL3', 'CCP1')
      GROUP BY
          WERKS,
          LGORT
      ORDER BY
          WERKS,
          LGORT;
    `);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json(result.recordset);

  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`API Inventarios Logística corriendo en puerto ${PORT}`);
});
