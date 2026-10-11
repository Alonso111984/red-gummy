# Red Gummy — Sabor que te prende

Aplicación de pedidos con catálogo, carrito y checkout por WhatsApp. Las fotos y el logo originales se conservan sin alteraciones.

- Santa Elena: envío gratis. La Libertad: $1,50. Salinas: $2,50.
- Únicamente delivery y pago en efectivo al recibir.
- Gomitas: una funda $3; cada par $5. La promoción se aplica automáticamente.
- WhatsApp: +593 993504478.
- Atención: lunes a sábado, 08:00 a 20:00, horario de Ecuador.
- El GPS es voluntario. Se puede continuar con dirección escrita.
- Preparar el mensaje no envía ni confirma el pedido. El comprador pulsa Enviar en WhatsApp y el negocio confirma.
- Fuera de horario se puede preparar una solicitud, con aviso de atención dentro del horario del negocio.

Configuración del negocio: `public/business.json`. Fuentes: `src/`. Compilación: `npm ci` y `npm run build`. Pruebas: `npm test`. Archivos del sitio: `dist/`.

Verificación: compilación y pruebas automatizadas. Revisión visual en navegador, GPS real e instalación PWA pendientes.

## Diseño compacto v2

Encabezado sticky con logo centrado, sin hero, catálogo en filas con foto a la izquierda y controles de cantidad, barra de subtotal fija y resumen sin fotografías. Layout responsive para móvil y escritorio. Fotos originales sin modificaciones. Compilación y 37 pruebas automatizadas verificadas; revisión visual en navegador pendiente.

## Flujo v3

Pie de contacto ARMAIA separado del WhatsApp de pedidos. Categorías vacías ocultas; sin filtros si solo hay una. Campos de 16 px para prevenir zoom de foco móvil sin bloquear zoom manual. Envío directo con aviso opcional de GPS, permiso voluntario y alternativa de dirección escrita. El cliente pulsa Enviar dentro de WhatsApp.
