# ANEXO I: MEDIDAS DE SEGURIDAD IMPLEMENTADAS

## Proyecto OpenDataCapture para LABORATORIOS GEBRO PHARMA, S.A.

**Fecha de elaboración**: 28 de octubre de 2025  
**Responsable del Tratamiento**: LABORATORIOS GEBRO PHARMA, S.A.  
**Encargado del Tratamiento**: ALTA HEALTH CONSULTING, S.L.  
**Proyecto**: OpenDataCapture - Plataforma de captura de datos clínicos

---

## Control de acceso físico y del entorno:

**1. Medidas de protección ante amenazas físicas del entorno (agua, fuego, suministro eléctrico, etc.)**

Sistema desplegado en Google Cloud Platform mediante máquina virtual. GCP proporciona protección contra incendios con sistemas de supresión automática, climatización redundante para evitar sobrecalentamiento, alimentación eléctrica redundante con generadores de respaldo y sistemas UPS, y protección contra inundaciones mediante ubicación estratégica de centros de datos. Certificaciones: ISO 27001, SOC 2.

---

**2. Medidas de protección perimetral para protección contra acceso físico y manipulación no autorizada**

Google Cloud Platform proporciona seguridad perimetral física de nivel empresarial en todos sus centros de datos. Control de acceso mediante múltiples niveles de autenticación biométrica, vigilancia 24/7 con cámaras de seguridad y personal de seguridad, y sistemas de detección de intrusiones físicas. Los centros de datos de GCP cumplen con estándares internacionales de seguridad física.

---

**3. Acceso a salas y oficinas donde se procesa la información con medidas técnicas y organizativas**

Datos alojados en centros de datos de Google Cloud con acceso restringido mediante controles de seguridad física certificados (ISO 27001, SOC 2). Acceso a la consola de administración de GCP protegido mediante autenticación multifactor (MFA). Registro de auditoría de todos los accesos a la infraestructura cloud mediante Google Cloud Audit Logs.

---

**4. Salida de dispositivos con datos personales fuera de instalaciones (portátiles, discos, dispositivos extraíbles) previa autorización y con medidas de seguridad**

Los datos personales residen exclusivamente en la base de datos MongoDB en Google Cloud, no se almacenan en dispositivos locales. No se permite la descarga masiva de datos personales sin autorización administrativa mediante el sistema de roles. Sistema de exportación de datos con registro de auditoría que documenta: usuario, fecha, hora y tipo de exportación realizada. Los backups están almacenados en la misma infraestructura cloud segura. La aplicación es web-based, no requiere dispositivos móviles con datos personales.

---

## Control de acceso lógico:

**1. Garantizar que únicamente el personal autorizado podrá tener acceso a los datos personales o los sistemas y que disponga de las autorizaciones correspondientes**

Sistema de gestión de usuarios implementado con identificadores únicos (username) almacenados en MongoDB. Cada usuario dispone de credenciales únicas (usuario/contraseña) que no se comparten. Sistema de autenticación basado en JSON Web Tokens (JWT) con expiración de 24 horas. Control de acceso a nivel de API con respuestas HTTP 401 (no autenticado) y 403 (no autorizado). Los permisos se validan en cada petición HTTP contra el JWT del usuario.

---

**2. Asignar identificador unívoco y contraseña a cada cuenta de usuario que no deberá compartirse con terceros**

Cada usuario tiene un identificador único (username) almacenado en base de datos MongoDB. Las contraseñas son individuales y se almacenan mediante hash con sal utilizando el algoritmo PBKDF2 (Password-Based Key Derivation Function 2). No se permite compartir credenciales entre usuarios. El sistema valida credenciales únicas en cada inicio de sesión mediante autenticación JWT.

---

**3. Los cambios en cuentas de usuario (alta, modificación, baja) deberán disponer de registros (logs) y estar documentados**

Sistema de logs implementado mediante NestJS logger que registra operaciones de usuarios (alta, modificación, baja). Los logs incluyen: usuario que realiza la acción, timestamp, tipo de operación. PENDIENTE: Implementar audit log completo que incluya todos los cambios en cuentas con registro de usuario responsable, fecha/hora exacta, y tipo de modificación realizada.

---

**4. Revocar autorizaciones de forma inmediata cuando la relación contractual haya finalizado o precise actualizarse**

Sistema permite la desactivación inmediata de cuentas de usuario mediante cambio de estado en base de datos. Los tokens JWT tienen expiración de 24 horas, lo que limita el acceso tras revocación. Al deshabilitar una cuenta, el usuario no puede obtener nuevos tokens. PENDIENTE: Implementar invalidación inmediata de tokens JWT activos mediante lista negra o sistema de revocación de tokens.

---

**5. Restringir cuentas privilegiadas exclusivamente a personal autorizado y limitadas en número**

Sistema de roles con tres niveles: Admin (acceso completo), Group Manager (gestión de grupo), y Standard User (permisos limitados). Las cuentas Admin tienen acceso completo al sistema y están limitadas a personal autorizado. Se recomienda crear un único usuario Admin y elevar privilegios temporalmente cuando sea necesario. Cada rol implementado mediante sistema CASL de control de acceso basado en atributos.

---

**6. Conceder cuentas privilegiadas únicamente a personal cualificado técnicamente con formación específica**

Las cuentas privilegiadas (Admin) se asignan únicamente a personal técnico cualificado de Alta Health Consulting con conocimiento del sistema. PENDIENTE: Documentar procedimiento formal de asignación de cuentas privilegiadas que incluya requisitos de formación, proceso de aprobación, y registro de personal autorizado.

---

**7. Disponer dos cuentas para usuarios que requieran privilegios: una estándar y una privilegiada**

PENDIENTE: Implementar sistema de doble cuenta para administradores. Actualmente los usuarios Admin utilizan una única cuenta con permisos elevados. Recomendación: Crear cuentas estándar para tareas rutinarias y cuentas Admin separadas para operaciones privilegiadas, siguiendo el principio de mínimo privilegio operacional.

---

**8. Prevenir revelación no autorizada de credenciales de autenticación**

Las contraseñas se almacenan hasheadas con PBKDF2 (no en texto plano), imposibilitando su recuperación. Los tokens JWT se transmiten únicamente mediante HTTPS con TLS 1.2/1.3. No se exponen credenciales en logs ni respuestas de API. Los tokens tienen expiración de 24 horas. PENDIENTE: Implementar política formal de gestión de credenciales y formación a usuarios sobre protección de contraseñas.

---

**9. Contraseñas almacenadas de forma cifrada en los sistemas de información**

Las contraseñas se almacenan hasheadas con PBKDF2 (Password-Based Key Derivation Function 2) con sal única para cada usuario. No se almacenan contraseñas en texto plano. El algoritmo PBKDF2 es resistente a ataques de fuerza bruta mediante iteraciones configurables. Las contraseñas hasheadas se almacenan en MongoDB y son irrecuperables.

