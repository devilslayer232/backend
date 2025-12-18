const express = require('express');
const cors = require('cors');
const path = require('path');
const clientes_router = require('./funcionamiento/clientecomponentes');
const clientes = require('./funcionamiento/clientes');
const registroFacialRouter = require('./funcionamiento/RegistroFacial');
const loginRouter = require('./funcionamiento/login');
const detallespedidos = require('./funcionamiento/detallespedidos');
const faceVerificacionRouter = require('./funcionamiento/FaceVerificacion'); 
const uploadFotoRouter = require('./funcionamiento/uploadFoto'); 
const transportistasRouter = require('./funcionamiento/transportistas'); 
const ubicacionesTransportistaRouter = require('./funcionamiento/ubicacionesTransportista');
const { initializeDatabase } = require('./config/database'); 

const app = express();

// test Configuración CORS - Allow all origins for now to debug
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Middlewares
app.use(express.json({ limit: '50mb' }));


// Rutas de API
app.use('/api/clientes_componentes', clientes_router);
app.use("/api/clientes", clientes);
app.use("/api/detallespedidos", detallespedidos);
app.use("/api/login", loginRouter);
app.use('/api/registro-facial', registroFacialRouter);
app.use('/api/faceverificacion', faceVerificacionRouter); // ✅ NUEVO
app.use('/api/upload-foto', uploadFotoRouter); // ✅ NUEVO
app.use('/api/transportistas', transportistasRouter); // ✅ NUEVO
app.use('/api/ubicaciones-transportista', ubicacionesTransportistaRouter); // ✅ NUEVO



async function startApplication() {
    try {
        await initializeDatabase(); // Espera a que la DB se conecte y las tablas se inicien

        const PORT = process.env.PORT || 8080;
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Servidor backend escuchando en el puerto ${PORT}`);
        });

    } catch (error) {
        console.error("❌ ERROR CRÍTICO al iniciar la aplicación:", error);
        process.exit(1); // Salir si la DB o el servidor fallan al iniciar
    }
}

startApplication();
