# Panel de Gestión Prado-Matrix

El **Panel de Gestión Prado-Matrix** es una plataforma web prototipo diseñada para el personal docente de la Universidad de Granada (UGR). Su objetivo principal es actuar como un puente directo y automatizado entre la plataforma docente de Prado (Moodle) y el sistema de mensajería de Matrix, el cual se enuentra desplegado por la Oficina de Software Libre (OSL) en `chat.ugr.es`

Al unir estas dos herramientas, facilitamos funcionalidades al docente para crear, organizar y mantener grupos de chat para cada asignatura, automatizando todo este proceso. 

> **Nota técnica:** En esta fase de prototipo no hay ningún contenedor Moodle desplegado en el docker, la comunicación con Prado a través de un sistema de Mocks/JSON que simula esta API.

![Imagen1](../imgs/imagen1.png)

![Imagen4](../imgs/imagen4.png)


---

## 1. Características Principales

A través de la interfaz el profesorado puede realizar las siguientes funcionalidades:

*   **Sincronización Automatizada:**  Vinculamos automáticamente la estructura de asignaturas y de alumnos de Prado del profesor, permitiendo con un solo clic de forma automática el espacio principal de la asignatura ya configurado en Matrix.
* **Gestión de Salas:** El profesor puede crear salas o espacio según sus necesidades (una general, una para sus tutorías, otra para sus prácticas etc). Ademas de poder editarlas o eliminarlas en todo momento.
* **Control de accesos:** Se puede restringir el uso horario de las salas por horas, durante las cuales los alumnos no podrán enviar mensajes ni interactuar con estas, silenciando el chat dentro de este horario.
*  **Programación de Avisos:** Es posible programar mensajes para que se envíen a salas específicas en fechas y horas predefinidas.

---
### 1.2 Stack Tecnológico

Para conseguir que la aplicación sea  rápida y fácil de mantener el proyecto se ha dividido en 3 grandes capas independientes. Estas herramientas funcionan de forma aislada dentro de contenedores de Docker, lo que facilita enormemente su despliegue. El stack elegido se compone de:

- **Frontend (React y Vite):** Se encarga del Frontend de la aplicación. Se utiliza **React** para crear una aplicación de forma muy modular, donde los datos cambian al instante sin recargar la pantalla. Además como framework de CSS hemos utilizado **Tailwind CSS**.

- **Backend (FastAPI):** Se encarga del Backend de la aplicación. Recibe las peticiones de la interfaz y se comunica con la API oficial de matrix para cualquier consulta o modificación. Se eligió ya que es muy sencillo integrar y probar nuevas rutas a través de la pestaña de docs propia de este.

 - **Base de Datos (PostgreSQL):** Almacena la información necesaria para toda la configuración local del panel. Aquí se guarda la estructura de salas creadas, horas de uso de los chats, los mensajes programados etc

---

## 3. Estructura del Proyecto

El código fuente está organizado de la siguiente manera:

```bash
.
├── backend/                  # Backend de la APP (FastAPI)
│   ├── app/
│   │   ├── api/              # Endpoints de la API (routes.py)
│   │   ├── core/             # Configuración base y conexión a BD
│   │   ├── mocks/            # Simulaciones de la API de Prado (prado_db.py)
│   │   ├── models/           # Esquemas de la Base de Datos (SQLAlchemy)
│   │   └── services/         # Lógica de la app (cron, llamadas a Matrix)
│   ├── main.py               # Main de FastAPI
│   ├── Dockerfile            # Construcción de la imagen del backend
│   └── requirements.txt      # Dependencias de Python
├── frontend/                 # Frontend de la APP (React + Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/       # Componente visual personalizada de la app
│   │   ├── pages/            # Paneles específicos 
│   │   ├── services/         # Conexión con las llamadas a la API backend
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── Dockerfile            # Construcción de la imagen del frontend
│   ├── package.json          # Dependencias de Node.js
│   └── vite.config.js        # Configuración del empaquetador
├── docs/                     # Documentación adicional del proyecto
└── docker-compose.yml        # Orquestador de contenedores
```

---
## 4. Instalación y Despliegue en Local

Si vas a levantar el entorno de desarrollo local para modificar el código fuente, es necesario descargar las dependencias de Python y Node.js en tu máquina para que tu editor de código funcione correctamente. 

A continuación vamos a ver los pasos a seguir para desplegar y ejecutar el proyecto en local:

### 4.1 Clonar el repositorio

Lo primero es traernos todo el código desde el repositorio de github:

``` bash
git clone git@github.com:OSL-UGR/panel-prado-matrix.git
cd panel-prado-matrix
```

>**Nota importante:** En el comando anterior hemos asumido que ya tenemos configurado git en nuestra máquina.

### 4.2 Instalar dependencias del Sistema Operativo

Vamos a instalar en nuestro equipo todas las herramientas base y librerías necesarias para compilar el proyecto.

>**⚠️ Importante sobre la versión de Python:**
>Es muy recomendable utilizar Python 3.12 para el entorno local. Esta es la versión estable con la que se ha probado el proyecto y ejecuta el contenedor. Para versiones más recientes o antiguas, es posible que algún paquete en el proceso de instalación nos de error.  Para evitarlo se recomienda su uso.

``` bash
sudo apt update
sudo apt install git python3.12 python3.12-venv python3-pip nodejs npm docker.io docker-compose-v2 libpq-dev python3-dev
```

Cada uno de los paquetes instalados tiene la siguiente finalidad:

