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
                'http://localhost:3000',
                'http://localhost:8080',
                'http://127.0.0.1:5173',
                'http://127.0.0.1:5175',
                'http://127.0.0.1:3000',
                'http://127.0.0.1:8080',
                'http://192.168.1.21:5173',
                'capacitor://localhost',
                /^capacitor:\/\/localhost(\/.*)?$/,
                'https://proyectodetitulo-3f8ce.web.app',
                'https://backend-production-46b4a.up.railway.app' // Add Railway domain
            ],
            credentials: true,
            optionsSuccessStatus: 200,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        };

// Aplicar CORS con las opciones
app.use(cors(corsOptions));

// Additional CORS headers for preflight requests
app.use((req, res, next) => {
    const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:5175',
        'http://localhost:3000',
        'http://localhost:8080',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5175',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8080',
        'http://192.168.1.21:5173',
        'capacitor://localhost',
        'https://proyectodetitulo-3f8ce.web.app',
        'https://backend-production-46b4a.up.railway.app'
    ];

    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin) || allowedOrigins.some(o => typeof o === 'object' && o.test && o.test(origin))) {
        res.header('Access-Control-Allow-Origin', origin);
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
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



const PORT = process.env.PORT || 4000; // Railway usará el PORT que asigne, si no, usa 4000
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Servidor backend corriendo en el puerto ${PORT}`);
        });
