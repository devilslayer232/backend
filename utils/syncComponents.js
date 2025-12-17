const fs = require('fs');
const path = require('path');

// Configuración de mapeo de componentes a funcionalidades
const componentMapping = {
  'ClienteComponentes': {
    table: 'clientes',
    routes: ['GET', 'POST', 'PUT', 'DELETE'],
    fields: [
      { name: 'nombre', type: 'VARCHAR(100)', requerido: true },
      { name: 'direccion', type: 'VARCHAR(255)', requerido: true },
      { name: 'contacto', type: 'VARCHAR(50)', requerido: true },
      { name: 'pedido', type: 'TEXT', requerido: true },
      { name: 'latitud', type: 'DECIMAL(10, 8)', requerido: false },
      { name: 'longitud', type: 'DECIMAL(11, 8)', requerido: false },
      { name: 'estado', type: "ENUM('pendiente', 'en_ruta', 'entregado')", requerido: false, default: "'pendiente'" }
    ]
  },
  'DetallesPedido': {
    generate: false,
    table: 'detalles_pedido',
    routes: ['GET', 'POST', 'PUT', 'DELETE'],
    fields: [
      { name: 'cliente_id', type: 'INT', requerido: true },
      { name: 'contenido', type: 'TEXT', requerido: true },
      { name: 'fecha_creacion', type: 'TIMESTAMP', requerido: false, default: 'CURRENT_TIMESTAMP' }
    ]
  },
  'DetallesDeRuta': {
    table: 'detalles_ruta',
    routes: ['GET', 'POST', 'PUT', 'DELETE'],
    fields: [
      { name: 'ruta_id', type: 'INT', requerido: true },
      { name: 'cliente_id', type: 'INT', requerido: true },
      { name: 'orden_entrega', type: 'INT', requerido: true },
      { name: 'estado', type: "ENUM('pendiente', 'en_camino', 'entregado')", requerido: false, default: "'pendiente'" },
      { name: 'observaciones', type: 'TEXT', requerido: false }
    ]
  },
  'RutaTransportista': {
    table: 'ubicaciones_transportista',
    routes: ['GET', 'POST', 'PUT'],
    fields: [
      { name: 'transportista_id', type: 'INT', requerido: true },
      { name: 'latitud', type: 'DECIMAL(10, 8)', requerido: true },
      { name: 'longitud', type: 'DECIMAL(11, 8)', requerido: true },
      { name: 'velocidad', type: 'DECIMAL(5, 2)', requerido: false, default: '0' },
      { name: 'direccion', type: 'VARCHAR(255)', requerido: false }
    ]
  }
};

// Función para generar código de rutas automáticamente
function generarCodigoRutas(nombreComponente, config) {
  const nombreArchivo = nombreComponente.toLowerCase().replace('componente', '');
  
  return `
const express = require("express");
const router = express.Router();
const { db, ejecutarQuery } = require("../config/database");

// GET - Obtener todos los registros
router.get("/", async (req, res) => {
  try {
    const results = await ejecutarQuery(\`SELECT * FROM \${config.table} ORDER BY created_at DESC\`);
    res.json(results);
  } catch (error) {
    console.error("Error obteniendo ${config.table}:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET - Obtener un registro por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const results = await ejecutarQuery(\`SELECT * FROM \${config.table} WHERE id = ?\`, [id]);
    
    if (results.length === 0) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }
    
    res.json(results[0]);
  } catch (error) {
    console.error("Error obteniendo ${config.table} por ID:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// POST - Crear nuevo registro
router.post("/", async (req, res) => {
  try {
    const campos = Object.keys(req.body);
    const valores = Object.values(req.body);
    
    const placeholders = campos.map(() => '?').join(', ');
    const sql = \`INSERT INTO \${config.table} (\${campos.join(', ')}) VALUES (\${placeholders})\`;
    
    const result = await ejecutarQuery(sql, valores);
    res.status(201).json({ 
      mensaje: "Registro creado exitosamente", 
      id: result.insertId 
    });
  } catch (error) {
    console.error("Error creando ${config.table}:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// PUT - Actualizar registro
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const campos = Object.keys(req.body);
    const valores = Object.values(req.body);
    
    const setClause = campos.map(campo => \`\${campo} = ?\`).join(', ');
    const sql = \`UPDATE \${config.table} SET \${setClause} WHERE id = ?\`;
    
    await ejecutarQuery(sql, [...valores, id]);
    res.json({ mensaje: "Registro actualizado exitosamente" });
  } catch (error) {
    console.error("Error actualizando ${config.table}:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// DELETE - Eliminar registro
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await ejecutarQuery(\`DELETE FROM \${config.table} WHERE id = ?\`, [id]);
    res.json({ mensaje: "Registro eliminado exitosamente" });
  } catch (error) {
    console.error("Error eliminando ${config.table}:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;
`;
}

// Función para sincronizar componentes
async function sincronizarComponentes() {
  const componentesPath = path.join(__dirname, '../../frontend/src/Componentes');
  
  try {
    const archivos = fs.readdirSync(componentesPath);
    
    for (const archivo of archivos) {
      if (archivo.endsWith('.jsx')) {
        const nombreComponente = archivo.replace('.jsx', '');
        
        if (componentMapping[nombreComponente]) {
          const config = componentMapping[nombreComponente];

          // Si está marcado para no generar, saltar
          if (config.generate === false) {
            continue;
          }
          
          // Generar código de rutas
          const codigoRutas = generarCodigoRutas(nombreComponente, config);
          
          // Escribir archivo de funcionamiento
          const rutaArchivo = path.join(__dirname, '../funcionamiento', `${nombreComponente.toLowerCase()}.js`);
          fs.writeFileSync(rutaArchivo, codigoRutas);
          
          console.log(` Sincronizado: ${nombreComponente} -> ${rutaArchivo}`);
        }
      }
    }
    
    console.log(" Sincronización de componentes completada");
  } catch (error) {
    console.error(" Error en sincronización:", error);
  }
}

module.exports = {
  sincronizarComponentes,
  componentMapping,
  generarCodigoRutas
};
