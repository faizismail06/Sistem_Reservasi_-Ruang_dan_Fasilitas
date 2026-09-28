export function useFeedback() {
  const toast = useToast()
  const message = (error: unknown) => {
    const e = error as { data?: { statusMessage?: string }; message?: string }
    return e.data?.statusMessage || 'Permintaan gagal. Periksa koneksi dan coba lagi.'
  }
  function success(title: string) {
    toast.add({ title, icon: 'i-lucide-check', color: 'primary' })
  }
  return { message, success }
}
