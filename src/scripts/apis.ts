import { Response, Storage } from './types'

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

async function twoMinersData(addr: string) {
	const home = 'https://eth.2miners.com/'
	const json = await fetcher(home + 'api/accounts/' + addr)

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
		page: home + 'account/' + addr,
		balance: sat(json.stats.balance),
		average: calcAverage(),
		minPayout: 0.05,
		hashrate: json.hashrate,
		payments: json.payments,
		price: await getEuroPrice(),
	}
}

async function hiveonPoolData(addr: string) {
	const url = 'https://hiveon.net/api/v0/miner/' + addr
	const bill = await fetcher(url + '/bill?currency=ETH')
	const miner = await fetcher(url + '?currency=ETH')

	const average = (0.1 - bill.stats.balance) / bill.stats.pay1day

	return {
		from: 'hiveon',
		page: 'https://hiveon.net/eth?miner=' + addr,
		balance: bill.stats.balance,
		average: average,
		minPayout: 0.1,
		hashrate: miner.data.hashrate,
		payments: bill.payments,
		price: await getEuroPrice(),
	}
}

async function ethermineData(addr: string) {
	const home = 'https://api.ethermine.org/miner/'
	const dashboard = await fetcher(home + addr + '/dashboard')
	const currentStats = await fetcher(home + addr + '/currentStats')

	// Flexible payout on ethermine
	const minpayout = dashboard.data.settings.minPayout
	const balance =
		dashboard.data.currentStatistics.unpaid +
		(dashboard.data.currentStatistics.unconfirmed | 0)

	// Gets coins per day average
	// (Minimum payout - balance) / Coins per minutes
	const average = (minpayout - balance) / currentStats.data.coinsPerMin / 1440

	console.log(balance, dashboard.data)

	return {
		from: 'ethermine',
		page: 'https://ethermine.org/miners/' + addr,
		balance: balance / 10 ** 18,
		average: average / 10 ** 18,
		minPayout: minpayout / 10 ** 18,
		hashrate: currentStats.data.averageHashrate,
		payments: [],
		price: await getEuroPrice(),
	}
}

export const choosePool = (store: Storage): Promise<Response> => {
	if (store.pool === 'hiveon') return hiveonPoolData(store.address)
	if (store.pool === '2miners') return twoMinersData(store.address)
	if (store.pool === 'ethermine') return ethermineData(store.address)
	else return twoMinersData(store.address)
}
