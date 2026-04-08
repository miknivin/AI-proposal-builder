"use client";

import type { ReactNode } from "react";
import { CloseIcon } from "@/app/components/icons/CloseIcon";

type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "6xl";
type ModalPlacement = "center" | "top";

const sizeClassName: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
};

const placementClassName: Record<ModalPlacement, string> = {
  center: "items-center justify-center p-4 md:p-8",
  top: "items-start justify-center px-4 py-10",
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  size?: ModalSize;
  placement?: ModalPlacement;
  contentClassName?: string;
  bodyClassName?: string;
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  actions,
  size = "xl",
  placement = "center",
  contentClassName = "",
  bodyClassName = "",
}: Props) {
  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex bg-black/45 ${placementClassName[placement]}`}
    >
      <div
        className={`relative w-full rounded-[28px] border border-line bg-white shadow-2xl ${sizeClassName[size]} ${contentClassName}`.trim()}
      >
        {(title || description || actions) && (
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              {title ? (
                <p className="text-base font-semibold">{title}</p>
              ) : null}
              {description ? (
                <p className="mt-1 text-sm text-muted">{description}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {actions}
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-2 text-sm hover:bg-surface-strong"
                onClick={onClose}
              >
                <CloseIcon />
              </button>
            </div>
          </div>
        )}
        <div className={bodyClassName}>{children}</div>
      </div>
    </div>
  );
}
