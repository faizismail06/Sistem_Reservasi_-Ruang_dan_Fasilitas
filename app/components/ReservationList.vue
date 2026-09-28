<script setup lang="ts">
import type { Reservation, ReservationPage, Room } from '#shared/types'
import { dateLabel, timeLabel, statusLabels } from '#shared/rules'
const props = defineProps<{ admin?: boolean }>()
const route = useRoute(),
  router = useRouter()
const { account } = useAccount()
const { message, success } = useFeedback()
const search = ref(String(route.query.search || ''))
const statusFilter = ref(String(route.query.status || (props.admin ? 'PENDING' : 'ALL')))
const roomId = ref(String(route.query.roomId || 'ALL')),
  day = ref(String(route.query.date || ''))
const sort = ref(String(route.query.sort || (props.admin ? 'oldest' : 'newest')))
const page = ref(Math.max(1, Number(route.query.page) || 1)),
  filtersOpen = ref(false)
const query = computed(() => ({
  search: search.value,
  status: statusFilter.value === 'ALL' ? '' : statusFilter.value,
  roomId: roomId.value === 'ALL' ? '' : roomId.value,
  date: day.value,
  sort: sort.value,
  page: page.value
}))
watch([search, statusFilter, roomId, day, sort], () => {
  page.value = 1
})
watch(query, (value) => {
  router.replace({
    query: Object.fromEntries(
      Object.entries({ ...value, status: statusFilter.value })
        .filter(([, v]) => v !== '')
        .map(([k, v]) => [k, String(v)])
    )
  })
})
const { data, status, error, refresh } = await useFetch<ReservationPage>(
  props.admin ? '/api/admin/reservations' : '/api/reservations/mine',
  { query }
)
const { data: rooms } = await useFetch<Room[]>(props.admin ? '/api/admin/rooms' : '/api/rooms')
const columns = [
  { accessorKey: 'id', header: 'No. pengajuan' },
  ...(props.admin ? [{ accessorKey: 'user', header: 'Pemohon' }] : []),
  { accessorKey: 'room', header: 'Ruang' },
  { accessorKey: 'startAt', header: 'Tanggal & jam' },
  { accessorKey: 'attendees', header: 'Peserta' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'actions', header: '' }
]
const statuses = [
  { label: 'Semua status', value: 'ALL' },
  ...Object.entries(statusLabels)
    .filter(([key]) => key !== 'BLOCKED')
    .map(([value, label]) => ({ value, label }))
]
const selected = ref<Reservation | null>(null),
  detailOpen = ref(false),
  detailBusy = ref(false),
  actionBusy = ref(false),
  actionError = ref(''),
  detailError = ref(''),
  reason = ref(''),
  selectedId = ref('')