- **git**: Para clonar y actualizar el repositorio.
- **python3.12**: Versión 3.12 de Python.
- **python3.12-venv**:Nos permite crear los entornos virtuales.
- **python3-pip**: Gestor de paquetes de python para instalar dependencias en el back.
- **nodejs**: Para poder ejecutar el front.
- **npm**: Para instalar algunas dependencias del front.
- **docker.io** y  **docker-compose-v2** Para levantar los contenedores del proyecto.
- **libpq-dev**: Librería de Python necesaria.
- **python3-dev**: Archivo de Python necesario para compilar.

Con estas herramientas instaladas, el sistema dispondrá de todo lo necesario para ejecutar tanto el **backend**, el **frontend** y lel **Docker** utilizado por el proyecto.

### 4.3 Preparamos el entorno Backend:

Vamos a crear un entorno virtual de Python con la versión especificada. Una vez activada dentro de este instalaremos todas las dependencias necesarias definidas por el proyecto  en el archivo `requirements.txt`:

``` bash
cd backend
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```


### 4.4 Preparar el Entorno del Frontend:

Ahora vamos a generar la carpeta `ndoe_modules` para que el fronted tenga todas sus librerías de diseño e interfaz:

``` bash
cd frontend
npm install
cd ..
```

> **Nota importante:** En el comando anterior es bastante probable que al ejecutarlo, nos avise en rojo de algunas vulnerabilidades. Ej: _"1 high severity vulnerability"_

Para corregirlo hacemos caso a lo que nos dime y ejecutamos:

``` bash
npm audit fix
```

### 4.5 Configurar las Variables de Entorno

Como el `.gitignore` ignora los archivos `.env` por seguridad, manualmente vamos a crear el archivo en la raíz del proyecto:

1. Creamos el archivo:

``` bash
nano .env
```

2. Rellenamos toda la información sensible:
``` .env
DATABASE_URL=
MATRIX_URL=
SYNAPSE_ADMIN_URL=
MATRIX_TOKEN=
FRONTEND_URL=
VITE_BACKEND_URL=
MATRIX_BOT_TOKEN=
MATRIX_BOT_ID=
```

>  **Nota importante:** Si en algún momento como en este punto modificamos o añadimos variables de entorno es necesario relanzar todos los contenedores del proyecto con "sudo docker compose up -d --build" después de cerrarlos con "sudo docker compose down -v"

### 4.6 Arrancamos el servicio de docker

Si es la primera vez que lanzamos Docker en nuestra máquina nos tenemos que asegurr que el servicio este activo:

``` bash
sudo systemctl start docker
sudo systemctl enable docker
```

Ahora que tenemos todos los entornos listos, lanzamos los contenedores del proyecto:

``` bash
sudo docker compose up -d --build
```

Y para lanzar la aplicación en el dominio especificado ejecutamos dentro de la carpeta de fronted:

``` bash
cd frontend
npm run dev
```

>  **Nota importante:** En el comando anterior es bastante probable que al ejecutarlo, en vez de utilizar el puerto http://localhost:5173/ utilice el http://localhost:5174/. Si esto sucediese es tan sencillo como borrar el proceso tcp actual del 5173 y relanzarlo para que lo recoja automáticamente: Para ello ejecutamos:

```bash
sudo fuser -k 5173/tcp
```


- **Interfaz de Usuario (Frontend):** [http://localhost:5173/](http://localhost:5173/)
- **Documentación Interactiva de la API (Backend):** [http://localhost:8000/docs#/](http://localhost:8000/docs#/)

---

## 5. Resolución de Problemas 

>A continuación se definen una serie de errores comunes durante el despliegue que se han detectado que pueden ocurrir y el como solucionarlos(Están redactados con IA, quedaban más bonitos xd):

 Error: `Failed building wheel for pydantic_core` o `ForwardRef._evaluate() missing argument`

- **Síntoma:** Al ejecutar `pip install -r requirements.txt`, la instalación falla al compilar librerías como `pydantic-core` o `greenlet` con errores extraños de tipado o indicando que la versión del intérprete es más nueva que la soportada.
- **Causa:** Estás utilizando una versión de Python excesivamente reciente (ej. Python 3.13 o 3.14). Estas versiones alteran APIs internas que rompen el proceso de compilación de las dependencias estrictas del backend.
- **Solución:** Debes utilizar Python 3.12 (la versión estable de producción). Instala `python3.12` en tu sistema, borra la carpeta `venv` actual, e inicializa el entorno de nuevo con el comando `python3.12 -m venv venv`.

Error: `pg_config executable not found` al instalar el backend

- **Causa:** Tu versión de Python intenta compilar `psycopg2` desde cero y no encuentra las librerías base de PostgreSQL en tu sistema operativo.
- **Solución:** Asegúrate de haber instalado los paquetes del sistema indicados en el paso 4.2 (`postgresql-libs` en Arch o `libpq-dev python3-dev` en Ubuntu).

 Error: `Connection refused` en el puerto 5432 (PostgreSQL)

- **Síntoma:** Al levantar Docker por primera vez, el backend se detiene mostrando un error de conexión rechazada y la web `http://localhost:8000` no carga.
- **Causa:** En el primer arranque o al borrar los volúmenes, la base de datos tarda unos segundos en inicializarse. Si el backend arranca demasiado rápido, falla por seguridad (Condición de carrera).
- **Solución:** La base de datos ya se habrá inicializado en segundo plano. Simplemente reinicia el backend con: `sudo docker compose restart backend`


