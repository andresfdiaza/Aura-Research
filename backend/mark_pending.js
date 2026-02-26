const pool = require('./db');
(async ()=>{
  try{
    await pool.query("UPDATE investigadores SET estado='pendiente' WHERE (link IS NOT NULL OR link_cvlac IS NOT NULL)");
    const [rows]=await pool.query("SELECT id, nombre_completo, cedula, COALESCE(link,link_cvlac) AS link, estado FROM investigadores");
    console.log(rows);
    process.exit(0);
  }catch(e){
    console.error(e);
    process.exit(1);
  }
})();
