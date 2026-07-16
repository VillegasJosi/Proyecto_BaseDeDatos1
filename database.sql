-- 1. Creación de la Base de Datos
CREATE DATABASE Decarrerita;
GO
USE Decarrerita;
GO

-- 2. Creación de Esquemas para organización
CREATE SCHEMA usuarios;
GO
CREATE SCHEMA operaciones;
GO

/*-- Verificar y crear esquema usuarios
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'usuarios')
BEGIN
    EXEC('CREATE SCHEMA usuarios;');
END
GO

-- Verificar y crear esquema operaciones
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'operaciones')
BEGIN
    EXEC('CREATE SCHEMA operaciones;');
END
GO*/

-- 3.Creación de Tablas (DDL con Restricciones)
-- Tabla de Bancos (Tabla base gestionada por administración)
CREATE TABLE operaciones.Bancos (
    id_banco INT IDENTITY(1,1) CONSTRAINT PK_Bancos PRIMARY KEY,
    nombre_banco VARCHAR(50) NOT NULL UNIQUE
);

-- Tabla Maestra de Usuarios (Para manejar el Login y Roles)
CREATE TABLE usuarios.Cuentas (
    id_usuario INT IDENTITY(1,1) CONSTRAINT PK_Cuentas PRIMARY KEY,
    correo VARCHAR(100) NOT NULL UNIQUE,
    contrasena VARCHAR(50) NOT NULL,
    tipo_usuario VARCHAR(30) NOT NULL 
        CONSTRAINT CK_TipoUsuario CHECK (tipo_usuario IN ('Administrador', 'Chofer', 'Cliente', 'Personal Administrativo'))
);

-- Tabla de Clientes
CREATE TABLE usuarios.Clientes (
    id_cliente INT CONSTRAINT PK_Clientes PRIMARY KEY, -- Se amarra al id_usuario de Cuentas
    nombre VARCHAR(30) NOT NULL,
    apellido VARCHAR(30) NOT NULL,
    telefono VARCHAR(15) NOT NULL,
    cedula VARCHAR(15) NOT NULL UNIQUE,
    saldo_usuario DECIMAL(18,2) CONSTRAINT DF_SaldoCliente DEFAULT 0.00 CONSTRAINT CK_SaldoPositivo CHECK (saldo_usuario >= 0),
    CONSTRAINT FK_Clientes_Cuentas FOREIGN KEY (id_cliente) REFERENCES usuarios.Cuentas(id_usuario) ON DELETE CASCADE
);

-- Tabla de Choferes
CREATE TABLE usuarios.Choferes (
    id_chofer INT CONSTRAINT PK_Choferes PRIMARY KEY, -- Se amarra al id_usuario de Cuentas
    nombre VARCHAR(30) NOT NULL,
    apellido VARCHAR(30) NOT NULL,
    telefono VARCHAR(15) NOT NULL,
    cedula VARCHAR(15) NOT NULL UNIQUE,
    id_banco INT NULL,
    nro_cuenta VARCHAR(20) NULL,
    saldo_a_favor DECIMAL(18,2) CONSTRAINT DF_SaldoChofer DEFAULT 0.00,
    -- Datos de Emergencia (Mínimo 2 solicitados)
    contacto_emergencia1 VARCHAR(50) NOT NULL,
    telefono_emergencia1 VARCHAR(15) NOT NULL,
    contacto_emergencia2 VARCHAR(50) NOT NULL,
    telefono_emergencia2 VARCHAR(15) NOT NULL,
    CONSTRAINT FK_Choferes_Cuentas FOREIGN KEY (id_chofer) REFERENCES usuarios.Cuentas(id_usuario) ON DELETE CASCADE,
    CONSTRAINT FK_Choferes_Bancos FOREIGN KEY (id_banco) REFERENCES operaciones.Bancos(id_banco)
);

--Módulo de Evaluaciones y Vehículos
-- Tabla de Vehículos
CREATE TABLE operaciones.Vehiculos (
    id_vehiculo INT IDENTITY(1,1) CONSTRAINT PK_Vehiculos PRIMARY KEY,
    id_chofer INT NOT NULL,
    marca VARCHAR(30) NOT NULL,
    modelo VARCHAR(30) NOT NULL,
    placa VARCHAR(15) NOT NULL UNIQUE,
    color VARCHAR(20) NOT NULL,
    CONSTRAINT FK_Vehiculos_Choferes FOREIGN KEY (id_chofer) REFERENCES usuarios.Choferes(id_chofer) ON DELETE CASCADE
);

