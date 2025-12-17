const express = require('express');
const cors = require('cors');
const path = require('path');
const clientes_router = require('./funcionamiento/clientecomponentes');
const clientes = require('./funcionamiento/clientes');
const registroFacialRouter = require('./funcionamiento/RegistroFacial');
const loginRouter = require('./funcionamiento/login');
const detallespedidos = require('./funcionamiento/detallespedidos');
const faceVerificacionRouter = require('./funcionamiento/FaceVerificacion'); // ✅ NUEVO
const uploadFotoRouter = require('./funcionamiento/uploadFoto'); // ✅ NUEVO
const transportistasRouter = require('./funcionamiento/transportistas'); // ✅ NUEVO
const ubicacionesTransportistaRouter = require('./funcionamiento/ubicacionesTransportista'); // ✅ NUEVO

const app = express();

// Configuración CORS
const corsOptions = {
            origin: [
                'http://localhost:5173',
                'http://localhost:5175',
                'http://192.168.1.21:5173',
                'capacitor://localhost',
                /^capacitor:\/\/localhost(\/.*)?$/,
                'https://proyectodetitulo-3f8ce.web.app' // <-- ¡Añade esta línea!
            ],
            credentials: true,
            optionsSuccessStatus: 200
        };

// Aplicar CORS con las opciones
app.use(cors(corsOptions));

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



const PORT = process.env.PORT || 4000; // Railway usará el PORT que asigne, si no, usa 4000
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Servidor backend corriendo en el puerto ${PORT}`);
        });
