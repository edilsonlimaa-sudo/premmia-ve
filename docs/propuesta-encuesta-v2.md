# Propuesta: encuesta v2

Baseada em `contexto-ideia.md`. Objetivo da enquete, pelo que você descreveu:

1. **Provar demanda ao dono do posto** (argumento B2B): o motorista quer, pagaria a mais e
   até mudaria de posto por isso.
2. **Achar o número mágico** do recargo.
3. **Descobrir a barreira** que faria o motorista não usar (para o produto e para o pitch).
4. **Captar leads** para o dia do lançamento no posto.

A enquete atual cobre 1, 2 e 4 de forma rasa. O que falta é o que mais pesa para o dono do
posto: *ele ganha ou perde cliente com isso?* e *qual é a dor real do pagamento hoje?*

Tempo alvo por entrevista: 60 a 90 segundos (9 toques + leads). Na fila isso é tranquilo.

---

## Perguntas propostas

### Bloco A – Perfil (segmenta tudo o resto)

**P1. ¿Cómo usa este vehículo?**
- Particular
- Taxi / ruta / transporte de pasajeros
- Delivery / moto
- Comercial / empresa

*Por quê:* o chofer de ruta carrega todo dia e é quem mais perde tempo na fila. Separar
"particular" de "profissional" permite dizer ao dono: "X% dos profissionais pagariam 5%".
Hoje isso está misturado dentro da opção "Diario (Transporte / Chófer / Delivery)".

**P2. ¿Cada cuánto carga gasolina?**
- Diario
- 2 a 3 veces por semana
- 1 vez por semana
- Eventual / de paso

*Por quê:* projeção de volume de transações para o posto (frequência × ticket × % adoção).

### Bloco B – Dor atual (evidência para o posto)

**P3. ¿Cuánto tiempo le toma el pago hoy?** (bajarse, hacer pago móvil, mostrar comprobante, recibir ticket)
- Menos de 5 minutos
- De 5 a 15 minutos
- Más de 15 minutos

*Por quê:* é exatamente o pedaço que o app elimina. Mantida da v1.

**P4. ¿Qué es lo más molesto de cargar gasolina hoy?** (pode marcar até 2)
- Bajarse del carro y hacer fila para pagar
- Fallas del pago móvil / internet en la estación
- No saber si hay gasolina antes de llegar
- La espera en la cola en general
- Nada, está bien así

*Por quê:* mostra ao dono que a dor é a fila de pagamento (que ele controla), não só o
desabastecimento. A opção de "no saber si hay gasolina" valida a sua ideia original de
visibilidade. Única pergunta de múltipla escolha.

**P5. ¿Cómo paga normalmente?**
- Pago Móvil
- Efectivo (USD)
- Efectivo (Bs)
- Punto de venta / tarjeta
- Biopago

*Por quê:* quem já paga por Pago Móvil é o cliente imediato (já tem celular, internet e
banco). Adicionei Biopago porque é comum em postos na Venezuela.

### Bloco C – A solução

**P6. Si pudiera pagar desde el carro con una app y recibir el ticket sin bajarse, ¿la usaría?**
- Definitivamente sí
- Tal vez / la probaría
- No me interesa

**P7. ¿Cuánto más pagaría por esa comodidad?** (o máximo que aceita)
- Hasta 5 % más (≈ $0,75 en una carga de $15)
- Hasta 3 % más (≈ $0,45 en una carga de $15)
- Solo un monto fijo pequeño (unos centavos)
- Nada extra

*Por quê:* o exemplo em dinheiro evita que a pessoa rejeite "5%" por reflexo. O valor de
referência da carga (US$ 15) fica configurável no código para você ajustar ao preço real.

**P8. ¿Qué le preocuparía más al pagar por la app?**
- Que no me reconozcan el pago en la bomba
- La seguridad de mi dinero o mis datos
- Que falle el internet y me quede sin cargar
- Nada, lo usaría tranquilo

*Por quê:* define o que o produto precisa resolver primeiro (ex.: confirmação visível ao
frentista pela placa) e dá ao dono do posto a resposta pronta para a objeção dele.

**P9. ¿Cambiaría de estación por una que le deje pagar sin bajarse?**
- Sí, iría a esa aunque quede un poco más lejos
- Solo si queda igual de cerca
- No, cargo siempre aquí

*Por quê:* **é o número que fecha o posto.** "X% dos seus clientes iriam para o concorrente
que tiver isso" é o argumento mais forte que você pode levar na reunião. Também mede o
risco para quem não adotar.

### Bloco D – Lead (opcional, como hoje)

- Placa del vehículo
- WhatsApp — com o gancho: *"¿Le avisamos cuando funcione en esta estación?"*

---

## O que sai, o que muda

| v1 | v2 |
|---|---|
| P1 Frecuencia (misturava papel do motorista) | P1 Uso do veículo + P2 Frecuencia |
| P2 Tiempo en oficina | P3 (igual) |
| — | P4 Lo más molesto (nova, múltipla) |
| P5 Método de pago | P5 + Biopago |
| P3 Intención | P6 (texto mais concreto) |
| P4 Recargo | P7 com exemplo em dinheiro |
| — | P8 Preocupación (nova) |
| — | P9 Cambiaría de estación (nova) |

## Mudanças no app que isso implica

- Suporte a pergunta de múltipla escolha (só P4), com limite de 2 marcações.
- Dashboard: novos cards "% cambiaría de estación" e "% profissionais que pagariam 3–5 %";
  gráficos para P4, P8 e P9; cruzamento intenção × tipo de uso.
- Contador de **"No quiso participar"**: um botão na tela inicial para registrar recusas.
  Isso deixa você dizer "abordei 400, 300 responderam", o que dá credibilidade ao dado.
- Como o app ainda não está em produção, os IDs das perguntas mudam sem migração.

## Sugestão de abordagem (não é parte do app)

"Buenas, estoy haciendo un estudio de mercado sobre el pago en las bombas, son 9 preguntas de
un minuto, ¿me ayuda?" Fazer de dentro do carro dele, enquanto a fila anda. Começar pelo
bloco B (a dor) para o motorista se engajar antes de ouvir a solução.
