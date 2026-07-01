# Documentación de API Integrada: Stripe

## ¿Qué API se utiliza?

Se utiliza la API de Stripe, una plataforma de procesamiento de pagos electrónicos que permite integrar pagos con tarjetas de crédito y débito de forma segura mediante servicios REST y SDK oficiales.

**Proveedor:** Stripe Inc.  
**Tipo de API:** REST API.

## ¿Para qué se utiliza?

La API de Stripe se utiliza para procesar pagos con tarjeta dentro del módulo POS (Punto de Venta) del sistema PanaPina.

Su objetivo es permitir que el cajero registre ventas utilizando tarjetas bancarias como método de pago, garantizando la seguridad de la información financiera y evitando que el sistema almacene directamente los datos sensibles de las tarjetas.

Cuando el pago es aprobado, el sistema registra la venta en la base de datos y continúa con el flujo normal del proceso de venta.

## ¿Cómo se utiliza?

### Tipo de autenticación

La integración utiliza dos mecanismos de autenticación:

- JWT (Bearer Token) para verificar que únicamente usuarios autenticados (empleados o administradores) puedan acceder al servicio de pago.
- Secret API Key de Stripe, almacenada en variables de entorno (.env), utilizada por el servidor para comunicarse con la plataforma Stripe.

### Endpoint consumido

| Método | Endpoint            | Descripción                                            |
| ------ | ------------------- | ------------------------------------------------------ |
| POST   | /api/stripe/payment | Crea un PaymentIntent para iniciar el proceso de pago. |

### Flujo de información

1. El cajero registra los productos de la venta desde el módulo POS.
2. Selecciona "Tarjeta" como método de pago.
3. El frontend envía una solicitud POST al endpoint /api/stripe/payment incluyendo el monto y la moneda.

   Ejemplo:

   ```json
   {
     "amount": 1500,
     "currency": "mxn"
   }
   ```

4. El backend utiliza el SDK oficial de Stripe para Node.js y crea un PaymentIntent.
5. Stripe responde con: client_secret, payment_intent_id y estado inicial del pago.
6. El frontend utiliza Stripe Elements para mostrar el formulario seguro de captura de tarjeta.
7. El usuario introduce los datos de su tarjeta.
8. El frontend llama al método stripe.confirmCardPayment(client_secret) para confirmar el pago.
9. Stripe procesa la transacción y devuelve el resultado.
   - Si el pago fue aprobado (succeeded): se registra la venta en PostgreSQL, se almacena el método de pago como "Tarjeta" y se continúa con el proceso normal de venta.
   - Si ocurre un error: la venta no se registra y el sistema muestra el mensaje correspondiente al usuario.

### Datos intercambiados

Entre la aplicación y Stripe se intercambian los siguientes datos:

| Dato              | Descripción                                                 |
| ----------------- | ----------------------------------------------------------- |
| amount            | Monto de la venta en centavos.                              |
| currency          | Moneda utilizada (MXN).                                     |
| client_secret     | Token temporal para confirmar el pago.                      |
| payment_intent_id | Identificador único del pago generado por Stripe.           |
| payment_method    | Método de pago utilizado (Tarjeta).                         |
| payment_status    | Estado del pago (succeeded, requires_payment_method, etc.). |

### Tecnologías utilizadas

| Elemento            | Tecnología              |
| ------------------- | ----------------------- |
| Frontend            | React + Vite            |
| Backend             | Node.js + Express       |
| Base de datos       | PostgreSQL              |
| SDK                 | Stripe SDK para Node.js |
| Biblioteca Frontend | Stripe Elements         |
| Comunicación        | HTTPS + JSON            |
| Autenticación       | JWT + Secret API Key    |

---

# Documentación del Sistema de Chatbot - APIs Implementadas

## API 1: Lucide React

### ¿Qué API se utiliza?

**Lucide React** - Librería de iconos React de código abierto que proporciona iconos SVG escalables y personalizables.

**Proveedor:** Lucide (Librería open-source)  
**Tipo:** Librería de componentes React

### ¿Para qué se utiliza?

Lucide React se utiliza para renderizar los iconos y elementos visuales del ChatboxWidget del sistema PanaPina.

Su objetivo es proporcionar una interfaz visual consistente y moderna para:

- Ícono de mensaje (botón flotante del chatbot)
- Ícono de cierre (X para cerrar ventana)
- Ícono de envío (flecha para enviar mensajes)
- Ícono de estrellas (decorativo en header del bot)

### ¿Cómo se utiliza?

**Tipo de instalación:** NPM package (npm install lucide-react)

**Componentes consumidos:**

| Componente    | Ubicación                 | Uso                                   |
| ------------- | ------------------------- | ------------------------------------- |
| MessageSquare | ChatboxWidget.jsx línea 2 | Ícono del botón flotante de chat      |
| X             | ChatboxWidget.jsx línea 2 | Ícono para cerrar la ventana del chat |
| Send          | ChatboxWidget.jsx línea 2 | Ícono del botón de enviar mensajes    |
| Sparkles      | ChatboxWidget.jsx línea 2 | Ícono decorativo en el header del bot |

