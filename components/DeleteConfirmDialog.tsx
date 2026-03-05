'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  isDestructive?: boolean;
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you absolutely sure?",
  description = "This action cannot be undone. This will permanently delete the selected item and remove its data from our servers.",
  confirmText = "Delete",
  isDestructive = true,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="sm:max-w-[420px] border-border bg-card">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              "p-2 rounded-full",
              isDestructive ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            )}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <AlertDialogTitle className="text-xl font-medium text-foreground dark:text-white">{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground pt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="pt-6 gap-3">
          <AlertDialogCancel className="border-border hover:bg-muted font-medium bg-card text-foreground dark:text-white">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            className={cn(
              "font-medium shadow-sm transition-all",
              isDestructive 
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
