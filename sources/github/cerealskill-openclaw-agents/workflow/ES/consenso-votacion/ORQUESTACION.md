# ORQUESTACION.md

## Diagrama

    ┌────────────┐
    │ Proponente │──── define pregunta + opciones
    └─────┬──────┘
          ▼
    ┌───────────┐  ┌───────────┐  ┌───────────┐
    │ Votante 1 │  │ Votante 2 │  │ Votante N │
    │  (ciego)  │  │  (ciego)  │  │  (ciego)  │
    └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
          │              │              │
          ▼              ▼              ▼
    ┌────────────────────────────────────────┐
    │     Moderador: conteo + quórum         │
    └──────────────────┬─────────────────────┘
                       │
               ┌───────┴───────┐
               ▼               ▼
         ┌──────────┐   ┌───────────┐
         │ Mayoría  │   │ 2da ronda │
         └──────────┘   └───────────┘


## Workflow
Consenso / Votación (decisión por voto de N agentes)

## Objetivo
Alcanzar una decisión colectiva cuando ningún agente tiene autoridad o visibilidad completa.

## Roles
- **Proponente:** enmarca la pregunta y las opciones.
- **N Votantes:** cada uno evalúa independientemente y emite voto.
- **Moderador:** contabiliza, detecta empates y declara resultado.

## Cuándo usar
- Decisiones subjetivas o de alto impacto.
- Múltiples perspectivas igualmente válidas.
- Necesidad de reducir sesgo de un solo agente.

## Protocolo
1. Proponente define pregunta, opciones y criterios de evaluación.
2. Cada votante revisa evidencia y envía boleta estructurada.
3. Moderador recolecta boletas, verifica quórum.
4. Mayoría gana; empates resueltos por criterios ponderados o segunda ronda.
5. Opiniones disidentes registradas para el acta.

## Formato de boleta
- Elección
- Confianza (alta / media / baja)
- Razonamiento (1-3 oraciones)

## Reglas
- Los votantes no deben ver boletas ajenas antes de enviar la propia.
- Quórum: mínimo ⌈N/2⌉ + 1 votos requeridos.
- Las abstenciones cuentan para quórum pero no para mayoría.

## Entregables
- Decisión final con conteo de votos
- Log de disidencias
- Criterios usados para desempate (si aplica)