-- Tabla de Evaluaciones (Choferes y Vehículos)
CREATE TABLE operaciones.Evaluaciones (
    id_evaluacion INT IDENTITY(1,1) CONSTRAINT PK_Evaluaciones PRIMARY KEY,
    id_chofer INT NOT NULL,
    id_vehiculo INT NOT NULL,
    nota_psicologica INT NOT NULL CONSTRAINT CK_NotaPsico CHECK (nota_psicologica BETWEEN 73 AND 100),
    nota_vehiculo INT NOT NULL CONSTRAINT CK_NotaVehiculo CHECK (nota_vehiculo BETWEEN 65 AND 100),
    fecha_evaluacion DATE NOT NULL,
    CONSTRAINT FK_Evaluaciones_Choferes FOREIGN KEY (id_chofer) REFERENCES usuarios.Choferes(id_chofer),
    CONSTRAINT FK_Evaluaciones_Vehiculos FOREIGN KEY (id_vehiculo) REFERENCES operaciones.Vehiculos(id_vehiculo)
); 

--Módulo de Finanzas y Traslados
-- Historial de Recargas de Clientes
CREATE TABLE operaciones.Recargas (
    id_recarga INT IDENTITY(1,1) CONSTRAINT PK_Recargas PRIMARY KEY,
    id_cliente INT NOT NULL,
    monto DECIMAL(18,2) NOT NULL CONSTRAINT CK_MontoRecarga CHECK (monto > 0),
    fecha_recarga DATE NOT NULL,
    nro_referencia VARCHAR(20) NOT NULL UNIQUE,
    id_banco_origen INT NOT NULL,
    CONSTRAINT FK_Recargas_Clientes FOREIGN KEY (id_cliente) REFERENCES usuarios.Clientes(id_cliente),
    CONSTRAINT FK_Recargas_Bancos FOREIGN KEY (id_banco_origen) REFERENCES operaciones.Bancos(id_banco)
);

-- Tabla de Traslados
CREATE TABLE operaciones.Traslados (
    id_traslado INT IDENTITY(1,1) CONSTRAINT PK_Traslados PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_chofer INT NOT NULL,
    id_vehiculo INT NOT NULL,
    punto_A VARCHAR(100) NOT NULL,
    punto_B VARCHAR(100) NOT NULL,
    distancia_km DECIMAL(5,2) NOT NULL,
    costo_total DECIMAL(18,2) NOT NULL,
    ganancia_empresa DECIMAL(18,2) NOT NULL, -- 30%
    pago_chofer DECIMAL(18,2) NOT NULL,    -- 70%
    fecha_traslado DATE NOT NULL,
    estado_pago_chofer VARCHAR(20) CONSTRAINT DF_EstadoPago DEFAULT 'Pendiente' 
        CONSTRAINT CK_EstadoPago CHECK (estado_pago_chofer IN ('Pendiente', 'Cancelado')),
    CONSTRAINT FK_Traslados_Clientes FOREIGN KEY (id_cliente) REFERENCES usuarios.Clientes(id_cliente),
    CONSTRAINT FK_Traslados_Choferes FOREIGN KEY (id_chofer) REFERENCES usuarios.Choferes(id_chofer),
    CONSTRAINT FK_Traslados_Vehiculos FOREIGN KEY (id_vehiculo) REFERENCES operaciones.Vehiculos(id_vehiculo)
);

-- Pagos realizados a Choferes por el Personal Administrativo
CREATE TABLE operaciones.PagosChoferes (
    id_pago INT IDENTITY(1,1) CONSTRAINT PK_PagosChoferes PRIMARY KEY,
    id_chofer INT NOT NULL,
    monto_pagado DECIMAL(18,2) NOT NULL,
    fecha_pago DATE NOT NULL,
    nro_referencia VARCHAR(20) NOT NULL UNIQUE,
    CONSTRAINT FK_PagosChoferes_Choferes FOREIGN KEY (id_chofer) REFERENCES usuarios.Choferes(id_chofer)
);

CREATE TABLE operaciones.VehiculosPendientes (
    id_postulacion INT IDENTITY(1,1) PRIMARY KEY,
    id_chofer INT FOREIGN KEY REFERENCES usuarios.Choferes(id_chofer),
    marca VARCHAR(50),
    modelo VARCHAR(50),
    placa VARCHAR(20),
    color VARCHAR(30),
    fecha_solicitud DATETIME DEFAULT GETDATE(),
    estado VARCHAR(20) DEFAULT 'Pendiente' -- Pendiente, Aprobado, Rechazado
);

