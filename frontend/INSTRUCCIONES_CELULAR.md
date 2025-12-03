# 📱 Instrucciones para acceder desde el celular

## Tu IP de red: `192.168.0.14`

## Pasos:

### 1. Verificar que el servidor esté corriendo
```bash
# En tu PC, desde el directorio frontend/
npx --yes http-server -p 8080 -c-1 --host 0.0.0.0
```

### 2. Verificar firewall de Windows
- Abre "Firewall de Windows Defender"
- Permite conexiones entrantes en el puerto 8080
- O temporalmente desactiva el firewall para pruebas

### 3. Acceder desde el celular
1. Asegúrate de que tu celular esté en la **misma red WiFi** que tu PC
2. Abre el navegador en tu celular
3. Ve a: `http://192.168.0.14:8080`
4. Deberías ver la pantalla de inicio de la PWA

### 4. Si aún no funciona:

**Opción A: Verificar conectividad**
```bash
# En tu PC, prueba ping desde el celular
# O desde el celular, prueba acceder a: http://192.168.0.14:8080
```

**Opción B: Usar ngrok (más fácil)**
```bash
# Instala ngrok desde https://ngrok.com/
# Luego ejecuta:
ngrok http 8080
# Usa la URL HTTPS que te da (ej: https://abc123.ngrok.io)
```

### 5. Verificar errores en el navegador del celular
- Abre las herramientas de desarrollador (si es posible)
- O revisa la consola en tu PC mientras accedes desde el celular

## Troubleshooting:

- **Pantalla blanca**: Revisa la consola del navegador para errores JavaScript
- **Unreachable**: Verifica que el servidor esté corriendo y el firewall permita conexiones
- **No carga Google Maps**: Verifica que la API key sea válida y tenga permisos

