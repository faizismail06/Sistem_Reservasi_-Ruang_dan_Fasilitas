import type { Account } from '#shared/types'
export function useAccount() {
  const account = useState<Account | null>('account', () => null)
  const request = useRequestFetch()
  async function load() {
    try {
      account.value = await request<Account>('/api/auth/me')
    } catch {
      account.value = null
    }
    return account.value
  }
  async function logout() {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode !== 401) {
        useToast().add({ title: 'Belum dapat keluar. Periksa koneksi dan coba lagi.', color: 'neutral' })
        return
      }
    }
    account.value = null
    await navigateTo('/login')
  }
  return { account, load, logout }
}