select * from operaciones.Bancos;
select * from operaciones.Evaluaciones;
select * from operaciones.PagosChoferes;
select * from operaciones.Recargas;
select * from operaciones.Traslados;
select * from operaciones.Vehiculos;
select * from usuarios.Choferes;
select * from usuarios.Clientes;
select * from usuarios.Cuentas;
select * from operaciones.VehiculosPendientes;
-- Ejecuta esto si la tabla donde intentas guardarlo es VehiculosPendientes
ALTER TABLE operaciones.VehiculosPendientes ADD nota_vehiculo INT NULL;
ALTER TABLE usuarios.Choferes ADD estatus VARCHAR(50) DEFAULT 'Pendiente';

-- 1. Eliminar las restricciones estrictas actuales
ALTER TABLE operaciones.Evaluaciones DROP CONSTRAINT CK_NotaPsico;
ALTER TABLE operaciones.Evaluaciones DROP CONSTRAINT CK_NotaVehiculo;

-- 2. Volver a crearlas permitiendo notas desde 0 hasta 100 (para poder registrar reprobados)
ALTER TABLE operaciones.Evaluaciones 
ADD CONSTRAINT CK_NotaPsico CHECK (nota_psicologica BETWEEN 0 AND 100);

ALTER TABLE operaciones.Evaluaciones 
ADD CONSTRAINT CK_NotaVehiculo CHECK (nota_vehiculo BETWEEN 0 AND 100);

update usuarios.Choferes
set estatus = 'APROBADO' where id_chofer = 2;


SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'operaciones' AND TABLE_NAME = 'Vehiculos';

-- 1. Primero eliminamos los traslados asociados a ese vehículo específico
DELETE FROM operaciones.Traslados 
WHERE id_vehiculo IN (SELECT id_vehiculo FROM operaciones.Vehiculos WHERE placa = 'AA123BB');

-- 2. Luego eliminamos las evaluaciones asociadas a ese vehículo
DELETE FROM operaciones.Evaluaciones 
WHERE id_vehiculo IN (SELECT id_vehiculo FROM operaciones.Vehiculos WHERE placa = 'AA123BB');

-- 3. Finalmente, eliminamos el vehículo de la tabla oficial
DELETE FROM operaciones.Vehiculos 
WHERE placa = 'AA123BB';

-- 4. Por si acaso quedó un registro espejo en pendientes
DELETE FROM operaciones.VehiculosPendientes 
WHERE placa = 'AA123BB';

-- 4.Datos de Prueba (DML - INSERT) --

-- Insertar Bancos Base
INSERT INTO operaciones.Bancos (nombre_banco) VALUES ('Banco de Venezuela'), ('Banesco'), ('Mercantil');

-- Crear Cuentas de Acceso
INSERT INTO usuarios.Cuentas (correo, contrasena, tipo_usuario) VALUES 
('admin@decarrerita.com', 'admin123', 'Personal Administrativo'),
('chofer1@gmail.com', 'chofer123', 'Chofer'),
('cliente1@gmail.com', 'cliente123', 'Cliente');

-- Registrar Datos del Cliente (ID 3 basado en la cuenta creada)
INSERT INTO usuarios.Clientes (id_cliente, nombre, apellido, telefono, cedula, saldo_usuario)
VALUES (3, 'Carlos', 'Mendoza', '04141234567', 'V-26123456', 50.00); -- Inicia con 50 de saldo

-- Registrar Datos del Chofer (ID 2 basado en la cuenta creada)
INSERT INTO usuarios.Choferes (id_chofer, nombre, apellido, telefono, cedula, id_banco, nro_cuenta, contacto_emergencia1, telefono_emergencia1, contacto_emergencia2, telefono_emergencia2)
VALUES (2, 'Juan', 'Perez', '04247654321', 'V-18987654', 1, '01020000000000000000', 'Maria Perez (Madre)', '04169998877', 'Pedro Gomez (Amigo)', '04125554433');

-- Registrar Vehículo del Chofer
INSERT INTO operaciones.Vehiculos (id_chofer, marca, modelo, placa, color)
VALUES (2, 'Chevrolet', 'Aveo', 'AA123BB', 'Plata');

-- Registrar Evaluación Aprobada por el Personal Administrativo
INSERT INTO operaciones.Evaluaciones (id_chofer, id_vehiculo, nota_psicologica, nota_vehiculo, fecha_evaluacion)
VALUES (2, 1, 85, 75, '2026-01-15');

/*Consultas Clave por Tipo de Usuario (DML - SELECT & VIEWS)
A. Usuario Cliente
El cliente puede ver el historial de sus recargas y los datos del chofer asignado a su viaje.*/