**Implementación:**

```jsx
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';

// Uso en componentes JSX
<MessageSquare size={24} color="#fff" />
<X size={18} color="var(--text-muted)" />
<Send size={16} color="var(--primary)" />
<Sparkles size={16} color="#fff" />
```

**Datos intercambiados:** Ninguno (es una librería local, no API remota)

**Stack:**

- Framework: React
- Type: Componentes SVG escalables
- Ubicación: package.json

---

## API 2: Gemini API

### ¿Qué API se utiliza?

**Google Gemini API** - Plataforma de inteligencia artificial generativa desarrollada por Google que proporciona modelos de lenguaje de última generación para procesar lenguaje natural.

**Proveedor:** Google Cloud  
**Tipo:** REST API con autenticación por API Key

### ¿Para qué se utiliza?

Gemini API se utiliza para procesar el lenguaje natural de los usuarios y generar respuestas inteligentes contextualizadas en el dominio de PanaPina.

Su objetivo es:

- Entender preguntas en lenguaje natural sobre operaciones de panadería
- Generar respuestas relevantes sobre: ventas, turnos, productos, reportes, caja
- Mantener conversaciones coherentes y útiles
- Proporcionar IA conversacional automática sin intervención humana
- Responder dudas de clientes sobre productos y procedimientos

### ¿Cómo se utiliza?

**Autenticación:**

- API Key almacenada en variables de entorno (GEMINI_API_KEY en .env)
- Se envía en header de autorización de la petición

**Endpoint consumido:**

| Método | URL                                                                            | Descripción                       |
| ------ | ------------------------------------------------------------------------------ | --------------------------------- |
| POST   | https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent | Genera contenido/respuestas de IA |

**Flujo de información:**

1. Usuario escribe mensaje en el ChatboxWidget de PanaPina: "¿Cómo hago un corte de caja?"
2. Frontend envía POST a backend local /api/chat:

   ```json
   {
     "message": "¿Cómo hago un corte de caja?",
     "usuario_id": 1
   }
   ```

3. Backend construye prompt contextualizado con información de PanaPina:

   ```
   Eres PinaBot, asistente virtual de la panadería PanaPina.
   Eres experto en operaciones de panadería: ventas, turnos, productos, caja.
   Usuario: Administrador
   Pregunta: "¿Cómo hago un corte de caja?"
   ```

4. Backend envía POST a Gemini API:

   ```json
   {
     "contents": [
       {
         "parts": [
           {
             "text": "[prompt contextualizado]"
           }
         ]
       }
     ],
     "generationConfig": {
       "temperature": 0.7,
       "maxOutputTokens": 500
     }
   }
   ```

5. Gemini procesa el texto con modelo gemini-pro y aplica contexto de IA
6. Gemini retorna respuesta:

   ```json
   {
     "candidates": [
       {
         "content": {
           "parts": [
             {
               "text": "Para hacer un corte de caja en PanaPina debes: 1. Completar todas las ventas del turno 2. Registrar retiros de efectivo..."
             }
           ]
         }
       }
     ]
   }
   ```

7. Backend extrae response.candidates[0].content.parts[0].text
8. Backend retorna al frontend:

   ```json
   {
     "success": true,
     "response": "Para hacer un corte de caja en PanaPina debes..."
   }
   ```

9. Frontend renderiza respuesta en el widget de chat

**Datos intercambiados:**

| Dato        | Tipo     | Descripción                               |
| ----------- | -------- | ----------------------------------------- |
| message     | string   | Mensaje del usuario (máx 1000 caracteres) |
| response    | string   | Respuesta generada por Gemini IA          |
| tokens_used | integer  | Cantidad de tokens consumidos             |
| timestamp   | ISO 8601 | Hora del mensaje                          |

**Configuración en backend:**

```javascript
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const generationConfig = {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 500,
};
```

**Límites de la API:**

- Máximo 60 requests por minuto
- Máximo 2 millones de tokens diarios (free tier)
- Respuestas completadas en 30 segundos

---

## API 3: Tawk.to

### ¿Qué API se utiliza?

**Tawk.to** - Plataforma de chat en vivo gratuita para sitios web que permite comunicación en tiempo real entre clientes y agentes humanos.

**Proveedor:** Tawk.to Inc.  
**Tipo:** SaaS con SDK JavaScript embebido

### ¿Para qué se utiliza?

Tawk.to se utiliza para proporcionar chat en vivo humano a humano en el portal de clientes de PanaPina, cuando el cliente desea hablar con un empleado.

Su objetivo es:

- Permitir que clientes se comuniquen directamente con empleados de PanaPina
- Proporcionar soporte técnico en tiempo real (consultas de pedidos, promociones)
- Resolver dudas de compra antes de completar transacción
- Complementar al chatbot automático (Gemini) con atención personalizada

