async function fetcher(url: string) {
	const response = await fetch(url)
	const json = await response.json()
	return json
}

async function getEuroPrice() {
	const x = await fetcher(
		`https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=eur`
	)
	return x.ethereum.eur
}

async function twoMinersData() {
	const address = process.env.address
	const home = 'https://eth.2miners.com/'
	const json = await fetcher(home + 'api/accounts/0x' + address)

	const sat = (a: number) => a * 10 ** -9

	function calcAverage() {
		let unix = Date.now(),
			yesterday = 0,
			daybefore = 0,
			jour = json.sumrewards[2].reward

		//calc le nbr de jours avant reward
		const ratio = (by: number) => (0.05 - sat(json.stats.balance)) / sat(by)

		//increment les rewards comprise entre les intervalles
		const incrRewards = (
			interval: number[],
			re: { timestamp: number; reward: number }
		) =>
			re.timestamp < unix - interval[0] &&
			re.timestamp > unix - interval[1]
				? re.reward
				: 0

		for (let re of json.rewards) {
			yesterday += incrRewards([86400, 172800], re)
			daybefore += incrRewards([172800, 259200], re)
		}

		const calcMoyenne = (array: number[]) => {
			let average: number[] = []

			array.forEach((temps) => {
				if (temps > 0) {
					average.push(ratio(temps))
				}
			})

			if (average.length > 0) {
				return average.reduce((a, b) => a + b) / average.length
			} else {
				return 0
			}
		}

		return calcMoyenne([daybefore, yesterday, jour])
	}

	return {
		from: '2miners',
		page: home + 'account/0x' + address,
		balance: sat(json.stats.balance),
		average: calcAverage(),
		hashrate: json.hashrate,
		payments: json.payments,
		price: await getEuroPrice(),
	}
}

async function hiveonPoolData() {
	const address = process.env.address
	const url = 'https://hiveon.net/api/v0/miner/' + address
	const bill = await fetcher(url + '/bill?currency=ETH')
	const miner = await fetcher(url + '?currency=ETH')

	const average = (0.1 - bill.stats.balance) / bill.stats.pay1day

	return {
		from: 'hiveon',
		page: 'https://hiveon.net/eth?miner=' + address,
		balance: bill.stats.balance,
		average: average,
		hashrate: miner.data.hashrate,
		payments: bill.payments,
		price: await getEuroPrice(),
	}
}

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

export const choosePool = (pool: string): Promise<Response> =>
	pool === 'hiveon' ? hiveonPoolData() : twoMinersData()
