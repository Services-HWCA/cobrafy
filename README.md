# Cobrofy

Aplicación web/PWA para gestión de cobros construida con Next.js, TypeScript, Tailwind CSS y Firebase.

## Funcionalidades del MVP

- Autenticación con Firebase Authentication.
- Aislamiento de datos por usuario en Cloud Firestore (`users/{uid}`).
- Clientes con deuda inicial, saldo, estado y archivado.
- Registro de abonos parciales o pago completo con transacciones.
- Anulación de pagos conservando el movimiento original.
- Dashboard con resumen financiero, clientes pendientes/saldados y últimos abonos.
- Historial global de pagos con filtros por periodo y cliente.
- Configuración de perfil, moneda, formato de fecha, contraseña y sesión.
- Interfaz responsive con sidebar en escritorio y barra inferior en móvil.

## Configuración de Firebase

1. Crea un proyecto en Firebase Console.
2. Habilita **Authentication > Email/Password**.
3. Crea **Cloud Firestore** en modo producción.
4. Registra la app web y copia la configuración.
5. Copia `.env.example` a `.env.local` y completa:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

6. En Firebase Console > Firestore > Rules, pega el contenido de `firestore.rules` y publica.

## Autorización de usuarios

La autorización se valida contra Firebase Authentication:

- El administrador agrega el correo del cobrador en Firebase Authentication.
- El cobrador entra en `/register`, escribe su correo y recibe un enlace para definir/restablecer contraseña.
- Si el correo no existe en Authentication, la app no permite activar acceso.
- Cada usuario solo puede leer/escribir sus propios datos gracias a las reglas de Firestore.

> Importante: para que el registro funcione correctamente, el correo debe existir previamente en Firebase Authentication. Si activaste **Email Enumeration Protection**, prueba el flujo real con un correo autorizado.

## Desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Estructura principal

```text
app/
  (auth)/          Login y activación de cuenta
  (dashboard)/     Inicio, clientes, pagos y configuración
  api/             Reservado para Route Handlers futuros
src/
  components/      UI reusable
  lib/firebase/    Cliente Firebase
  lib/services/    Servicios de Auth, clientes y pagos
  lib/utils/       Moneda, fechas y cálculos
  types/           Tipos TypeScript
firestore.rules    Reglas de seguridad de Firestore
```

## Modelo de datos

```text
users/{uid}/profile/general
users/{uid}/clients/{clientId}
users/{uid}/clients/{clientId}/payments/{paymentId}
```

Los montos se guardan en centavos enteros para evitar errores de decimales.

## Pendientes recomendados para producción

- Firebase Admin SDK para operaciones privilegiadas y auditoría.
- Paginación de clientes y pagos.
- Índices compuestos si se agregan filtros/ordenamientos complejos.
- Pruebas de reglas en Firebase Emulator Suite.
- Estrategia de respaldo/exportación de Firestore.
- PWA manifest e instalación como app.
