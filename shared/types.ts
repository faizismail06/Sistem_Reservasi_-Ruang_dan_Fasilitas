export interface Account {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'EMPLOYEE'
}
export interface Room {
  id: string
  name: string
  location: string
  capacity: number
  description: string
  amenities: string[]
  isActive: boolean
}
export interface Interval {
  startAt: string
  endAt: string
  status: string
}
export interface Reservation extends Interval {
  id: string
  roomId: string
  userId: string
  purpose: string
  attendees: number
  decisionReason?: string | null
  room: Room
  user: { id: string; name: string }
  createdAt: string
  conflict?: boolean
  events?: { id: string; action: string; note?: string | null; createdAt: string; actor: { name: string } }[]
}
export interface ReservationPage {
  items: Reservation[]
  total: number
  page: number
  pageSize: number
}
