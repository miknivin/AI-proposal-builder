import { useMemo, useState } from "react";

import type { QuestionnaireAnswer, QuestionnaireItem } from "@/app/types/proposal";
import { defaultServiceColumns, type ServiceColumn } from "@/app/components/proposal/types";
import { OptionQuestion } from "@/app/components/proposal/OptionQuestion";
import { ServicesEditor } from "@/app/components/proposal/ServicesEditor";
import { Spinner } from "@/app/components/Spinner";

type Props = {
  questionnaire: QuestionnaireItem[];
  answers: QuestionnaireAnswer[];
  serviceColumns: Record<string, ServiceColumn[]>;
  isPending: boolean;
  onAnswer: (questionId: string, updater: (current: QuestionnaireAnswer) => QuestionnaireAnswer) => void;
  onAddColumn: (questionId: string, label: string) => void;
  onAddRow: (questionId: string, columns: ServiceColumn[]) => void;
  onChangeServiceCell: (questionId: string, row: number, columnId: string, value: string) => void;
  onSubmit: () => void;
};

export function QuestionnaireSection({
  questionnaire,
  answers,
  serviceColumns,
  isPending,
  onAnswer,
  onAddColumn,
  onAddRow,
  onChangeServiceCell,
  onSubmit,
}: Props) {
  const [index, setIndex] = useState(0);
  const current = questionnaire[index];
  const answer = answers.find((item) => item.questionId === current?.id);
  const columns = current ? serviceColumns[current.id] ?? defaultServiceColumns : defaultServiceColumns;

  const progressLabel = useMemo(
    () => `${index + 1} / ${questionnaire.length}`,
    [index, questionnaire.length],
  );

  if (!current) return null;

  return (
    <section className="rounded-2xl border border-line bg-surface-strong p-5">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="eyebrow">Questionnaire</p>
          <p className="text-base font-semibold">{current.label}</p>
          {current.helpText ? (
            <p className="text-sm leading-6 text-muted">{current.helpText}</p>
          ) : null}
        </div>
        <span className="text-sm text-muted">{progressLabel}</span>
      </div>

      <div className="mt-4">
        {current.type === "textarea" ? (
          <textarea
            className="textarea"
            value={answer?.value ?? ""}
            onChange={(event) =>
              onAnswer(current.id, (currentAnswer) => ({
                ...currentAnswer,
                value: event.target.value,
              }))
            }
            placeholder={current.placeholder}
          />
        ) : current.type === "services" ? (
          <ServicesEditor
            question={current}
            answer={answer}
            columns={columns}
            onAddColumn={(label) => onAddColumn(current.id, label)}
            onAddRow={() => onAddRow(current.id, columns)}
            onChangeCell={(row, col, value) => onChangeServiceCell(current.id, row, col, value)}
          />
        ) : current.type === "radio" || current.type === "checkbox" ? (
          <OptionQuestion question={current} answer={answer} onChange={(fn) => onAnswer(current.id, fn)} />
        ) : current.type === "number" ? (
          <input
            type="number"
            className="field"
            value={answer?.value ?? ""}
            onChange={(event) =>
              onAnswer(current.id, (currentAnswer) => ({
                ...currentAnswer,
                value: event.target.value,
              }))
            }
            placeholder={current.placeholder ?? "Enter a number"}
          />
        ) : (
          <textarea
            className="textarea"
            value={answer?.value ?? ""}
            onChange={(event) =>
              onAnswer(current.id, (currentAnswer) => ({
                ...currentAnswer,
                value: event.target.value,
              }))
            }
            placeholder={current.placeholder ?? "Provide your answer"}
          />
        )}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          className="button-secondary"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          Previous
        </button>
        {index < questionnaire.length - 1 ? (
          <button
            type="button"
            className="button-secondary"
            onClick={() => setIndex((i) => Math.min(questionnaire.length - 1, i + 1))}
          >
            Next
          </button>
        ) : (
          <button type="button" className="button-primary flex items-center gap-2" disabled={isPending} onClick={onSubmit}>
            {isPending ? (
              <>
                <Spinner size={16} />
                Submitting...
              </>
            ) : (
              "Submit"
            )}
          </button>
        )}
      </div>
    </section>
  );
}
