# ORQUESTACION.md

## Diagrama

    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │    L1    │─────>│    L2    │─────>│    L3    │
    │  Rutina  │      │ Avanzado │      │ Experto  │
    └────┬─────┘      └────┬─────┘      └────┬─────┘
         │                 │                  │
         v                 v                  v
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │Resuelto? │      │Resuelto? │      │Resuelto? │
    │  Si [+]  │      │  Si [+]  │      │  Si [+]  │
    └──────────┘      └──────────┘      └──────────┘

    <--- Controlador de escalamiento (SLA watch) --->

## Workflow
Cadena de escalamiento (escalamiento progresivo por niveles)

## Objetivo
Enrutar problemas a través de niveles con capacidad o autoridad creciente hasta su resolución.

## Roles
- **Agente L1:** primer respondedor, maneja patrones conocidos.
- **Agente L2:** diagnóstico más profundo, herramientas más amplias.
- **Agente L3:** especialista, acceso a sistemas raíz.
- **Controlador de escalamiento:** monitorea SLA y dispara la promoción.

## Cuándo usar
- Soporte u operaciones con expertise escalonado.
- Necesidad de proteger capacidad senior del trabajo rutinario.

## Protocolo
1. L1 recibe e intenta resolver dentro de la ventana de SLA.
2. Si no resuelve o está fuera de alcance, escala a L2 con resumen de contexto.
3. L2 repite; escala a L3 si es necesario.
4. Cada nivel agrega hallazgos al ticket compartido.
5. Resolución confirmada en el nivel de origen.

## Reglas
- Nunca saltar niveles sin override explícito.
- Cada escalamiento debe incluir: qué se intentó, qué falló, evidencia relevante.
- El de-escalamiento se permite una vez identificada la causa raíz.

## Entregables
- Registro de resolución con traza por nivel
- Métricas de tiempo por nivel
- Log de razones de escalamiento