---

**10. Cambio obligatorio de contraseña tras ingreso de contraseña inicial**

El sistema permite configurar el requisito de cambio de contraseña en primera conexión mediante funcionalidad incorporada en el módulo de autenticación. PENDIENTE: Forzar automáticamente el cambio de contraseña inicial para todas las cuentas nuevas mediante implementación de flag "mustChangePassword" en modelo de usuario.

---

**11. Validez máxima de contraseña de un año con cambio obligatorio forzoso**

PENDIENTE: Implementar política de expiración de contraseñas con validez máxima de 1 año. Actualmente no existe caducidad automática de contraseñas. Requiere: campo "passwordExpiresAt" en modelo Usuario, validación en cada login, notificaciones previas a expiración, y forzado de cambio al cumplir 365 días.

---

**12. Longitud mínima de contraseña de 8 caracteres (mayúsculas, minúsculas, números y caracteres especiales)**

Sistema valida la fortaleza de la contraseña mediante la librería @douglasneuroinformatics/libpasswd. Se requiere contraseña con suficiente complejidad evaluada mediante score de fortaleza. La validación incluye longitud mínima y combinación de tipos de caracteres. El sistema rechaza contraseñas débiles en el registro y cambio de contraseña.

---

**13. Número máximo de intentos fallidos consecutivos de 5 antes de bloqueo de cuenta**

PENDIENTE: Implementar bloqueo automático tras 5 intentos fallidos consecutivos. Actualmente el sistema registra intentos fallidos en logs pero no bloquea cuentas automáticamente. Requiere: contador de intentos fallidos en modelo Usuario, reset tras login exitoso, bloqueo temporal/permanente de cuenta, y proceso de desbloqueo administrativo.

---

**14. Requerimientos de contraseñas forzados en el sistema**

Los requisitos de complejidad están implementados mediante validación en el backend con librería @douglasneuroinformatics/libpasswd y esquemas Zod. La longitud mínima y complejidad se validan en registro y cambio de contraseña. PENDIENTE: Implementar validación de expiración (1 año), bloqueo tras intentos fallidos (5 intentos), y cambio obligatorio inicial.

---

**15. Cuentas privilegiadas utilizan mecanismos de autenticación fuertes**

Las cuentas Admin utilizan autenticación JWT con tokens firmados digitalmente. Acceso a consola de administración de GCP protegido mediante autenticación multifactor (MFA). PENDIENTE: Implementar MFA para cuentas Admin del sistema OpenDataCapture mediante TOTP (Google Authenticator, Authy) o WebAuthn para añadir capa adicional de seguridad.

---

**16. Disponer distintos roles y permisos para que cada usuario acceda únicamente a datos autorizados**

Sistema de autorización basado en atributos mediante librería CASL. Tres roles implementados: Admin (acceso completo), Group Manager (gestión de grupo y lectura de datos), Standard User (permisos limitados a instrumentos propios). Permisos granulares por acción (create, read, update, delete, manage) y recurso (User, Group, Instrument, Session, Subject). Sistema de grupos permite segmentación de datos por departamento/proyecto.

---

**17. Asignación de autorizaciones y roles según segregación de funciones y mínimo privilegio con validez temporal**

Roles implementados siguiendo principio de mínimo privilegio: Admin (todo), Group Manager (gestión de grupo), Standard User (consulta limitada). La segregación de funciones está implementada mediante permisos específicos por rol. PENDIENTE: Implementar validez temporal de roles con fecha de expiración automática y revisión periódica obligatoria.

---

**18. Revisar asignaciones y autorizaciones de forma regular (mínimo una vez al año)**

PENDIENTE: Establecer proceso formal de revisión anual de permisos asignados. Requiere: calendario de auditorías de acceso, procedimiento documentado de revisión, registro de revisiones realizadas, y proceso de revocación de permisos innecesarios. Recomendación: Auditoría anual de todos los usuarios Admin y Group Manager.

---

**19. Política de pantallas y mesas limpias distribuida regularmente y parte de concienciación**

PENDIENTE: Documentar política formal de pantallas y mesas limpias. Distribuir a empleados mediante programa de concienciación. Incluir: obligación de bloquear pantalla al ausentarse, prohibición de dejar información sensible visible, y políticas de escritorio limpio. Integrar en formación de onboarding y refrescos anuales.

---

**20. Protector de pantalla protegido por contraseña que se active automáticamente tras 5 minutos de inactividad**

Sesiones JWT con expiración de 24 horas implementan cierre automático de sesión tras ese período. PENDIENTE: Implementar timeout de inactividad de 5 minutos en frontend que cierre sesión automáticamente. Requiere: detección de actividad del usuario, timer de inactividad, y logout automático tras 5 minutos sin interacción.

---

**21. Empleados concienciados para bloquear pantalla al abandonar puesto de trabajo**

PENDIENTE: Implementar programa de concienciación que incluya: formación inicial sobre seguridad de la información, recordatorios periódicos sobre bloqueo de pantalla, políticas documentadas de seguridad física, y campañas de sensibilización. Distribuir política de pantallas limpias a todo el personal con acceso al sistema.

---

## Control de transferencia, almacenamiento y portabilidad:

**1. Transferencia electrónica de datos personales de forma cifrada**

Toda la comunicación se realiza mediante HTTPS con certificados SSL/TLS válidos emitidos por Let's Encrypt. Configuración de Caddy web server como reverse proxy con terminación SSL automática. Los datos en tránsito están cifrados mediante TLS 1.2/1.3. Dominio configurado: altahealthdata.com con certificado SSL de producción. Todas las peticiones HTTP se redirigen automáticamente a HTTPS.

---

**2. Datos personales almacenados de forma cifrada garantizando acceso únicamente a personas autorizadas**

Datos sensibles (contraseñas) hasheados con PBKDF2 antes de almacenamiento. Datos de asignaciones remotas cifrados mediante HybridCrypto (RSA + AES) cuando se transmiten al gateway. Control de acceso implementado mediante sistema de roles (Admin, Group Manager, Standard User) que limita acceso según permisos. PENDIENTE: Implementar cifrado at-rest para la base de datos MongoDB completa mediante MongoDB Encrypted Storage Engine.

---

**3. Interfaces con otros sistemas transmiten datos cifrados usando estándares robustos (HTTPS)**

Sistema Gateway para asignaciones remotas con comunicación HTTPS. Autenticación entre servicios mediante API key segura (variable GATEWAY_API_KEY). Tokens de asignación generados mediante SHA-256 hash. Toda comunicación entre componentes (API, Gateway, Web) utiliza HTTPS con TLS 1.2/1.3. Certificados SSL válidos de Let's Encrypt para todos los endpoints públicos.

