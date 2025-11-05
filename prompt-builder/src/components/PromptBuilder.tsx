'use client';

import { useCallback, useMemo, useReducer, useState } from 'react';

type PromptField =
  | 'objective'
  | 'audience'
  | 'tone'
  | 'format'
  | 'constraints'
  | 'inputs'
  | 'context'
  | 'evaluation'
  | 'persona';

type Question = {
  id: string;
  title: string;
  description: string;
  field: PromptField;
  type: 'text' | 'textarea' | 'tags' | 'select';
  placeholder?: string;
  options?: string[];
  required?: boolean;
};

type BuilderState = Record<PromptField, string[] | string>;

type Action =
  | { type: 'updateField'; field: PromptField; value: string }
  | { type: 'updateTags'; field: PromptField; tags: string[] }
  | { type: 'reset'; payload: BuilderState };

const initialState: BuilderState = {
  objective: '',
  audience: '',
  tone: '',
  format: '',
  constraints: [],
  inputs: [],
  context: '',
  evaluation: '',
  persona: '',
};

const baseQuestions: Question[] = [
  {
    id: 'objective',
    title: 'Objetivo central',
    description:
      'Qual problema ou tarefa o prompt precisa resolver? Quanto mais específico, melhor.',
    field: 'objective',
    type: 'textarea',
    placeholder: 'Ex.: Criar um roteiro detalhado para um vídeo educativo sobre IA generativa.',
    required: true,
  },
  {
    id: 'audience',
    title: 'Público-alvo e nível',
    description:
      'Quem irá consumir o resultado? Inclua nível de conhecimento, idioma preferido e contexto cultural.',
    field: 'audience',
    type: 'textarea',
    placeholder: 'Ex.: Profissionais de marketing com experiência intermediária, falantes de português brasileiro.',
    required: true,
  },
  {
    id: 'persona',
    title: 'Persona do assistente',
    description:
      'Defina o papel, expertise e traços do assistente que irá gerar a resposta.',
    field: 'persona',
    type: 'textarea',
    placeholder: 'Ex.: Especialista em storytelling com foco em marketing digital e linguagem acessível.',
  },
  {
    id: 'tone',
    title: 'Tom e estilo desejados',
    description:
      'Determine o estilo de comunicação, referências e formatos de escrita preferidos.',
    field: 'tone',
    type: 'textarea',
    placeholder: 'Ex.: Inspirador, direto, com exemplos práticos e analogias relevantes.',
  },
  {
    id: 'format',
    title: 'Formato de saída',
    description:
      'Especifique estrutura, seções obrigatórias, tamanho e formatos de entrega esperados.',
    field: 'format',
    type: 'textarea',
    placeholder: 'Ex.: Sumário executivo com seções: Contexto, Estratégia, Táticas, Métricas. Máx. 800 palavras.',
  },
  {
    id: 'inputs',
    title: 'Informações de entrada',
    description:
      'Liste dados obrigatórios, anexos, frameworks ou fontes que a IA deve considerar.',
    field: 'inputs',
    type: 'tags',
  },
  {
    id: 'constraints',
    title: 'Restrições e regras',
    description:
      'Defina regras inegociáveis, padrões, formato de citação, limites ou conteúdos proibidos.',
    field: 'constraints',
    type: 'tags',
  },
  {
    id: 'context',
    title: 'Contexto adicional',
    description:
      'Forneça antecedentes, metas de longo prazo ou referências úteis para a geração.',
    field: 'context',
    type: 'textarea',
    placeholder: 'Ex.: Última campanha performou abaixo do esperado devido à baixa personalização.',
  },
  {
    id: 'evaluation',
    title: 'Critérios de avaliação',
    description:
      'Defina como medir se a resposta é satisfatória: métricas, checklist ou perguntas de validação.',
    field: 'evaluation',
    type: 'textarea',
    placeholder: 'Ex.: Deve incluir plano de ação, exemplos concretos e KPIs mensuráveis.',
  },
];

function builderReducer(state: BuilderState, action: Action): BuilderState {
  switch (action.type) {
    case 'updateField':
      return { ...state, [action.field]: action.value };
    case 'updateTags':
      return { ...state, [action.field]: action.tags };
    case 'reset':
      return action.payload;
    default:
      return state;
  }
}

