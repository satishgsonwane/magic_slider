import { toast as sonnerToast } from "sonner";

// Update the type to match what sonnerToast actually supports
type ToastType = "success" | "error" | "warning" | "info";

interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const toast = {
  show: (options: ToastOptions) => {
    const { title, description, duration = 5000, action } = options;
    
    // Use the default toast function directly
    sonnerToast(title, {
      description,
      duration,
      action: action ? {
        label: action.label,
        onClick: action.onClick,
      } : undefined,
    });
  },
  
  success: (options: ToastOptions) => {
    const { title, description, duration = 5000, action } = options;
    sonnerToast.success(title, {
      description, duration, action: action ? { label: action.label, onClick: action.onClick } : undefined,
    });
  },
  
  error: (options: ToastOptions) => {
    const { title, description, duration = 5000, action } = options;
    sonnerToast.error(title, {
      description, duration, action: action ? { label: action.label, onClick: action.onClick } : undefined,
    });
  },
  
  warning: (options: ToastOptions) => {
    const { title, description, duration = 5000, action } = options;
    sonnerToast.warning(title, {
      description, duration, action: action ? { label: action.label, onClick: action.onClick } : undefined,
    });
  },
  
  info: (options: ToastOptions) => {
    const { title, description, duration = 5000, action } = options;
    sonnerToast.info(title, {
      description, duration, action: action ? { label: action.label, onClick: action.onClick } : undefined,
    });
  },
  
  // For compatibility with existing code
  dismiss: (toastId?: string) => {
    sonnerToast.dismiss(toastId);
  },
}; 