---

**4. Transmisión mediante soporte físico formalmente documentada con proceso de autorización, registro y medidas de seguridad**

NO APLICA. El sistema no utiliza transmisión de datos mediante soporte físico. Todos los datos se transmiten electrónicamente mediante HTTPS. Si en el futuro se requiere transmisión física, se documentará proceso formal de autorización, registro de destinatarios, datos de transmisión, y medidas de seguridad (cifrado, contenedores seguros).

---

**5. Administración remota mediante canal de comunicación seguro (SSH, TLS, VPN)**

Acceso SSH al servidor Google Cloud mediante claves públicas/privadas (autenticación basada en clave, no contraseña). Administración de base de datos mediante conexión segura usando MongoDB protocol sobre TLS. Consola de administración de GCP protegida con HTTPS y autenticación multifactor (MFA). No se permite acceso remoto sin cifrado.

---

**6. Medidas técnicas que restrinjan exportación no autorizada de datos personales**

Sistema de exportación de datos con control de permisos por rol. Solo usuarios con permisos específicos pueden exportar datos. Exportación registrada en logs del sistema (usuario, fecha, tipo de datos). PENDIENTE: Implementar sistema de detección de exportaciones masivas no autorizadas mediante análisis de patrones y alertas automáticas ante comportamientos sospechosos.

---

**7. Medidas técnicas que permitan detectar transmisiones no autorizadas de datos personales**

Logs de acceso mediante Caddy web server registran todas las peticiones HTTP. Logs de aplicación mediante NestJS logger registran operaciones de exportación. PENDIENTE: Implementar SIEM o herramienta de monitorización que analice logs en tiempo real, detecte patrones anómalos de acceso/exportación, y genere alertas automáticas ante transmisiones sospechosas.

---

**8. Soportes informáticos móviles (portátiles, tabletas) que almacenen datos personales cifrados**

NO APLICA. La aplicación es web-based, no almacena datos personales en dispositivos locales ni móviles. Los datos residen exclusivamente en el servidor MongoDB en Google Cloud. No se sincronizan datos a dispositivos móviles. Los usuarios acceden mediante navegador web sin almacenamiento local persistente de datos personales.

---

**9. Autorización del Responsable previa a reubicación de datos a otro Centro de Datos, país o región**

Los datos están ubicados en Google Cloud Platform (región configurable). Cualquier migración a otro centro de datos o región requiere autorización previa por escrito del Responsable (Laboratorios Gebro Pharma). Actualmente: Servidor ubicado en Google Cloud. Proceso: solicitud formal, evaluación de impacto, aprobación del Responsable, migración planificada, y confirmación post-migración.

---

**10. Borrado seguro irrecuperable de soportes informáticos antes de retirada (USB, discos duros)**

Borrado de datos en MongoDB mediante funciones de base de datos (soft delete y hard delete disponibles). PENDIENTE: Documentar procedimiento formal de borrado seguro antes de dar de baja equipos físicos. Implementar herramientas de borrado irrecuperable (shred, wipe, DBAN) con sobrescritura múltiple. Establecer proceso de certificación de destrucción de discos.

---

## Control de gestión de incidentes de seguridad:

**1. Monitorización continua y en tiempo real de incidentes de seguridad**

Logs de aplicación implementados mediante NestJS logger. Logs de acceso mediante Caddy web server. Registro de intentos de autenticación fallidos en logs del sistema. PENDIENTE: Implementar SIEM o herramienta de monitorización centralizada en tiempo real (ELK Stack, Splunk, Graylog) que agregue logs de todos los componentes, analice eventos de seguridad, y genere alertas automáticas ante incidentes críticos.

---

**2. Procedimiento de gestión de incidencias con clasificación, priorización, escalado e información al Responsable en 24 horas**

PENDIENTE: Documentar procedimiento formal de gestión de incidentes de seguridad que incluya: criterios de clasificación por severidad (crítico, alto, medio, bajo), matriz de priorización, proceso de escalado a responsables técnicos y directivos, canal de notificación preestablecido al Responsable (email, teléfono), plantilla de notificación de brechas con requisitos GDPR (artículo 33), y plazo máximo de 24 horas desde conocimiento del incidente.

---

**3. Evaluación periódica de actualizaciones de seguridad e instalación regular mediante procedimiento formal**

Aplicación construida con dependencias modernas y actualizables mediante npm/pnpm. Uso de imágenes Docker oficiales mantenidas (Caddy, MongoDB, Node.js). PENDIENTE: Implementar proceso formal con calendario mensual de evaluación de actualizaciones, escaneo automático de vulnerabilidades en dependencias (Dependabot, Snyk, npm audit), procedimiento de testing pre-producción, y ventana de mantenimiento planificada para aplicar parches críticos.

---

**4. Escaneo regular de vulnerabilidades conocidas con clasificación por criticidad y corrección acorde**

PENDIENTE: Implementar escaneo periódico de vulnerabilidades del sistema mediante herramientas de análisis de seguridad (OWASP ZAP para aplicación web, Nessus/OpenVAS para infraestructura, Trivy para contenedores Docker). Establecer proceso de remediación basado en criticidad CVSS: crítico <7 días, alto <30 días, medio <90 días. Documentar hallazgos y acciones correctivas.

---

## Control de operación de aplicaciones TI:

**1. Desarrollo seguro con seguridad integral en ciclo de vida y estándares reconocidos (seguridad por defecto y desde diseño)**

Aplicación desarrollada con TypeScript para seguridad de tipos estática. Uso de frameworks modernos y seguros (NestJS backend, React frontend, Vite build). Validación de entrada mediante esquemas Zod en todas las API endpoints. Protección CSRF incorporada en framework NestJS. Sanitización de entrada de usuario para prevenir XSS. Código fuente versionado con Git. PENDIENTE: Documentar estándares de codificación segura adoptados (OWASP Top 10), implementar revisión de código con enfoque en seguridad, y adoptar SDLC seguro formal.

---

**2. Actividades de acceso a aplicación registradas (inicio, cierre, intentos) para usuarios y administradores con identificación de quién, cuándo y tipo**

Logs de autenticación implementados: registro de inicio de sesión exitoso, cierre de sesión, e intentos fallidos mediante NestJS logger. Los logs incluyen: username, timestamp, dirección IP, y resultado (éxito/fallo). Logs almacenados en archivos del servidor. PENDIENTE: Centralizar logs en sistema de gestión, incluir registro de accesos administrativos detallado, y asegurar que todos los eventos de autenticación incluyen contexto completo (user-agent, geolocalización).

---

**3. Actividades sobre datos personales registradas (creación, modificación, borrado) con identificación de quién, cuándo y tipo**

