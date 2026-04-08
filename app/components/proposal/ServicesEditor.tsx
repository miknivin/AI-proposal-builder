import { useState } from "react";

import type {
  QuestionnaireAnswer,
  QuestionnaireItem,
} from "@/app/types/proposal";
import type { ServiceColumn } from "@/app/components/proposal/types";
import { AddColumnModalBody } from "@/app/components/proposal/AddColumnModalBody";
import { Modal } from "@/app/components/ui/Modal";

type Props = {
  question: QuestionnaireItem;
  answer?: QuestionnaireAnswer;
  columns: ServiceColumn[];
  onAddColumn: (label: string) => void;
  onAddRow: () => void;
  onChangeCell: (row: number, columnId: string, value: string) => void;
};

export function ServicesEditor({
  question,
  answer,
  columns,
  onAddColumn,
  onAddRow,
  onChangeCell,
}: Props) {
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [newColumnLabel, setNewColumnLabel] = useState("");

  const closeColumnModal = () => {
    setShowColumnModal(false);
    setNewColumnLabel("");
  };

  const handleAddColumn = () => {
    const label = newColumnLabel.trim();
    if (!label) return;
    onAddColumn(label);
    closeColumnModal();
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="button-secondary px-4 py-2 text-sm"
          onClick={onAddRow}
        >
          Add service row
        </button>
        <button
          type="button"
          className="button-secondary px-4 py-2 text-sm"
          onClick={() => setShowColumnModal(true)}
        >
          Add custom column
        </button>
      </div>

      <div className="overflow-auto rounded-2xl border border-line bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.id} className="px-3 py-2 text-left font-semibold">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(answer?.servicesItems ?? []).map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-line">
                {columns.map((col) => (
                  <td key={col.id} className="px-3 py-2">
                    <input
                      className="field"
                      type={col.type === "number" ? "number" : "text"}
                      value={row[col.id] !== undefined ? String(row[col.id]) : ""}
                      onChange={(event) =>
                        onChangeCell(rowIndex, col.id, event.target.value)
                      }
                      placeholder={col.label}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showColumnModal}
        onClose={closeColumnModal}
        title="Add column"
        size="sm"
      >
        <AddColumnModalBody
          value={newColumnLabel}
          onChange={setNewColumnLabel}
          onCancel={closeColumnModal}
          onSubmit={handleAddColumn}
        />
      </Modal>
    </div>
  );
}
