export type ServiceColumn = {
  id: string;
  label: string;
  type: "text" | "number";
  required?: boolean;
};

export const defaultServiceColumns: ServiceColumn[] = [
  { id: "title", label: "Title", type: "text" },
  { id: "description", label: "Description", type: "text" },
  { id: "quantity", label: "Qty", type: "number" },
  { id: "unitPrice", label: "Unit Price", type: "number" },
];