Logs de operaciones mediante NestJS logger registran operaciones generales. PENDIENTE: Implementar audit log completo específico de operaciones sobre datos personales que registre: usuario responsable, timestamp exacto, acción realizada (crear/leer/actualizar/borrar), recurso afectado (tabla, ID registro), valores anteriores y nuevos (para modificaciones), y contexto de la operación. Almacenar en tabla de auditoría separada con retención según requisitos legales.

---

**4. Entornos de pruebas segregados de producción con datos anonimizados/seudonimizados**

Entornos de desarrollo completamente separados de producción con variables de entorno específicas. Base de datos de desarrollo independiente de producción. Modo demo disponible con datos de prueba sintéticos. Las bases de datos no se replican entre entornos. PENDIENTE: Documentar procedimiento formal de anonimización/seudonimización para entornos de prueba si se requiere usar datos reales (aplicar técnicas de masking, generalización, o generación sintética).

---

**5. Logs almacenados de forma segura con acceso restringido, archivados según requerimientos y eliminados tras cumplir finalidad**

Logs almacenados en servidor Google Cloud con acceso restringido mediante SSH (solo administradores autorizados). PENDIENTE: Implementar sistema formal de archivo de logs con política de retención definida, rotación automática de logs (logrotate), compresión de logs antiguos, almacenamiento en ubicación segura separada, definición de períodos de retención según requisitos legales (GDPR: mínimo para finalidad), y procedimiento de eliminación segura.

---

**6. Herramientas de explotación de logs que permitan detectar violaciones a políticas de seguridad**

PENDIENTE: Implementar herramienta de análisis de logs (ELK Stack: Elasticsearch, Logstash, Kibana; Graylog; o Splunk) que permita: búsqueda y filtrado de eventos, correlación de logs de múltiples fuentes, detección de patrones anómalos, alertas automáticas ante violaciones de políticas de seguridad (intentos de acceso no autorizado, exportaciones masivas, cambios en configuración crítica), dashboards de monitorización, y reportes de cumplimiento.

---

## Medidas de disponibilidad:

**1. Herramientas para detectar y prevenir intrusiones o ciberataques (cortafuegos, IPS, IDS, detección ataques dirigidos)**

Firewall de Google Cloud Platform (GCP Firewall Rules) configurado para limitar acceso a puertos necesarios. Caddy web server con configuración de seguridad y rate limiting. Protección DDoS básica incluida en Google Cloud Platform. PENDIENTE: Implementar IPS/IDS dedicado (Snort, Suricata) para detección de intrusiones en tiempo real. Configurar WAF (Web Application Firewall) como ModSecurity o Google Cloud Armor para protección contra ataques OWASP Top 10.

---

**2. Herramientas o servicios para detectar y limitar impacto de ataques DDoS**

Google Cloud Platform incluye protección DDoS básica automática en todos los servicios (mitigación de ataques volumétricos de red). Caddy web server con rate limiting configurado. PENDIENTE: Evaluar e implementar protección DDoS avanzada mediante Google Cloud Armor que incluya: detección de patrones de ataque, mitigación automática de tráfico malicioso, reglas personalizadas de filtrado, y análisis de tráfico en tiempo real.

---

**3. Simulaciones regulares de ataques informáticos (penetration testing) con evaluación y corrección de desviaciones**

PENDIENTE: Programar simulaciones regulares de ataques informáticos (mínimo anual). Contratar auditoría de seguridad externa independiente especializada en penetration testing. Alcance: aplicación web (OWASP), infraestructura cloud, APIs, autenticación. Documentar hallazgos con severidad CVSS. Establecer plan de remediación con plazos según criticidad. Realizar retest tras correcciones. Mantener registro histórico de tests y mejoras.

---

**4. Protección de componentes que procesan datos personales frente a desastres naturales (fuego, inundaciones, tornados)**

Infraestructura en Google Cloud con redundancia geográfica incorporada. Centros de datos de GCP diseñados con protección contra elementos naturales: sistemas anti-incendios, ubicación geográfica estratégica para evitar zonas de riesgo de inundaciones/tornados, construcción reforzada. Certificaciones de seguridad física: ISO 27001, SOC 2. Múltiples zonas de disponibilidad para resiliencia ante desastres locales.

---

**5. Redes de telecomunicaciones segmentadas mediante cortafuegos para limitar impacto de incidentes**

Arquitectura de microservicios con servicios aislados: API (backend), Gateway (asignaciones remotas), Web (frontend), MongoDB (base de datos). Comunicación interna mediante red Docker privada (bridge network) que aísla componentes. Exposición al exterior únicamente mediante reverse proxy Caddy. PENDIENTE: Implementar segmentación adicional mediante VLANs o subredes en Google Cloud para separar componentes por nivel de sensibilidad (zona pública, zona aplicación, zona datos).

---

**6. Política de respaldo definiendo alcance, frecuencias, retención, ubicaciones múltiples, cifrado y procedimientos de restauración**

Base de datos MongoDB configurada con replica set (3 nodos) para alta disponibilidad y redundancia de datos. Volúmenes Docker persistentes configurados para datos críticos. PENDIENTE: Implementar política formal de backups documentada que incluya: alcance completo (base de datos, configuración, código), frecuencia diaria automatizada (3AM), retención de 30 días, ubicación en múltiples regiones geográficas (GCP Storage), cifrado AES-256 de backups, y procedimiento de restauración documentado y testado.

---

**7. Copias de respaldo regulares de sistemas informáticos (incluyendo configuración) según política establecida**

Capacidad de backup mediante volúmenes Docker y exportación de MongoDB. MongoDB replica set proporciona redundancia continua. PENDIENTE: Automatizar copias de respaldo programadas mediante scripts/cron jobs. Implementar backup completo de: base de datos MongoDB (mongodump diario), configuración de servicios (Caddy, Docker Compose), certificados SSL, variables de entorno, y código de aplicación. Almacenar en Google Cloud Storage con versionado habilitado.

---

## Medidas de control y acreditación:

**1. Revisiones de seguridad regulares (mínimo anual) e independientes para asegurar cumplimiento y efectividad de controles**

PENDIENTE: Establecer calendario de auditorías de seguridad con periodicidad anual mínima. Contratar auditoría externa independiente (empresa certificadora especializada en ISO 27001, GDPR). Alcance: revisión de controles técnicos (autenticación, cifrado, logs), organizativos (políticas, procedimientos), y cumplimiento legal (GDPR, LOPDGDD). Documentar resultados en informe de auditoría con hallazgos, no conformidades, y recomendaciones. Establecer plan de acción con responsables y plazos.

---

**2. Simulaciones y pruebas regulares (mínimo anual) de planes de continuidad TI con documentación y corrección de desviaciones**

