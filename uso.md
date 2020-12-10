# Instrucciones de Uso

Las instrucciones de uso fueron probadas en un sistema GNU/Linux Debian,
deberían ser compatibles con todas las distribuciones derivadas sin necesidad de cambios.

Para correr el ejemplo se necesita:

1. Clonar el repositorio (```git clone https://github.com/Jmdelafuente/TaTeTi.git```) y entrar en el directorio creado (```cd TaTeTi```)

2. Instalar Node.js (``` sudo apt-get install nodejs```) y (```sudo apt-get install npm```)

3. En el directorio node_modules están los módulos requeridos. Igualmente es posible realizar una instalación de las dependencias con:
   ``` npm install```

4. Entrar al directorio public, que coniene los archivos necesarios para ejecutar el cliente (``` cd public```)

5. Ejecutar algún servidor http (si dispone de uno puede utilizarlo sin inconvenientes). Sino se puede ejecutar un servidor simple y rápido de python con:

```Bash
python2 -m SimpleHTTPServer 8000
```

o si dispone de python3

```
python3 -m http.server 8000
```

6. En una nueva terminal, acceder al directorio del repositorio (``` cd TaTeTi```)

7. Ejecutar el servidor del juego con un único parámetro que indique el nombre de la interfaz de red que desea utilizar como salida del servidor, este dato es opcional, si no lo indica, por defecto toma la primer interfaz disponible después de lo.

```bash
node server.js [nombre de la interfaz de red]
```

8. Ya puede probar el juego abriendo un navegador en la dirección 'http://direccion-ip:8000/tablero.html' donde 'direccion-ip' es la direccion del servidor (puede utilizar localhost si lo prueba en el mismo servidor)
