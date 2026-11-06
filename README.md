# 💊 Sistema de Gestión de Inventario y Ventas - Botica "Nova Salud"

Este proyecto corresponde al **Trabajo Final del Curso (Entregable 3)** para la clase de **Fullstack Developer Software**. Consiste en una API REST robusta construida con **NestJS** para automatizar el control de stock, alertas de reposición y el registro de ventas de la botica, eliminando los procesos manuales y optimizando la atención al cliente.

---

## 🚀 Tecnologías Utilizadas

*   **Runtime:** [Bun](https://bun.sh) (Gestor de paquetes y entorno de ejecución ultra rápido)
*   **Framework:** [NestJS v10+](https://nestjs.com) (Arquitectura modular y escalable)
*   **Lenguaje:** [TypeScript](https://typescriptlang.org)
*   **Testing:** [Vitest](https://vitest.dev) (Pruebas unitarias nativas de alta velocidad)

---

## 🛠️ Estructura del Módulo de Productos

El backend implementa una arquitectura limpia estructurada en los siguientes archivos clave:
*   `producto.entity.ts`: Estructura y tipado base de un producto (ID, Nombre, Precio, Stock, Stock Mínimo).
*   `productos.controller.ts`: Puntos de entrada (Endpoints) expuestos para el cliente web.
*   `productos.service.ts`: Lógica de negocio (Control de almacenamiento en memoria y cálculo de alertas).
*   `create-producto.dto.ts`: Validación de datos de entrada para la creación segura de productos.

---

## 📋 Endpoints de la API

### 📦 Gestión de Inventario
*   **`GET /productos`**: Retorna la lista completa de productos en el inventario.
*   **`GET /productos/:id`**: Busca y retorna un producto específico mediante su ID.
*   **`POST /productos`**: Registra un nuevo medicamento o producto en la plataforma.
*   **`PUT /productos/:id`**: Actualiza los datos o existencias de un producto existente.
*   **`DELETE /productos/:id`**: Elimina un producto del catálogo.

### ⚠️ Alertas y Control
*   **`GET /productos/alertas/bajo-stock`**: Filtra y expone de forma automática los productos cuyo `stock` sea menor o igual al `stockMinimo`, permitiendo la reposición temprana para evitar desabastecimientos.

---

## 💻 Instalación y Ejecución

Sigue estos pasos para clonar, instalar y levantar el servidor localmente utilizando **Bun**:

### 1. Clonar el repositorio
```bash
git clone https://github.com/SE-p11/entregablefullstack.git
cd entregablefullstack/entregable3
```

### 2. Instalar dependencias
```bash
bun install
```

### 3. Levantar el servidor en modo desarrollo
```bash
bun run start:dev
```
El servidor se iniciará en: `http://localhost:3000`

---

## 🧪 Pruebas (Testing)

Para ejecutar la suite de pruebas unitarias y verificar la integridad de la lógica del inventario con **Vitest**, ejecuta:

```bash
bun test
```