PENDIENTE: Desarrollar plan de continuidad de servicios TI (BCP/DRP) que incluya: identificación de servicios críticos, RTO/RPO definidos, procedimientos de recuperación ante desastres, roles y responsabilidades, contactos de emergencia. Realizar simulaciones anuales documentadas con escenarios realistas (caída de servidor, corrupción de base de datos, ataque ransomware). Evaluar tiempos de recuperación, priorizar desviaciones, y actualizar plan según lecciones aprendidas.

---

**3. Tests regulares de copias de respaldo y procedimientos de restauración para asegurar integridad y disponibilidad**

PENDIENTE: Implementar test trimestral de restauración de backups en entorno aislado (no producción). Procedimiento: seleccionar backup aleatorio, restaurar en servidor de prueba, verificar integridad de datos (checksums, conteo de registros), validar funcionalidad de aplicación post-restauración, medir tiempo de recuperación (RTO), documentar resultado (éxito/fallo, incidencias, tiempo). Mantener registro histórico de tests. Actualizar procedimientos según hallazgos.

---

**4. Revisiones regulares e independientes de procesos de gestión de seguridad incluyendo controles que afecten a datos personales**

PENDIENTE: Establecer proceso de revisión independiente (trimestral o semestral) de gestión de seguridad de la información. Alcance: políticas de seguridad implementadas, procedimientos operativos, gestión de accesos, respuesta a incidentes, gestión de vulnerabilidades, controles específicos sobre datos personales del Responsable. Revisor: auditor externo o responsable de seguridad independiente del área operativa. Documentar resultados, acciones correctivas, y seguimiento de implementación.

---

**5. Procesos, procedimientos operativos e instrucciones documentados para asegurar cumplimiento de la naturaleza del servicio**

Documentación técnica disponible en repositorio del proyecto (README, documentos de arquitectura). Código fuente documentado con comentarios. PENDIENTE: Documentar procedimientos operativos estándar (SOPs) que incluyan: manual de operaciones para administradores, guía de despliegue y actualización, procedimientos de backup y restauración, gestión de incidentes paso a paso, onboarding de usuarios administradores, políticas de seguridad corporativas, y matriz de responsabilidades. Mantener documentación actualizada y accesible al personal autorizado.

---

## Medidas relativas al procesado no automatizado:

**1. Garantizar correcta conservación de documentos, localización, consulta de información y ejercicio de derechos mediante archivo en soporte adecuado**

Todos los datos personales se procesan de forma automatizada en base de datos digital MongoDB. Sistema de gestión documental digital con control de acceso mediante roles y permisos. Capacidad de búsqueda y consulta de información mediante API REST y interfaz web. Sistema de exportación disponible para ejercicio de derechos (acceso, portabilidad). No se utiliza procesamiento en papel de datos personales de forma habitual.

---

**2. Generación de copias o reproducción de documentos con categorías especiales de datos únicamente por personal autorizado con destrucción segura de copias desechadas**

Exportación de datos personales (incluyendo datos de salud) restringida mediante sistema de permisos por rol. Solo usuarios con privilegios específicos (Admin, Group Manager con permisos) pueden exportar datos. Registro de exportaciones en logs del sistema con trazabilidad completa (usuario, fecha, hora, tipo de datos). PENDIENTE: Implementar marcas de agua o identificadores únicos en exportaciones para rastreabilidad. Documentar procedimiento de destrucción segura de copias digitales y físicas (si las hubiera).

---

**3. Destrucción de copias o reproducciones desechadas evitando acceso a información o recuperación posterior**

Borrado de datos en MongoDB mediante funciones de base de datos (soft delete con marca de eliminación, hard delete con eliminación física del registro). Los datos eliminados de base de datos no son recuperables salvo desde backups. PENDIENTE: Documentar procedimiento formal de destrucción segura de copias físicas (si existieran) mediante trituración, incineración certificada. Para copias digitales, implementar sobrescritura múltiple de archivos antes de eliminación del sistema de archivos.

---

**4. Devolución al Responsable de todos los datos (iniciales y recogidos) en soporte digital y papel**

Sistema de exportación de datos en formatos estándar (JSON, CSV) que permite extracción completa de: sujetos (subjects), sesiones (sessions), instrumentos (instruments), respuestas, grupos, y usuarios. Capacidad de exportar datos completos mediante API REST para integración programática. Posibilidad de dump completo de base de datos MongoDB. Formato estructurado y legible que permite importación en otros sistemas. No se procesan datos en papel, toda la información es digital.

---

**5. Destrucción segura de datos personales al finalizar servicio en todos los sistemas de almacenamiento y respaldo, garantizando irrecuperabilidad incluso con técnicas forenses**

PENDIENTE: Documentar procedimiento completo de destrucción irrecuperable de datos al finalizar contrato que incluya: eliminación de base de datos MongoDB (drop database), sobrescritura de volúmenes Docker (shred, wipe), eliminación de backups en todas las ubicaciones (Google Cloud Storage), destrucción de logs con datos personales, eliminación de copias en entornos de desarrollo/prueba, certificación de destrucción firmada, y cumplimiento en subencargados (Google Cloud). Especificar técnicas: sobrescritura múltiple (DoD 5220.22-M), destrucción física de medios si procede.

---

**6. Gestión de subencargados con proceso documentado**

El servicio es prestado directamente por ALTA HEALTH CONSULTING, S.L. Google Cloud Platform actúa como subencargado de infraestructura con acuerdo de procesamiento de datos conforme GDPR. PENDIENTE: Si se contratan subencargados adicionales en el futuro, documentar proceso de gestión que incluya: evaluación de garantías de seguridad, firma de acuerdo de subencargamiento, auditoría de cumplimiento, registro de subencargados, y responsabilidad del Encargado ante el Responsable.

---

**7. Conservación de datos bloqueados para cumplir obligaciones legales tras finalización del servicio**

PENDIENTE: Implementar sistema de bloqueo de datos que permita conservación post-servicio cuando existan obligaciones legales (reclamaciones, litigios, requisitos regulatorios). Funcionalidad: marcar datos como "bloqueados" impidiendo modificación/eliminación pero permitiendo acceso restringido. Documentar política de retención post-servicio especificando: criterios de bloqueo, período de conservación según normativa aplicable, responsable de autorizar desbloqueo, y procedimiento de eliminación definitiva tras cumplir plazo legal.

---

## Medidas de gestión de soportes:

**1. Custodia de documentación con datos personales mientras no esté archivada (en proceso de revisión o tramitación)**

NO APLICA. Todos los datos personales se procesan de forma automatizada en base de datos digital MongoDB. No se utiliza documentación en papel durante procesos de revisión o tramitación. Los datos están permanentemente almacenados en sistema de gestión digital con control de acceso mediante roles. Si en el futuro se utilizan documentos físicos temporales, se establecerá protocolo de custodia que garantice que la persona responsable impida acceso no autorizado durante todo el ciclo de tramitación.

