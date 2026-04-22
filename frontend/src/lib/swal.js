export const showSuccess = async (message = 'Operation successful!') => {
  const SweetAlert2 = window.Sweetalert2;
  await SweetAlert2.fire({
    icon: 'success',
    title: 'Success',
    text: message,
    timer: 2000,
    showConfirmButton: false,
    background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
    color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#1e293b',
  });
};

export const showError = async (message = 'An error occurred!') => {
  const SweetAlert2 = window.Sweetalert2;
  await SweetAlert2.fire({
    icon: 'error',
    title: 'Error',
    text: message,
    confirmButtonText: 'OK',
    background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
    color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#1e293b',
  });
};

export const showDeleteConfirm = async (itemName = 'this item') => {
  const SweetAlert2 = window.Sweetalert2;
  const result = await SweetAlert2.fire({
    icon: 'warning',
    title: 'Confirm Delete',
    text: `Are you sure you want to delete ${itemName}?`,
    showCancelButton: true,
    confirmButtonText: 'Yes, Delete',
    cancelButtonText: 'Cancel',
    reverseButtons: true,
    background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
    color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#1e293b',
  });
  return result.isConfirmed;
};

export const showSuccessSimple = (message = 'Success!') => {
  const SweetAlert2 = window.Sweetalert2;
  SweetAlert2.fire({
    icon: 'success',
    title: 'Success',
    text: message,
    timer: 2000,
    showConfirmButton: false,
    background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
    color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#1e293b',
  });
};

export const showErrorSimple = (message = 'Error!') => {
  const SweetAlert2 = window.Sweetalert2;
  SweetAlert2.fire({
    icon: 'error',
    title: 'Error',
    text: message,
    confirmButtonText: 'OK',
    background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
    color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#1e293b',
  });
};
