# ORQUESTACION.md

## Diagrama

    ┌──────────────────────────────────────────┐
    │          Agente Proponente               │
    │  (produce propuesta, plan o decisión)    │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │         Agente Abogado del Diablo        │
    │  (desafía, presiona, encuentra huecos)   │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │          Agente Proponente               │
    │  (revisa o defiende explícitamente)      │
    └────────────────────┬─────────────────────┘
                         ▼
                  ┌──────────────┐
                  │ ¿Más rondas? │
                  └──────┬───────┘
                  no     │  sí
        ┌─────────────────┴────────────┐
        ▼                              ▼
    ┌──────────┐              ┌──────────────────┐
    │ Árbitro  │              │ Siguiente ronda  │
    │ decide   │              │ de desafíos      │
    └──────────┘              └──────────────────┘


## Workflow
Abogado del Diablo

## Objetivo
Fortalecer cualquier propuesta, plan, arquitectura o decisión asignando un agente Abogado del Diablo dedicado cuyo único trabajo es encontrar debilidades, cuestionar suposiciones y obligar al Proponente a construir una solución más robusta.

## Roles
- **Agente Proponente:** produce la propuesta inicial y la defiende o revisa después de cada ronda de desafíos.
- **Agente Abogado del Diablo:** identifica implacablemente fallas, puntos ciegos, casos borde y suposiciones no declaradas — sin proponer alternativas. Solo desafía.
- **Árbitro:** revisa la transcripción completa y decide si la propuesta está suficientemente robustecida o necesita otra ronda. Puede ser un humano o un agente senior.

## Cuándo usar
- Propuestas de alto riesgo: decisiones de arquitectura, specs de producto, casos de inversión, estrategias de precios.
- Decisiones donde el pensamiento de grupo es un riesgo (el equipo está demasiado alineado en un enfoque).
- Antes de cualquier compromiso irreversible.
- Revisiones post-incidente donde "¿por qué no lo pensamos antes?" es un modo de fallo conocido.
- Cualquier plan donde el autor tiene un fuerte sesgo de propiedad.

## Protocolo
1. El Proponente envía la propuesta inicial con afirmaciones explícitas, suposiciones y resultados esperados.
2. El Abogado del Diablo recibe la propuesta y produce un breviario de desafíos:
   - Suposiciones más débiles (top 3).
   - Escenarios donde el plan falla.
   - Stakeholders o riesgos no considerados.
   - Preguntas que el Proponente aún no puede responder.
3. El Proponente responde: revisa la propuesta o defiende explícitamente cada punto de desafío con evidencia.
4. El Abogado del Diablo evalúa la respuesta y:
   - Emite una segunda ola de desafíos (capa más profunda).
   - Declara "sin objeciones críticas adicionales."
5. El Árbitro revisa el intercambio completo y decide: publicar, revisar o escalar.

## Reglas del Abogado del Diablo
- No debe proponer alternativas — solo identificar problemas.
- Debe fundamentar cada desafío en un escenario realista, no en extremos hipotéticos.
- Debe desafiar suposiciones, no solo detalles superficiales.
- No debe repetir la misma objeción si fue adecuadamente abordada.
- Debe producir al menos 3 categorías de desafío distintas por ronda.

## Reglas del Proponente
- Debe responder a cada desafío — sin omitir ninguno.
- "Lo resolveremos después" no es una defensa aceptable sin un plan concreto.
- Las revisiones deben ser explícitas: indicar qué cambió y por qué.

## Reglas generales
- Máximo 3 rondas antes de que el Árbitro tome una decisión final.
- El breviario de desafíos y todas las respuestas son registros de auditoría inmutables.
- La decisión del Árbitro debe incluir justificación.

## Entregables
- Propuesta final robustecida (con historial de revisiones).
- Log de desafíos: todas las objeciones planteadas y sus disposiciones (resuelto / riesgo aceptado / diferido con plan).
- Decisión del Árbitro con justificación.
- Lista de riesgos explícitamente aceptados.