---

**2. Destrucción efectiva de documentos o soportes con datos personales mediante medios que eviten acceso o recuperación (destructoras nivel 3 DIN 66399)**

Borrado de datos digitales en MongoDB mediante funciones de base de datos (soft delete y hard delete). Los datos eliminados de base de datos no son recuperables sin backups. PENDIENTE: Documentar procedimiento formal de destrucción que incluya: para soportes físicos (si existieran) uso de destructoras de papel nivel mínimo 3 según norma DIN 66399 (ancho tira ≤2mm, ancho ≤4mm, largo ≤80mm, tamaño partícula ≤320mm²) o contratación de empresas especializadas certificadas. Para soportes digitales: sobrescritura múltiple (DoD 5220.22-M) antes de desecho de dispositivos.

---

**3. Generación de copias o reproducción de documentos con categorías especiales de datos únicamente bajo control de personal autorizado**

Exportación de datos personales (incluyendo datos de salud) restringida mediante sistema de permisos por rol. Solo usuarios con privilegios específicos (Admin, Group Manager con permisos) pueden exportar datos. Registro de exportaciones en logs del sistema con trazabilidad completa (usuario, fecha, hora, tipo de datos). PENDIENTE: Implementar marcas de agua o identificadores únicos en exportaciones para rastreabilidad. Documentar procedimiento de destrucción segura de copias digitales y físicas (si las hubiera).

---

**4. Destrucción de copias o reproducciones desechadas evitando acceso a información o recuperación posterior**

Borrado de datos en MongoDB mediante funciones de base de datos (soft delete con marca de eliminación, hard delete con eliminación física del registro). Los datos eliminados de base de datos no son recuperables salvo desde backups. PENDIENTE: Documentar procedimiento formal de destrucción segura de copias físicas (si existieran) mediante trituración, incineración certificada. Para copias digitales, implementar sobrescritura múltiple de archivos antes de eliminación del sistema de archivos.

---

**5. Devolución al Responsable de todos los datos (iniciales y recogidos) en soporte digital y papel**

Sistema de exportación de datos en formatos estándar (JSON, CSV) que permite extracción completa de: sujetos (subjects), sesiones (sessions), instrumentos (instruments), respuestas, grupos, y usuarios. Capacidad de exportar datos completos mediante API REST para integración programática. Posibilidad de dump completo de base de datos MongoDB. Formato estructurado y legible que permite importación en otros sistemas. No se procesan datos en papel, toda la información es digital.

---

**6. Destrucción segura de datos personales al finalizar servicio en todos sistemas de almacenamiento y respaldo garantizando irrecuperabilidad con técnicas forenses**

PENDIENTE: Documentar procedimiento completo de destrucción irrecuperable de datos al finalizar contrato que incluya: eliminación de base de datos MongoDB (drop database), sobrescritura de volúmenes Docker (shred, wipe), eliminación de backups en todas las ubicaciones (Google Cloud Storage), destrucción de logs con datos personales, eliminación de copias en entornos de desarrollo/prueba, certificación de destrucción firmada, y cumplimiento en subencargados (Google Cloud). Especificar técnicas: sobrescritura múltiple (DoD 5220.22-M), destrucción física de medios si procede. Para formato papel aplicar criterios definidos de custodia de soportes.

---

**7. Proceso de destrucción bajo responsabilidad del Encargado incluyendo subencargados contratados**

El servicio es prestado directamente por ALTA HEALTH CONSULTING, S.L. Google Cloud Platform actúa como subencargado de infraestructura con acuerdo de procesamiento de datos conforme GDPR. PENDIENTE: Documentar que proceso de destrucción segura al finalizar servicio se ejecutará bajo responsabilidad del Encargado asegurando cumplimiento en todos los subencargados (Google Cloud). Incluir cláusulas contractuales que obliguen a subencargados a ejecutar destrucción certificada de datos en sus sistemas.

---

**8. Conservación de copia de datos para cumplir obligaciones legales o salvaguardar responsabilidades, debidamente bloqueados según normativa**

PENDIENTE: Implementar sistema de bloqueo de datos que permita conservación post-servicio cuando existan obligaciones legales (reclamaciones, litigios, requisitos regulatorios). Funcionalidad: marcar datos como "bloqueados" impidiendo modificación/eliminación pero permitiendo acceso restringido. Documentar política de retención post-servicio especificando: criterios de bloqueo, período de conservación según normativa aplicable, responsable de autorizar desbloqueo, y procedimiento de eliminación definitiva tras cumplir plazo legal.

---

## RESUMEN EJECUTIVO PARA EXCEL

**NOTA**: Las respuestas anteriores están organizadas por requisito individual. Cada párrafo puede copiarse directamente en la celda correspondiente del Excel de Gebro Pharma. Las respuestas incluyen:

- Evidencia técnica específica de lo implementado (algoritmos, herramientas, configuraciones)
- Identificación clara de elementos PENDIENTES cuando no están implementados
- Detalles suficientes para demostrar cumplimiento o reconocer gaps de seguridad
- Formato conciso apto para celdas de Excel

**Leyenda de estado**:

- Respuestas que inician describiendo implementación directamente = IMPLEMENTADO
- Respuestas que inician con "PENDIENTE:" = NO IMPLEMENTADO (requiere acción)
- Respuestas con descripción + "PENDIENTE: [detalle]" = PARCIALMENTE IMPLEMENTADO

---

## ANEXO: TEXTO COMPLETO DE REQUISITOS CONTRACTUALES

A continuación se detalla el texto completo de las medidas de seguridad requeridas según el contrato entre LABORATORIOS GEBRO PHARMA, S.A. (Responsable del Tratamiento) y ALTA HEALTH CONSULTING, S.L. (Encargado del Tratamiento).

**Este anexo contiene el texto contractual original para referencia. Las respuestas punto por punto a cada requisito se encuentran en las secciones anteriores del documento.**

---

### ANEXO I: MEDIDAS DE SEGURIDAD

Entre las medidas que el encargado deberá adoptar se encuentran:

#### Control de acceso físico y del entorno:

- Medidas de protección ante amenazas físicas del entorno como pueden ser agua, fuego, insuficiencia de suministro eléctrico, etc.

- Medidas de protección perimetral para la protección tanto de amenazas de acceso físico, como de manipulación no autorizada.

- El acceso a las salas y oficinas en las cuales se procesa la información, incluidos los datos personales, deberá contar con medidas técnicas y organizativas que las protejan frente al acceso no autorizado.

- La salida fuera de las instalaciones de dispositivos de soporte de gestión y/o almacenamiento (portátiles, discos y dispositivos extraíbles, soportes de copias, etc.) que contengan datos personales deberán ser previamente autorizados por los responsables y disponer de las medidas de seguridad adecuadas.

