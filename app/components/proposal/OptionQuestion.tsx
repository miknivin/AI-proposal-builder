import type { QuestionnaireAnswer, QuestionnaireItem } from "@/app/types/proposal";

type Props = {
  question: QuestionnaireItem;
  answer?: QuestionnaireAnswer;
  onChange: (updater: (current: QuestionnaireAnswer) => QuestionnaireAnswer) => void;
};

export function OptionQuestion({ question, answer, onChange }: Props) {
  return (
    <div className="mt-4 space-y-3">
      {question.options?.map((option) => {
        const checked =
          question.type === "radio"
            ? answer?.selectedOptionIds?.[0] === option.id
            : Boolean(answer?.selectedOptionIds?.includes(option.id));

        return (
          <div key={option.id} className="rounded-[20px] border border-line bg-white p-4">
            <label className="flex items-start gap-3">
              <input
                type={question.type === "radio" ? "radio" : "checkbox"}
                name={question.id}
                checked={checked}
                onChange={(event) =>
                  onChange((current) => {
                    const selected = current.selectedOptionIds ?? [];
                    const nextSelected =
                      question.type === "radio"
                        ? event.target.checked
                          ? [option.id]
                          : []
                        : event.target.checked
                          ? [...selected, option.id]
                          : selected.filter((item) => item !== option.id);

                    return {
                      ...current,
                      selectedOptionIds: nextSelected,
                    };
                  })
                }
              />
              <div className="flex-1">
                <p className="font-medium">{option.label}</p>
                {option.description ? (
                  <p className="mt-1 text-sm text-muted">{option.description}</p>
                ) : null}
              </div>
            </label>

            {checked && option.allowsCustomText ? (
              <input
                className="field mt-3"
                value={answer?.customTexts?.[option.id] ?? ""}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    customTexts: {
                      ...(current.customTexts ?? {}),
                      [option.id]: event.target.value,
                    },
                  }))
                }
                placeholder={option.customTextPlaceholder ?? "Add details"}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
