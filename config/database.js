const mysql = require("mysql2");

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true, 
  connectionLimit: 10,     
  queueLimit: 0            
};

if (!dbConfig.host || !dbConfig.user || !dbConfig.password || !dbConfig.database) {
  console.error("❌ ERROR CRÍTICO: Faltan una o más variables de entorno para la conexión a la base de datos.");
  console.error("Asegúrate de que DB_HOST, DB_USER, DB_PASSWORD, DB_NAME estén configuradas en Railway.");
  process.exit(1);
}

const pool = mysql.createPool(dbConfig); // <--- ¡USAMOS pool!

// Crear conexión
const db = mysql.createConnection(dbConfig);

// Conectar a la base de datos
async function initializeDatabase() {
    try {
        // Intenta obtener una conexión del pool para verificar que funciona
        const connection = await pool.getConnection();
        console.log("Conectado a MySQL a través del pool!");
        connection.release(); // Libera la conexión de vuelta al pool

        // Ahora, inicializa las tablas
        await inicializarTablas(); 
        console.log("✅ Todas las tablas han sido inicializadas correctamente");

    } catch (err) {
        console.error("❌ Error al inicializar la base de datos:", err.message);
        throw err; // Propaga el error para que `app.js` pueda atraparlo
    }
}

// Función para inicializar todas las tablas necesarias
async function inicializarTablas() {
  try {
    // Crear base de datos si no existe
    await ejecutarQuery(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await ejecutarQuery(`USE ${dbConfig.database}`);

    // Tabla de usuarios
    await ejecutarQuery(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(100) NOT NULL,
        rol ENUM('administrador', 'transportista') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Tabla de clientes
    await ejecutarQuery(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        direccion VARCHAR(255) NOT NULL,
        contacto VARCHAR(50) NOT NULL,
        pedido TEXT NOT NULL,
        foto_id VARCHAR(255) DEFAULT NULL,
        latitud DECIMAL(10, 8) DEFAULT NULL,
        longitud DECIMAL(11, 8) DEFAULT NULL,
        estado ENUM('pendiente', 'en_ruta', 'entregado') DEFAULT 'pendiente',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Asegurar columna 'estado' en clientes (para bases ya creadas)
    try {
      const col = await ejecutarQuery(
        `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'clientes' AND COLUMN_NAME = 'estado'`,
        [dbConfig.database]
      );
      if (!col || !col[0] || Number(col[0].cnt) === 0) {
        await ejecutarQuery(
          `ALTER TABLE clientes ADD COLUMN estado ENUM('pendiente','en_ruta','entregado') DEFAULT 'pendiente'`
        );
        console.log("✅ Columna 'estado' agregada a 'clientes'");
      }
    } catch (e) {
      console.warn("No fue posible verificar/agregar columna 'estado' en 'clientes':", e.message);
    }

    // Asegurar columna 'transportista_id' en clientes (para bases ya creadas)
    try {
      const colTransportista = await ejecutarQuery(
        `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'clientes' AND COLUMN_NAME = 'transportista_id'`,
        [dbConfig.database]
      );
      if (!colTransportista || !colTransportista[0] || Number(colTransportista[0].cnt) === 0) {
        await ejecutarQuery(
          `ALTER TABLE clientes ADD COLUMN transportista_id INT DEFAULT NULL, ADD FOREIGN KEY (transportista_id) REFERENCES usuarios(id) ON DELETE SET NULL`
        );
        console.log("✅ Columna 'transportista_id' agregada a 'clientes'");
      }
    } catch (e) {
      console.warn("No fue posible verificar/agregar columna 'transportista_id' en 'clientes':", e.message);
    }

    // Tabla de rutas
    await ejecutarQuery(`
      CREATE TABLE IF NOT EXISTS rutas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        transportista_id INT,
        estado ENUM('activa', 'completada', 'cancelada') DEFAULT 'activa',
        fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_fin TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (transportista_id) REFERENCES usuarios(id) ON DELETE SET NULL
      )
    `);

    // Tabla de detalles de ruta
    await ejecutarQuery(`
      CREATE TABLE IF NOT EXISTS detalles_ruta (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ruta_id INT NOT NULL,
        cliente_id INT NOT NULL,
        orden_entrega INT NOT NULL,
        estado ENUM('pendiente', 'en_camino', 'entregado') DEFAULT 'pendiente',
        fecha_entrega TIMESTAMP NULL,
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (ruta_id) REFERENCES rutas(id) ON DELETE CASCADE,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
      )
    `);

    // Tabla de ubicaciones GPS del transportista
    await ejecutarQuery(`
      CREATE TABLE IF NOT EXISTS ubicaciones_transportista (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transportista_id INT NOT NULL,
        latitud DECIMAL(10, 8) NOT NULL,
        longitud DECIMAL(11, 8) NOT NULL,
        velocidad DECIMAL(5, 2) DEFAULT 0,
        direccion VARCHAR(255),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transportista_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);



    // Tabla de rostros de clientes
    await ejecutarQuery(`
      CREATE TABLE IF NOT EXISTS rostros_clientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cliente_id INT NOT NULL UNIQUE,
        imagen_rostro LONGTEXT NOT NULL,
        confianza_deteccion DECIMAL(5, 2) NOT NULL,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
      )
    `);

    // Tabla de verificaciones faciales
    await ejecutarQuery(`
      CREATE TABLE IF NOT EXISTS verificaciones_faciales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cliente_id INT NOT NULL,
        transportista_id INT NOT NULL,
        confianza DECIMAL(5, 2) NOT NULL,
        resultado ENUM('exitoso', 'fallido') NOT NULL,
        fecha_verificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        observaciones TEXT,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
        FOREIGN KEY (transportista_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);

    // Insertar usuario por defecto si no existe
    await ejecutarQuery(`
      INSERT IGNORE INTO usuarios (email, password, rol)
      VALUES ('matias.vp232@gmail.com', 'leica666', 'administrador')
    `);

    console.log("✅ Todas las tablas han sido inicializadas correctamente");
  } catch (error) {
    console.error("❌ Error inicializando tablas:", error);
  }
}

// Función helper para ejecutar queries
async function ejecutarQuery(sql, params = []) {
  const connection = await pool.getConnection(); // Obtiene una conexión del pool
  try {
    const [results] = await connection.execute(sql, params); // Usa .execute con Promesas
    return results;
  } finally {
    connection.release(); // SIEMPRE libera la conexión de vuelta al pool
  }
}

// Función para crear tablas dinámicamente basadas en componentes
async function crearTablaDesdeComponente(nombreComponente, campos) {
  try {
    const nombreTabla = nombreComponente.toLowerCase().replace('componente', '');
    
    let sql = `CREATE TABLE IF NOT EXISTS ${nombreTabla} (`;
    sql += `id INT AUTO_INCREMENT PRIMARY KEY, `;
    
    campos.forEach((campo, index) => {
      sql += `${campo.nombre} ${campo.tipo}`;
      if (campo.requerido) sql += ' NOT NULL';
      if (campo.default) sql += ` DEFAULT ${campo.default}`;
      if (index < campos.length - 1) sql += ', ';
    });
    
    sql += `, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, `;
    sql += `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`;
    
    await ejecutarQuery(sql);
    console.log(`✅ Tabla ${nombreTabla} creada/actualizada desde componente ${nombreComponente}`);
  } catch (error) {
    console.error(`❌ Error creando tabla desde componente ${nombreComponente}:`, error);
  }
}

module.exports = {
  db: pool, // <--- Exporta el pool en lugar de la conexión simple para otros módulos
  ejecutarQuery,
  crearTablaDesdeComponente,
  initializeDatabase // <--- ¡EXPORTA LA FUNCIÓN DE INICIALIZACIÓN!
};
