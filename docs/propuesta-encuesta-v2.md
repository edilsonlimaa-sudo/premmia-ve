# Propuesta: encuesta v2

Baseada em `contexto-ideia.md`. Objetivo da enquete, pelo que você descreveu:

1. **Provar demanda ao dono do posto** (argumento B2B): o motorista quer, pagaria a mais e
   até mudaria de posto por isso.
2. **Achar o número mágico** do recargo.
3. **Descobrir a barreira** que faria o motorista não usar (para o produto e para o pitch).
4. **Captar leads** para o dia do lançamento no posto.

A enquete atual cobre 1, 2 e 4 de forma rasa. O que falta é o que mais pesa para o dono do
posto: *ele ganha ou perde cliente com isso?* e *qual é a dor real do pagamento hoje?*

Tempo alvo por entrevista: 60 a 90 segundos (11 toques + leads). Na fila isso é tranquilo.

> **Revisão (v2.1):** a P9 original ("¿cambiaría de estación?") foi descartada. Na Venezuela
> o motorista carrega onde tem gasolina na hora, não existe fidelidade a um posto. O que
> direciona tráfego é **informação** (onde tem gasolina e quanta fila), que o posto fornece em
> troca do serviço. A P11 passou a medir isso e entrou a P6 sobre como o motorista se informa hoje.
>
> **Revisão (v2.2):** a pergunta de minutos no pagamento virou duas de percepção (P3 e P4):
> se bajarse a pagar frena a fila e o que mais afeta o motorista nessa etapa.

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

**P3. ¿Tener que bajarse a pagar hace que la cola avance más lento?**
- Sí, mucho
- Un poco
- No, la cola es lenta por otra razón
- No lo había pensado

*Por quê:* substitui a pergunta de minutos (v2.0), que era chute autodeclarado. Mede se o
motorista atribui a lentidão da fila à etapa de pagamento. KPI para o posto: "X% creen que
bajarse a pagar frena la cola", o argumento de carros atendidos por hora. "No lo había
pensado" evita induzir a resposta e mostra quanta gente nunca questionou a operação.

**P4. ¿Qué le afecta de tener que bajarse a pagar?** (pode marcar várias; "Nada" é exclusiva)
- El tiempo que pierdo
- Dejar el carro solo (niños, pertenencias)
- La fila para pagar y mostrar el comprobante
- La inseguridad al bajarme
- Nada, me da igual

*Por quê:* localiza onde a operação do posto dói. Se o top for "dejar el carro solo" ou
"inseguridad", o argumento muda: não é só tempo, é tranquilidade. Múltipla, para não
perder a segunda razão; o ranking sai da frequência de cada opção.

**P5. ¿Qué es lo más molesto de cargar gasolina hoy?** (pode marcar várias; "Nada" é exclusiva)
- Bajarse del carro y hacer fila para pagar
- Fallas del pago móvil / internet en la estación
- No saber si hay gasolina antes de llegar
- La espera en la cola en general
- Nada, está bien así

*Por quê:* mostra ao dono que a dor é a fila de pagamento (que ele controla), não só o
desabastecimento. A opção de "no saber si hay gasolina" valida a sua ideia original de
visibilidade. Única pergunta de múltipla escolha.

**P6. ¿Cómo se entera hoy de dónde hay gasolina?** (pode marcar várias)
- Grupos de WhatsApp / redes
- Pasando por la bomba a ver
- Me avisa un amigo o chofer
- No me entero, voy y pruebo

*Por quê:* mostra ao posto que hoje ele não tem canal nenhum com o motorista. Se a maioria
responde "pasando a ver" ou "voy y pruebo", o argumento "me dá seus dados de funcionamento e
eu viro seu canal" fica pronto.

**P7. ¿Cómo paga normalmente?** (pode marcar várias)
- Pago Móvil
- Efectivo (USD)
- Efectivo (Bs)
- Punto de venta / tarjeta
- Biopago

*Por quê:* quem já paga por Pago Móvil é o cliente imediato (já tem celular, internet e
banco). Adicionei Biopago porque é comum em postos na Venezuela.

### Bloco C – A solução

**P8. Si pudiera pagar desde el carro con una app y recibir el ticket sin bajarse, ¿la usaría?**
- Definitivamente sí
- Tal vez / la probaría
- No me interesa

**P9. ¿Cuánto más pagaría por esa comodidad?** (o máximo que aceita)
- Hasta 5 % más (≈ $0,75 en una carga de $15)
- Hasta 3 % más (≈ $0,45 en una carga de $15)
- Solo un monto fijo pequeño (unos centavos)
- Nada extra

*Por quê:* o exemplo em dinheiro evita que a pessoa rejeite "5%" por reflexo. O valor de
referência da carga (US$ 15) fica configurável no código para você ajustar ao preço real.

**P10. ¿Qué le preocuparía al pagar por la app?** (pode marcar várias)
- Que no me reconozcan el pago en la bomba
- La seguridad de mi dinero o mis datos
- Que falle el internet y me quede sin cargar
- Nada, lo usaría tranquilo

*Por quê:* define o que o produto precisa resolver primeiro (ex.: confirmação visível ao
frentista pela placa) e dá ao dono do posto a resposta pronta para a objeção dele.

**P11. Si una app le dijera, antes de salir, qué estación tiene gasolina ahora y cuánta cola hay, ¿qué haría?**
- Iría directo a esa estación
- Lo miraría, pero cargo donde me quede de paso
- No me cambiaría nada

*Por quê:* **é o número que fecha o posto.** "X% dos motoristas iriam direto ao posto que a
app mostrar com gasolina e pouca fila" é exatamente o que o dono ganha ao te dar
previsibilidade sobre o funcionamento dele. Mede se a informação move o motorista.

### Bloco D – Lead (opcional, como hoje)

- Placa del vehículo
- WhatsApp — com o gancho: *"¿Le avisamos cuando funcione en esta estación?"*

---

## O que sai, o que muda

| v1 | v2 |
|---|---|
| P1 Frecuencia (misturava papel do motorista) | P1 Uso do veículo + P2 Frecuencia |
| P2 Tiempo en oficina | P3 Frena la cola + P4 Lo que más afecta (percepção, v2.2) |
| — | P5 Lo más molesto (nova, múltipla) |
| P5 Método de pago | P7 + Biopago |
| P3 Intención | P8 (texto mais concreto) |
| P4 Recargo | P9 com exemplo em dinheiro |
| — | P6 Cómo se entera hoy (nova) |
| — | P10 Preocupación (nova) |
| — | P11 Iría directo con información (nova) |

## Mudanças no app que isso implica

- Suporte a pergunta de múltipla escolha (P4, P5, P6, P7 e P10), sem limite; a opção "Nada" de cada uma desmarca as outras.
- Dashboard: card "% irían directo a la estación con gasolina", tabela por tipo de motorista
  (usarían / pagarían / irían directo); gráficos para todas as perguntas.
- Contador de **"No quiso participar"**: um botão na tela inicial para registrar recusas.
  Isso deixa você dizer "abordei 400, 300 responderam", o que dá credibilidade ao dado.
- Como o app ainda não está em produção, os IDs das perguntas mudam sem migração.

## Sugestão de abordagem (não é parte do app)

"Buenas, estoy haciendo un estudio de mercado sobre el pago en las bombas, son 11 preguntas de
un minuto, ¿me ayuda?" Fazer de dentro do carro dele, enquanto a fila anda. Começar pelo
bloco B (a dor) para o motorista se engajar antes de ouvir a solução.