#### Control de acceso lógico:

El Encargado dispondrá de un proceso estándar de gestión de las cuentas de acceso a los sistemas de información que procesan los datos personales en el que:

- Garantizará que únicamente el personal autorizado podrá tener acceso a los datos personales o los sistemas de procesado de datos personales y que disponga de las autorizaciones correspondientes (de acuerdo con el proceso establecido).

- Asegurará que se asigna un identificador unívoco, así como una contraseña a cada cuenta de usuario que no deberá compartirse con terceros.

- Los cambios en las cuentas de usuario (alta, modificación, baja) deberán disponer de los registros correspondientes (logs) y estar documentados.

- Revocará las autorizaciones concedidas a usuarios de forma inmediata en caso de que la relación contractual haya finalizado (incluyendo subcontrataciones) o precise actualizarse por cambios en la empresa según instrucciones del Responsable.

- Restringir las cuentas privilegiadas de acceso al sistema como a los distintos aplicativos que gestionan los datos personales de los que se es Encargado exclusivamente a personal autorizado y limitadas en número.

- Conceder las cuentas privilegiadas únicamente a personal cualificado técnicamente y que disponga de formación y sensibilización específica para la gestión y uso de cuentas privilegiadas, por el riesgo que representan.

- Disponer, para aquellos usuarios que requieran realizar actividades, con cuentas privilegiadas, sobre los datos personales, dos cuentas en el sistema: una estándar para llevar a cabo las tareas rutinarias y operativas y una privilegiada para llevar a cabo las tareas que requieren de permisos privilegiados.

- Prevenir la revelación no autorizada de las credenciales de autenticación de usuarios que dan acceso a los sistemas de información y sistemas de soporte que procesan datos personales.

- Asegurarse que las contraseñas de cuentas de sistema privilegiadas, las de usuario y las de las aplicaciones del Encargado (éstas en la medida de lo posible en cuanto sean un software de terceros) cumplan, al menos, con los siguientes requerimientos:
  - Deben ser almacenadas de forma cifrada en los sistemas de información.
  - La contraseña debe cambiarse de forma obligatoria tras el ingreso de la contraseña inicial de acceso al sistema.
  - La validez máxima de la contraseña debe ser de un año. Se deberá forzar el cambio obligatorio de la contraseña transcurrido el plazo de validez máxima.
  - La longitud mínima de la contraseña debe ser de 8 caracteres (incluyendo mayúsculas, minúsculas, números y caracteres especiales).
  - El número de intentos fallidos consecutivos a la hora de introducir la contraseña antes de que la cuenta se bloquee debe ser, como máximo, de 5.

- Los requerimientos anteriores deben estar, en la medida que sea posible, forzados en el sistema.

- El Encargado deberá gestionar las cuentas privilegiadas de los sistemas de información (incluyendo las cuentas de administración del entorno y los componentes de soporte del sistema de información) que procesen datos personales para que utilicen mecanismos de autenticación fuertes.

- Disponer distintos roles y permisos en el sistema de gestión de acceso a los datos y sistemas de información que procesen datos personales, de tal forma que cada usuario únicamente pueda acceder a los datos autorizados.

- Efectuar la asignación de las autorizaciones y roles teniendo en cuenta el principio de segregación de funciones, principio del mínimo privilegio y deben tener una validez temporal.

- Revisar que las asignaciones o autorizaciones concedidas de forma regular (mínimo una vez al año) para asegurar su adherencia y validez.

- Disponer de una política de pantallas y mesas limpias, la cual deberá ser distribuida de forma regular a los empleados y formar parte de las actividades de concienciación y sensibilización que lleva a cabo la empresa.

- Los ordenadores y equipos de trabajo con acceso a los sistemas de información que procesen los datos personales deben disponer de un protector de pantalla protegido por contraseña que se active de forma automática transcurridos un periodo de inactividad de, como máximo, 5 minutos.

- Los empleados y terceros que hagan uso de ordenadores y estaciones de trabajo del Encargado deben estar concienciados para bloquear la pantalla una vez éstos abandonen su puesto de trabajo, ya sea momentáneamente o no.

#### Control de transferencia, almacenamiento y portabilidad:

- La transferencia electrónica de datos personales debe efectuarse de forma cifrada.

- Los datos personales deberán ser almacenados de forma cifrada que garantice el acceso únicamente a las personas autorizadas.

- En el caso que existan interfaces con otros sistemas (tanto internos como de terceros), los datos deberán ser transmitidos de forma cifrada, utilizándose para ello estándares, algoritmos y sistemas de cifrado robustos de acuerdo con el estado de la técnica (HTTPS).

- La transmisión mediante soporte físico de datos personales debe estar formalmente documentada (e.g mediante un proceso de autorización para la transmisión, registro de destinatarios, datos de la transmisión como el emisor, fecha de emisión y destinatario, así como medidas técnicas y organizativas adoptadas para asegurar la confidencialidad).

- La administración remota de los sistemas de información que procesan datos personales se realizará a través de un canal de comunicación seguro (SSH, TLS, VPN, ...).

- Se introducirán medidas técnicas en los sistemas de información que restrinjan la posibilidad de que datos personales puedan ser exportados de forma no autorizada.

- Se deberán implementar medidas técnicas que permitan detectar transmisiones no autorizadas de datos personales dentro y fuera de la empresa.

- Los soportes informáticos móviles (e.g dispositivos externos, ordenadores portátiles o tabletas) del encargado que almacenen y procesen datos personales deberán estar cifrados.

- El Encargado solicitará la autorización del Responsable previamente a que los datos, incluidas las copias de respaldo, se vayan a reubicar en otro Centro de Procesamiento de Datos, país o región que no esté recogido en el contrato de servicio.

- En caso de retirada de soportes informáticos (e.g. USB, discos duros, etc.) que procesen datos personales, éstos deberán ser borrados de forma segura (irrecuperable mediante reescritura) previamente a su retirada.

#### Control de gestión de incidentes de seguridad:

- El Encargado monitorizará de forma continua y en tiempo real los incidentes de seguridad.

- El Encargado deberá disponer de un procedimiento de gestión de incidencias de seguridad en el cual se establecen los criterios para clasificar, priorizar y escalar los incidentes. El Responsable será informado de forma inmediata (como máximo 24 horas desde su conocimiento) y a través de canales de información preestablecidos en caso de ocurrir una brecha de seguridad, indicando los requisitos exigidos en la normativa aplicable.

- El Encargado o la empresa externa que contrate, deberá evaluar periódicamente la disponibilidad de actualizaciones de seguridad para los sistemas de Tecnología de la Información (TI) y sus componentes (incluyendo clientes, componentes de red, servidores, etc.) que procesan los datos personales. La instalación de las actualizaciones de seguridad se realiza de forma regular a través de un procedimiento formal.

