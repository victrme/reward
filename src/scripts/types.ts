export type Response = {
	from: string
	page: string
	balance: number
	average: number
	hashrate: number
	price: number
	payments: {
		amount: number
		timestamp: number
		tx: string
	}[]
}

export type Storage = {
	address: string
	pool: string
}
