export type SumRewards = {
	inverval: number
	reward: number
	numreward: number
	name: string
	offset: number
}

export type MinerAPI = {
	currentHashrate: number
	hashrate: number
	payments: {
		amount: number
		timestamp: number
		tx: string
	}[]
	rewards: [
		{
			timestamp: number
			reward: number
		}
	]
	shares: [string]
	stats: {
		balance: number
		blocksFound: number
		immature: number
		lastShare: number
		paid: number
		pending: boolean
	}
	sumrewards: [SumRewards, SumRewards, SumRewards, SumRewards, SumRewards]
	"24hreward": number
	"24hnumreward": number
}

export type PriceAPI = {
	ethereum: {
		eur: number
	}
}