function tagsToDisplay(value: string | string[]): string[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">{title}</h2>
      {subtitle ? (
        <p className="text-sm leading-relaxed text-zinc-500">{subtitle}</p>
      ) : null}
    </div>
  );
}

function useDynamicInsights(state: BuilderState) {
  return useMemo(() => {
    const pending = baseQuestions
      .filter((question) => question.required)
      .filter((question) => {
        const value = state[question.field];
        if (Array.isArray(value)) {
          return value.length === 0;
        }
        return (value ?? '').trim().length === 0;
      })
      .map((question) => question.title);

    const insights: string[] = [];

    if (state.objective && state.format === '') {
      insights.push('Detalhe o formato de saída para alinhar expectativas e facilitar validação.');
    }
    if (Array.isArray(state.constraints) && state.constraints.length === 0) {
      insights.push('Adicione restrições ou critérios de segurança para evitar respostas incorretas.');
    }
    if (state.evaluation === '') {
      insights.push('Defina critérios de avaliação para facilitar ajustes e iterações futuras.');
    }

    return { pending, insights };
  }, [state]);
}

function buildPrompt(state: BuilderState) {
  const blocks: string[] = [];

  if (state.persona) {
    blocks.push(`Você é ${state.persona}.`);
  }

  if (state.objective) {
    blocks.push(`Tarefa principal:\n${state.objective}`);
  }

  if (state.audience) {
    blocks.push(`Público-alvo:\n${state.audience}`);
  }

  if (state.context) {
    blocks.push(`Contexto:\n${state.context}`);
  }

  if (state.inputs && Array.isArray(state.inputs) && state.inputs.length > 0) {
    blocks.push(`Considere obrigatoriamente:\n${state.inputs.map((item) => `- ${item}`).join('\n')}`);
  }

  if (state.tone) {
    blocks.push(`Tom e estilo desejados:\n${state.tone}`);
  }

  if (state.format) {
    blocks.push(`Formato de saída:\n${state.format}`);
  }

  if (state.constraints && Array.isArray(state.constraints) && state.constraints.length > 0) {
    blocks.push(`Restrições:\n${state.constraints.map((item) => `- ${item}`).join('\n')}`);
  }

  if (state.evaluation) {
    blocks.push(`Avaliação de qualidade:\n${state.evaluation}`);
  }

  blocks.push(
    'Antes de responder, valide se todas as informações são suficientes. Caso falte algo, faça perguntas específicas para complementar o briefing.'
  );

  return blocks.join('\n\n');
}

