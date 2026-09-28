export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/') return
  const { account, load } = useAccount()
  if (!account.value) await load()
  if (!account.value && to.path !== '/login') return navigateTo('/login')
  if (account.value && to.path === '/login')
    return navigateTo(account.value.role === 'ADMIN' ? '/admin/pengajuan' : '/ruang')
  if (to.path.startsWith('/admin') && account.value?.role !== 'ADMIN') return navigateTo('/ruang')
})