-- Vista para que el Cliente vea sus datos y saldo actual
CREATE VIEW usuarios.VistaPerfilCliente AS
SELECT nombre, apellido, telefono, saldo_usuario FROM usuarios.Clientes;

-- Consulta de historial de recargas de un cliente específico (Ej: Cliente ID 3)
SELECT fecha_recarga, monto, nro_referencia, b.nombre_banco 
FROM operaciones.Recargas r
INNER JOIN operaciones.Bancos b ON r.id_banco_origen = b.id_banco
WHERE id_cliente = 3;

-- Datos del chofer y vehículo que verá el cliente al solicitar un traslado
CREATE VIEW operaciones.VistaInformacionViaje AS
SELECT t.id_traslado, t.id_cliente, c.nombre AS Chofer, c.apellido AS ApellidoChofer, 
       v.marca, v.modelo, v.placa, t.punto_A, t.punto_B, t.costo_total
FROM operaciones.Traslados t
INNER JOIN usuarios.Choferes c ON t.id_chofer = c.id_chofer
INNER JOIN operaciones.Vehiculos v ON t.id_vehiculo = v.id_vehiculo;

/*B. Usuario Chofer
El chofer necesita controlar sus finanzas según rangos de fechas.*/

-- Listar traslados realizados en un periodo de tiempo y su estado de pago
SELECT id_traslado, punto_A, punto_B, costo_total, pago_chofer, estado_pago_chofer, fecha_traslado
FROM operaciones.Traslados
WHERE id_chofer = 2 AND fecha_traslado BETWEEN '2026-01-01' AND '2026-06-30';

-- Listar traslados pendientes por cobrar
SELECT id_traslado, punto_A, punto_B, pago_chofer, fecha_traslado 
FROM operaciones.Traslados 
WHERE id_chofer = 2 AND estado_pago_chofer = 'Pendiente';

/*C. Usuario Personal Administrativo
Reportes financieros de control corporativo.*/

-- Ver lo recaudado por la empresa (ganancia 30%) en un periodo de tiempo
SELECT SUM(ganancia_empresa) AS Total_Ganancia_Empresa 
FROM operaciones.Traslados
WHERE fecha_traslado BETWEEN '2026-06-01' AND '2026-06-30';

-- Ver lo pagado a un chofer específico (Ej: Chofer ID 2) en un período de tiempo
SELECT SUM(monto_pagado) AS Total_Pagado_Chofer 
FROM operaciones.PagosChoferes
WHERE id_chofer = 2 AND fecha_pago BETWEEN '2026-01-01' AND '2026-06-30';



/*5. Simulación Práctica de una Operación CompletaPara comprobar que las restricciones 
y flujos matemáticos funcionan, ejecutemos la solicitud 
de un viaje de 5 Km (Tarifa Base = $2.00, Precio por Km = $1.00 >>> Costo Total = $7.00).*/

-- 1. El cliente recarga saldo en su cuenta
INSERT INTO operaciones.Recargas (id_cliente, monto, fecha_recarga, nro_referencia, id_banco_origen)
VALUES (3, 20.00, '2026-06-30', 'REF998877', 2);

UPDATE usuarios.Clientes SET saldo_usuario = saldo_usuario + 20.00 WHERE id_cliente = 3;

-- 2. Se registra el traslado (El sistema descuenta del saldo del cliente y calcula el 70%/30%)
INSERT INTO operaciones.Traslados (id_cliente, id_chofer, id_vehiculo, punto_A, punto_B, distancia_km, costo_total, ganancia_empresa, pago_chofer, fecha_traslado, estado_pago_chofer)
VALUES (3, 2, 1, 'Alta Vista', 'Unare', 5.00, 7.00, (7.00 * 0.30), (7.00 * 0.70), '2026-06-30', 'Pendiente');

-- 3. Afectación de saldos por el viaje
UPDATE usuarios.Clientes SET saldo_usuario = saldo_usuario - 7.00 WHERE id_cliente = 3;
UPDATE usuarios.Choferes SET saldo_a_favor = saldo_a_favor + (7.00 * 0.70) WHERE id_chofer = 2;

-- 4. El administrador procesa el pago de la deuda al chofer
INSERT INTO operaciones.PagosChoferes (id_chofer, monto_pagado, fecha_pago, nro_referencia)
VALUES (2, 4.90, '2026-06-30', 'PAGO0001');

-- Se actualizan los traslados correspondientes a estado 'Cancelado'
UPDATE operaciones.Traslados SET estado_pago_chofer = 'Cancelado' WHERE id_chofer = 2 AND fecha_traslado = '2026-06-30';
UPDATE usuarios.Choferes