export function PromptBuilder() {
  const [state, dispatch] = useReducer(builderReducer, initialState);
  const [reviewMode, setReviewMode] = useState(false);
  const [copied, setCopied] = useState(false);

  const { pending, insights } = useDynamicInsights(state);

  const promptPreview = useMemo(() => buildPrompt(state), [state]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(promptPreview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar prompt', error);
    }
  }, [promptPreview]);

  const handleReset = useCallback(() => {
    dispatch({ type: 'reset', payload: initialState });
    setReviewMode(false);
  }, []);

  const updateTagList = useCallback(
    (field: PromptField, payload: string) => {
      const values = payload
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      dispatch({ type: 'updateTags', field, tags: values });
    },
    []
  );

  const answerCompletion = useMemo(() => {
    const answered = baseQuestions.filter((question) => {
      const value = state[question.field];
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return (value ?? '').trim().length > 0;
    }).length;
    return Math.round((answered / baseQuestions.length) * 100);
  }, [state]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
          Assistente de Briefing Inteligente
        </p>
        <h1 className="text-3xl font-semibold text-zinc-900 sm:text-4xl">
          Construa prompts poderosos com perguntas guiadas
        </h1>
        <p className="max-w-3xl text-base leading-relaxed text-zinc-600 sm:text-lg">
          Responda às perguntas críticas, receba insights em tempo real e gere um prompt completo que incentiva a IA a confirmar lacunas
          antes de executar a tarefa.
        </p>
      </header>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="space-y-8">
          <SectionHeader
            title="Briefing guiado"
            subtitle="Preencha os campos abaixo; o assistente destacará pontos pendentes automaticamente."
          />

          <div className="space-y-6">
            {baseQuestions.map((question) => {
              const value = state[question.field];
              const isRequiredMissing =
                question.required &&
                ((Array.isArray(value) && value.length === 0) ||
                  (!Array.isArray(value) && (value ?? '').trim() === ''));
              return (
                <div
                  key={question.id}
                  className={`rounded-2xl border bg-white/70 p-6 shadow-sm transition hover:border-emerald-200 hover:shadow-lg ${
                    isRequiredMissing ? 'border-rose-200' : 'border-zinc-200'
                  }`}
                >
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-zinc-900">{question.title}</h3>
                    <p className="text-sm text-zinc-500">{question.description}</p>
                  </div>

                  {question.type === 'textarea' ? (
                    <textarea
                      className="mt-4 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      rows={4}
                      placeholder={question.placeholder}
                      value={typeof value === 'string' ? value : ''}
                      onChange={(event) =>
                        dispatch({
                          type: 'updateField',
                          field: question.field,
                          value: event.target.value,
                        })
                      }
                    />
                  ) : null}

                  {question.type === 'text' ? (
                    <input
                      className="mt-4 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      placeholder={question.placeholder}
                      value={typeof value === 'string' ? value : ''}
                      onChange={(event) =>
                        dispatch({
                          type: 'updateField',
                          field: question.field,
                          value: event.target.value,
                        })
                      }
                    />
                  ) : null}

                  {question.type === 'tags' ? (
                    <div className="mt-4 space-y-3">
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        placeholder="Separe itens com vírgulas"
                        value={
                          Array.isArray(value)
                            ? value.join(', ')
                            : typeof value === 'string'
                              ? value
                              : ''
                        }
                        onChange={(event) => updateTagList(question.field, event.target.value)}
                      />
                      <div className="flex flex-wrap gap-2">
                        {tagsToDisplay(value).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="space-y-8">
          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/60 p-6 shadow-lg">
            <SectionHeader
              title="Status do briefing"
              subtitle="Acompanhe o progresso e recomendações antes de gerar o prompt."
            />

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                  Completo
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-emerald-100">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${answerCompletion}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">
                    {answerCompletion}%
                  </span>
                </div>
              </div>

              {pending.length > 0 ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-rose-500">
                    Perguntas pendentes
                  </p>
                  <ul className="mt-2 space-y-1">
                    {pending.map((item) => (
                      <li key={item} className="text-sm text-rose-600">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-emerald-700">
                  Todas as perguntas essenciais foram respondidas. Revise as recomendações antes de gerar o prompt.
                </p>
              )}

              {insights.length > 0 ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                    Recomendações
                  </p>
                  <ul className="mt-2 space-y-1">
                    {insights.map((insight) => (
                      <li key={insight} className="text-sm text-zinc-600">
                        • {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div>
                <button
                  className="w-full rounded-xl border border-emerald-500 bg-white px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50"
                  onClick={() => setReviewMode((value) => !value)}
                >
                  {reviewMode ? 'Voltar ao formulário' : 'Entrar em modo de revisão'}
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                  onClick={handleCopy}
                  disabled={promptPreview.trim() === ''}
                >
                  {copied ? 'Prompt copiado!' : 'Copiar prompt'}
                </button>
                <button
                  className="flex-1 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300 hover:bg-white"
                  onClick={handleReset}
                >
                  Reiniciar
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg">
            <SectionHeader
              title="Prompt gerado"
              subtitle="Este é o prompt completo que a IA receberá. Ele inclui instruções para validar lacunas antes da execução."
            />
            <pre className="mt-4 max-h-[480px] overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-950/95 p-4 text-xs leading-6 text-zinc-100">
              {promptPreview || 'As respostas serão combinadas aqui.'}
            </pre>
          </div>

          {reviewMode ? (
            <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-lg">
              <SectionHeader
                title="Checklist de revisão"
                subtitle="Confirme se o prompt cobre todos os pontos críticos antes de enviar."
              />
              <ul className="mt-4 space-y-3 text-sm text-zinc-600">
                <li>• O objetivo principal está específico e inclui contexto suficiente?</li>
                <li>• O público e o tom estão alinhados com a estratégia de comunicação?</li>
                <li>• Há dados, anexos ou inputs obrigatórios claramente listados?</li>
                <li>• Existem restrições e critérios de segurança para evitar respostas inadequadas?</li>
                <li>• Os critérios de avaliação deixam claro o que diferencia uma resposta excelente?</li>
              </ul>
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