async function show(id: string) {
  selectedId.value = id
  detailOpen.value = true
  selected.value = null
  detailBusy.value = true
  detailError.value = ''
  actionError.value = ''
  reason.value = ''
  try {
    selected.value = await $fetch<Reservation>(`/api/reservations/${id}`)
  } catch (e) {
    detailError.value = message(e)
  } finally {
    detailBusy.value = false
  }
}
async function action(kind: 'approve' | 'reject' | 'cancel') {
  if (!selected.value) return
  if (
    (kind === 'reject' || (kind === 'cancel' && account.value?.role === 'ADMIN')) &&
    reason.value.trim().length < 5
  ) {
    actionError.value = 'Isi alasan minimal 5 karakter.'
    return
  }
  actionBusy.value = true
  actionError.value = ''
  try {
    const url =
      kind === 'cancel'
        ? `/api/reservations/${selected.value.id}/cancel`
        : `/api/admin/reservations/${selected.value.id}/${kind}`
    await $fetch(url, { method: 'POST', body: { reason: reason.value } })
    success(
      kind === 'approve'
        ? 'Pengajuan disetujui'
        : kind === 'reject'
          ? 'Pengajuan ditolak'
          : 'Reservasi dibatalkan'
    )
    await refreshNuxtData()
    await show(selected.value.id)
  } catch (e) {
    actionError.value = message(e)
    await refresh()
  } finally {
    actionBusy.value = false
  }
}
const canCancel = computed(
  () =>
    selected.value &&
    ['PENDING', 'APPROVED'].includes(selected.value.status) &&
    new Date(selected.value.startAt) > new Date()
)
</script>
<template>
  <PageHeading
    :title="admin ? 'Pengajuan Reservasi' : 'Reservasi Saya'"
    :eyebrow="admin ? 'ADMINISTRASI' : 'AGENDA PRIBADI'"
    :description="
      admin
        ? 'Tinjau jadwal dan proses pengajuan penggunaan ruang kantor.'
        : 'Pantau status pengajuan dan jadwal penggunaan ruang Anda.'
    "
    ><UButton to="/reservasi/baru" icon="i-lucide-plus">Ajukan Reservasi</UButton></PageHeading
  >
  <div class="panel">
    <div class="panel-title">
      <div class="flex items-center gap-3">
        <UIcon :name="admin ? 'i-lucide-inbox' : 'i-lucide-list'" />
        <h2>{{ admin ? 'Daftar pengajuan' : 'Daftar reservasi' }}</h2>
        <span class="count-pill">{{ data?.total || 0 }}</span>
      </div>
      <UButton
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="ghost"
        aria-label="Muat ulang daftar"
        @click="refresh()"
      />
    </div>
    <div class="toolbar table-toolbar">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Cari pengajuan, ruang, atau pemohon"
        aria-label="Cari pengajuan"
        class="search-input"
      /><UButton
        class="mobile-filter"
        icon="i-lucide-sliders-horizontal"
        variant="outline"
        color="neutral"
        @click="filtersOpen = !filtersOpen"
        >Filter</UButton
      >
      <div class="filters" :class="{ expanded: filtersOpen }">
        <USelect v-model="statusFilter" :items="statuses" aria-label="Filter status" /><USelect
          v-model="roomId"
          :items="[
            { label: 'Semua ruang', value: 'ALL' },
            ...(rooms || []).map((r) => ({ label: r.name, value: r.id }))
          ]"
          aria-label="Filter ruang"
        /><UInput v-model="day" type="date" aria-label="Filter tanggal" /><USelect
          v-model="sort"
          :items="[
            { label: 'Terbaru', value: 'newest' },
            { label: 'Terlama', value: 'oldest' },
            { label: 'Jadwal terdekat', value: 'schedule' }
          ]"
          aria-label="Urutkan pengajuan"
        /><UButton
          v-if="day"
          variant="ghost"
          color="neutral"
          icon="i-lucide-x"
          aria-label="Hapus filter tanggal"
          @click="day = ''"
        />
      </div>
    </div>
    <LoadState
      :pending="status === 'pending'"
      :error="error"
      :empty="!data?.items.length"
      empty-text="Tidak ada pengajuan pada filter ini"
      @retry="refresh"
    >
      <UTable
        :data="data?.items"
        :columns="columns"
        class="reservation-table"
        :ui="{ td: 'py-3', th: 'bg-slate-50 text-xs' }"
      >
        <template #id-cell="{ row }"
          ><button class="reference-link" @click="show(row.original.id)">
            RSV-{{ row.original.id.slice(-6).toUpperCase() }}
          </button></template
        >
        <template #user-cell="{ row }"
          ><span class="font-medium">{{ row.original.user.name }}</span></template
        >
        <template #room-cell="{ row }"
          ><span class="font-medium">{{ row.original.room.name }}</span
          ><small class="cell-secondary">{{ row.original.room.location }}</small></template
        >
        <template #startAt-cell="{ row }"
          ><span>{{ dateLabel(row.original.startAt) }}</span
          ><small class="cell-secondary"
            >{{ timeLabel(row.original.startAt) }}–{{ timeLabel(row.original.endAt) }} WIB</small
          ></template
        >
        <template #attendees-cell="{ row }">{{ row.original.attendees }} orang</template>
        <template #status-cell="{ row }"><StatusBadge :status="row.original.status" /></template>
        <template #actions-cell="{ row }"
          ><UButton
            variant="ghost"
            color="neutral"
            icon="i-lucide-chevron-right"
            :aria-label="`Detail pengajuan ${row.original.user.name}`"
            @click="show(row.original.id)"
        /></template>
      </UTable>
      <div class="mobile-reservations">
        <button v-for="item in data?.items" :key="item.id" class="mobile-reservation" @click="show(item.id)">
          <div class="flex justify-between gap-2">
            <strong>{{ item.room.name }}</strong
            ><StatusBadge :status="item.status" />
          </div>
          <span
            >{{ dateLabel(item.startAt) }} · {{ timeLabel(item.startAt) }}–{{
              timeLabel(item.endAt)
            }}
            WIB</span
          ><small>{{ admin ? item.user.name : item.purpose }} · {{ item.attendees }} orang</small>
        </button>
      </div>
    </LoadState>
    <div class="pagination">
      <span class="text-muted text-xs"
        >{{ data?.total ? (page - 1) * 20 + 1 : 0 }}–{{ Math.min(page * 20, data?.total || 0) }} dari
        {{ data?.total || 0 }} pengajuan</span
      ><UPagination
        v-model:page="page"
        :total="data?.total || 0"
        :items-per-page="20"
        :sibling-count="0"
        size="sm"
      />
    </div>
  </div>
  <p class="footnote">
    <UIcon name="i-lucide-info" /> Pengajuan menunggu belum mengunci jadwal. Ketersediaan diperiksa kembali
    saat persetujuan.
  </p>
  <USlideover
    v-model:open="detailOpen"
    title="Detail pengajuan"
    description="Informasi reservasi dan riwayat keputusan"
    :ui="{ content: 'max-w-xl' }"
    ><template #body>
      <LoadState :pending="detailBusy" :error="detailError" @retry="show(selectedId)"
        ><div v-if="selected" class="detail-body">
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted">RSV-{{ selected.id.slice(-6).toUpperCase() }}</span
            ><StatusBadge :status="selected.status" />
          </div>
          <h2 class="detail-title">{{ selected.room.name }}</h2>
          <p class="text-muted">{{ selected.room.location }}</p>
          <dl class="detail-grid">
            <dt>Pemohon</dt>
            <dd>{{ selected.user.name }}</dd>
            <dt>Tanggal</dt>
            <dd>{{ dateLabel(selected.startAt) }}</dd>
            <dt>Waktu</dt>
            <dd>{{ timeLabel(selected.startAt) }}–{{ timeLabel(selected.endAt) }} WIB</dd>
            <dt>Peserta</dt>
            <dd>{{ selected.attendees }} orang</dd>
            <dt>Tujuan</dt>
            <dd>{{ selected.purpose }}</dd>
          </dl>
          <div v-if="selected.conflict && selected.status === 'PENDING'" class="notice">
            <UIcon name="i-lucide-triangle-alert" /> Jadwal ini bertabrakan dengan reservasi disetujui atau
            pemeliharaan.
          </div>
          <div v-if="selected.decisionReason" class="notice">
            <strong>Alasan keputusan</strong>
            <p>{{ selected.decisionReason }}</p>
          </div>
          <UButton :to="`/ruang/${selected.roomId}`" variant="outline" icon="i-lucide-calendar-days"
            >Lihat Jadwal Terbaru</UButton
          >
          <section class="detail-section">
            <h3>Riwayat pengajuan</h3>
            <ol class="event-list">
              <li v-for="item in selected.events" :key="item.id">
                <span class="event-dot" /><strong>{{
                  item.action === 'CREATED' ? 'Diajukan' : statusLabels[item.action]
                }}</strong>
                <p>
                  {{ item.actor.name }} · {{ dateLabel(item.createdAt) }}, {{ timeLabel(item.createdAt) }} WIB
                </p>
                <p v-if="item.note">{{ item.note }}</p>
              </li>
            </ol>
          </section>
          <section v-if="canCancel || (admin && selected.status === 'PENDING')" class="detail-section">
            <h3>Tindakan</h3>
            <UFormField
              v-if="account?.role === 'ADMIN'"
              label="Alasan penolakan / pembatalan"
              help="Wajib diisi minimal 5 karakter untuk menolak atau membatalkan."
              ><UTextarea v-model="reason" class="w-full" :maxlength="1000"
            /></UFormField>
            <p v-if="actionError" role="alert" class="form-error my-3">{{ actionError }}</p>
            <div class="flex flex-wrap gap-2 mt-4">
              <UButton
                v-if="admin && selected.status === 'PENDING'"
                icon="i-lucide-check"
                :loading="actionBusy"
                @click="action('approve')"
                >Setujui</UButton
              ><UButton
                v-if="admin && selected.status === 'PENDING'"
                color="neutral"
                variant="outline"
                :disabled="actionBusy"
                @click="action('reject')"
                >Tolak</UButton
              ><UButton
                v-if="canCancel"
                color="neutral"
                variant="outline"
                :disabled="actionBusy"
                @click="action('cancel')"
                >Batalkan Reservasi</UButton
              >
            </div>
          </section>
        </div></LoadState
      >
    </template></USlideover
  >
</template>