- Los sistemas de información del Encargado que procesan datos personales serán escaneados de forma regular para detectar vulnerabilidades conocidas. Las vulnerabilidades detectadas son clasificadas en base a su criticidad e impacto de seguridad y corregidas de forma acorde.

#### Control de operación de aplicaciones TI:

- El Encargado deberá garantizar que los programas y aplicativos, tanto propios como de terceros, que utiliza para la gestión de los datos facilitados por el Responsable incluye la seguridad como un elemento integral dentro de su ciclo de vida. Deberá establecer la adopción de estándares reconocidos para el desarrollo de aplicaciones seguras (e.g. estándares y buenas prácticas de codificación). El Encargado deberá identificar e implementar los requerimientos de seguridad y legales en las fases tempranas del desarrollo (por defecto y desde el diseño).

- Las actividades relativas al acceso a la aplicación (inicio, cierre de sesión, intentos exitosos/fallidos, etc.) deben ser registradas en la aplicación tanto para usuarios como para administradores. El registro de información debe permitir identificar, como mínimo, quien ha realizado la acción, cuando se ha llevado a cabo la acción y el tipo de actividad realizada (e.g. inicio de sesión, intento fallido de acceso, etc).

- Las actividades llevadas a cabo sobre los datos personales procesados en la aplicación (creación, modificación, borrado) deben ser registrados. El registro de información debe permitir identificar, como mínimo, quien ha realizado la acción, cuando se ha llevado a cabo la acción y el tipo de actividad realizada.

- Los entornos de pruebas deben estar completamente segregados del entorno de producción. Los datos empleados en los entornos de prueba deben estar anonimizados, en la medida que sea técnicamente factible o, cuanto menos, seudonimizados.

- Los datos de registro (logs) deben almacenarse de forma segura y el acceso debe restringirse exclusivamente a personal autorizado. Los registros se deben archivar teniendo en consideración su contenido y/o requerimientos legales y deben ser eliminados una vez hayan cumplido con su finalidad.

- El Encargado deberá disponer de herramientas de explotación de los datos de registros (logs) que permitan detectar violaciones a las políticas de seguridad TI.

#### Medidas de disponibilidad:

- El Encargado dispondrá de herramientas para detectar y prevenir intrusiones o ciberataques, como son cortafuegos, IPS, IDS, detección y prevenciones de ataques dirigidos, etc.

- El Encargado dispondrá de herramientas o servicios para detectar y limitar el impacto de ataques de denegación de servicio (DDoS).

- Encargado llevará a cabo de forma regular simulaciones de ataques informáticos (e.g. test de intrusión/penetración). Las desviaciones detectadas son evaluadas y corregidas de forma regular atendiendo a un procedimiento definido.

- Los componentes y dispositivos que procesan datos personales estarán protegidos, mediante la implantación de las correspondientes medidas técnicas y organizativas, frente a desastres causados por elementos naturales (e.g. fuego, inundaciones, tornados).

- Las redes de telecomunicaciones del Encargado estarán segmentadas mediante la implantación de cortafuegos para poder limitar el impacto en caso de un incidente de seguridad.

- Se dispondrá de una política de respaldo de los datos procesados por los sistemas informáticos que establecerá el alcance de los sistemas TI, las frecuencias de las copias de respaldo, el periodo de retención, las ubicaciones físicas de las copias (en más de una ubicación) y las medidas de seguridad para asegurar la confidencialidad e integridad (e.g cifrado). La política tendrá en consideración los requerimientos regulatorios y legales.

- Se llevarán a cabo de forma regular copias de respaldo de los sistemas informáticos (incluyendo los datos de configuración del sistema) que procesan los datos personales de acuerdo con la política establecida.

#### Medidas de control y acreditación:

- El Encargado llevará a cabo de forma regular (al menos, una vez al año) e independiente, revisiones de seguridad de los sistemas informáticos que procesen datos personales con el fin de asegurar el cumplimiento y efectividad de los controles técnicos, organizativos y legales.

- El Encargado llevará a cabo de forma regular simulaciones y pruebas de los planes de continuidad de los servicios TI establecidos (al menos una vez al año). Los test (y sus resultados) deberán estar documentados. Las desviaciones detectadas serán evaluadas, priorizadas y corregidas.

- El Encargado llevará a cabo de forma regular test de las copias de respaldo realizadas y de los procedimientos de restauración definidos para asegurar la integridad y disponibilidad de las copias.

- El Encargado deberá llevar a cabo de forma regular e independiente revisiones de sus procesos de gestión de la seguridad de la información. El alcance de las revisiones deberá incluir, como mínimo, aquellos controles que puedan afectar a la seguridad de los datos personales del Responsable.

- El Encargado dispondrá de procesos, procedimientos operativos e instrucciones para asegurar el cumplimiento de la naturaleza del servicio.

#### Medidas relativas al procesado no automatizado:

- El Encargado deberá garantizar la correcta conservación de los documentos, la localización y consulta de la información y posibilitar el ejercicio de los derechos de los interesados. Para ello, deberá archivar la documentación en soporte adecuado.

- La generación de copias o la reproducción de los documentos que contengan categorías especiales de datos (e.g; datos de salud, de afiliación sindical, opiniones políticas, convicciones religiosas, datos biométricos, …), únicamente podrán ser realizadas bajo el control del personal autorizado.

- Asimismo, deberá procederse a la destrucción de las copias o reproducciones desechadas de forma que se evite el acceso a la información contenida en las mismas o su recuperación posterior.

- En su caso, el Encargado devolverá al Responsable todos los datos objeto de la presenta prestación, ya sean los iniciales o los recogidos por el Encargado, que este disponga, estén en soporte digital como papel.

- El Encargado destruirá de forma segura los datos personales en todos los sistemas de almacenamiento y respaldo en que disponga. Deberá garantizar que la técnica empleada para el borrado de los datos hace que la información sea irrecuperable, incluso mediante el uso de técnicas forenses. En el formato papel aplicará los criterios definidos en respecto de la custodia de soportes.

- Dicho proceso deberá llevarse a cabo bajo la responsabilidad del Encargado en los subencargados que este hubiese contratado, en su caso.

- El Encargado podrá conservar una copia de los datos con objeto de cumplir con sus obligaciones legales o salvaguardar las responsabilidades que se puedan derivar de su tratamiento, así como, conservarlos después debidamente bloqueados de conformidad con la normativa aplicable cuando proceda.

---

**Fdo. RESPONSABLE DEL TRATAMIENTO**  
LABORATORIOS GEBRO PHARMA, S.A.

**Fdo. ENCARGADO DEL TRATAMIENTO**  
ALTA HEALTH CONSULTING, S.L.