### ¿Cómo se utiliza?

**Autenticación:**

- Ninguna en cliente (widget público)
- Account ID y Chat Widget ID de Tawk.to en configuración

**Implementación - Script embebido en index.html:**

```html
<script>
  var Tawk_API = Tawk_API || {},
    Tawk_LoadStart = new Date();
  (function () {
    var s1 = document.createElement("script"),
      s0 = document.getElementsByTagName("script")[0];
    s1.async = true;
    s1.src = "https://embed.tawk.to/ACCOUNT_ID/CHAT_WIDGET_ID";
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin", "*");
    s0.parentNode.insertBefore(s1, s0);
  })();
</script>
```

**Flujo de conversación en tiempo real:**

1. Cliente hace clic en el widget de Tawk.to (ícono flotante)
2. Widget se abre mostrando estado de disponibilidad de agentes y opción de enviar mensaje o esperar agente
3. Tawk.to conecta automáticamente con empleado disponible en turno según prioridad y especialidad, en tiempo real vía WebSocket
4. Chat en vivo entre cliente y empleado con mensajes instantáneos, soporte para archivos/imágenes e historial visible para ambas partes
5. Historial registrado en panel de Tawk.to (para empleados) y email automático (para cliente)

**Configuración de agentes:**

```javascript
{
  "agent_name": "Juan Pérez",
  "status": "online",
  "department": "Ventas",
  "response_time": "1 min",
  "availability": "Disponible"
}
```

**Datos intercambiados:**

| Dato            | Descripción                     |
| --------------- | ------------------------------- |
| visitor_name    | Nombre del cliente              |
| visitor_email   | Email del cliente               |
| message_text    | Contenido del mensaje           |
| timestamp       | Hora exacta del mensaje         |
| agent_name      | Nombre del empleado que atiende |
| conversation_id | ID único de la conversación     |
| attachment_url  | URL de archivos compartidos     |

**Stack tecnológico:**

- Protocolo: WebSocket (tiempo real)
- Almacenamiento: Servidores Tawk.to
- Disponibilidad: 24/7 (cuando hay agentes online)
- Escalabilidad: Automática según número de chats

---

## Stack Tecnológico Final del Chatbot

| Componente        | Tecnología   | Ubicación         |
| ----------------- | ------------ | ----------------- |
| UI & Iconos       | Lucide React | package.json      |
| Componente Chat   | React        | ChatboxWidget.jsx |
| IA Automática     | Gemini API   | Google Cloud      |
| Chat Humano       | Tawk.to      | SaaS externo      |
| Comunicación IA   | HTTPS + REST | HTTP POST         |
| Comunicación Chat | WebSocket    | Real-time         |

---

## Flujo Completo del Sistema

```
┌─────────────────────────────────────────┐
│  Usuario en Portal PanaPina             │
└────────────┬────────────────────────────┘
             │
             ├──→ ¿Pregunta sobre operaciones?
             │    (Ventas, turnos, productos, etc.)
             │
             ├────→ Haz clic en ChatboxWidget
             │      │
             │      ├─→ Frontend envía → /api/chat
             │      │    Backend procesa
             │      │    │
             │      │    ├─→ POST a Gemini API
             │      │    │   (IA responde)
             │      │    │
             │      │    └─→ Backend retorna respuesta
             │      │
             │      └─→ Frontend muestra respuesta IA
             │
             └────→ ¿Necesita hablar con empleado?
                    │
                    ├─→ Haz clic en "Chat con Agente"
                    │   (o automático si no se resuelve)
                    │
                    ├─→ Tawk.to se activa
                    │   │
                    │   ├─→ Busca agente disponible
                    │   │   en PanaPina
                    │   │
                    │   └─→ Chat en vivo (tiempo real)
                    │
                    └─→ Conversación con empleado
                        (historizado en Tawk.to)
```

---

## Resumen de Implementación

| API          | Estado       | Propósito                  |
| ------------ | ------------ | -------------------------- |
| Lucide React | Implementado | Iconos del widget          |
| Gemini API   | Implementado | Respuestas automáticas IA  |
| Tawk.to      | Implementado | Chat en vivo con empleados |

---

## Galería de Imágenes

### API CHATBOT

Icon de ChatBot
<img src="![alt text](image-4.png)" width="100"/>

Pantalla de inicio
<img src="![alt text](image-1.png)" width="100"/>

Pregunta sugerida
<img src="![alt text](image-2.png)" width="100"/>

Pregunta "¿Como va el inventario?"
<img src="![alt text](image-3.png)" width="100"/>

### API STRIPE

Inicio al seleccionar, "Tarjeta"
<img src="![alt text](image-5.png)" width="100"/>

Llenado de datos
<img src="![alt text](image-6.png)" width="100"/>

Muestra de error
<img src="![alt text](image-7.png)" width="100"/>

Confirmación de pago
<img src="![alt text](image-8.png)" width="100"/>

