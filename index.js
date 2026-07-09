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
