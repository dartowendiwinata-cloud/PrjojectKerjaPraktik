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

export default function ConfirmDialog({
  open,
  onOpenChange,
  title = "Konfirmasi",
  description = "Apakah Anda yakin?",
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  onConfirm,
  destructive = true,
  testId = "confirm-dialog",
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid={testId} className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-bold text-slate-950">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-slate-500">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            data-testid={`${testId}-cancel`}
            className="rounded-xl"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            data-testid={`${testId}-confirm`}
            onClick={onConfirm}
            className={
              destructive
                ? "rounded-xl bg-red-500 text-white hover:bg-red-600"
                : "rounded-xl bg-blue-600 text-white hover:bg-blue-700"
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
