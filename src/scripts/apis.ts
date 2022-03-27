import { Response, Storage } from './types'

async function fetcher(url: string) {
	let response, json
	response = await fetch(url)

	if (response.status === 200) {
		json = await response.json()
		return json
	} else {
		alert(response.status)
	}
}

async function getEuroPrice() {
	const x = await fetcher(`https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=eur`)
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
		const ratio = (by: number) => (sat(json.config.minPayout) - sat(json.stats.balance)) / sat(by)

		//increment les rewards comprise entre les intervalles
		const incrRewards = (interval: number[], re: { timestamp: number; reward: number }) =>
			re.timestamp < unix - interval[0] && re.timestamp > unix - interval[1] ? re.reward : 0

		for (let re of json.rewards) {
			yesterday += incrRewards([86400, 172800], re)
			daybefore += incrRewards([172800, 259200], re)
		}

		const calc = (array: number[]) => {
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

		let result = calc([daybefore, yesterday, jour])

		// Above payment threshold, will be payed when pool is ready (around 13h)
		if (result < 0) {
			const date = new Date()
			const payedToday = date.getHours() <= 13
			const hoursLeft = (when: number) => (when - date.getHours()) / 24

			result = payedToday ? hoursLeft(13) : hoursLeft(37)
		}

		return result
	}

	return {
		from: '2miners',
		page: home + 'account/' + addr,
		balance: sat(json.stats.balance),
		average: calcAverage(),
		minPayout: sat(json.config.minPayout),
		hashrate: json.hashrate,
		payments: json.payments,
		price: await getEuroPrice(),
	}
}

async function hiveonPoolData(addr: string) {
	addr = addr.replace('0x', '')

	const json = await fetcher(`https://hiveon.net/api/v1/stats/miner/${addr}/ETH/billing-acc`)

	const data = {
		from: 'hiveon',
		page: 'https://hiveon.net/eth?miner=' + addr,
		balance: 0,
		average: 0,
		minPayout: 0.1,
		hashrate: 0,
		payments: [],
		price: await getEuroPrice(),
	}

	if (json.code === 404) alert(json.message)
	else {
		const average = (0.1 - json.totalUnpaid) / json.expectedReward24H
		data.balance = json.totalUnpaid
		data.average = average
		data.hashrate = 0
		data.payments = json.succeedPayouts
	}

	return data
}

async function ethermineData(addr: string) {
	const home = 'https://api.ethermine.org/miner/'
	const dashboard = await fetcher(home + addr + '/dashboard')
	const currentStats = await fetcher(home + addr + '/currentStats')

	// Flexible payout on ethermine
	const minpayout = dashboard.data.settings.minPayout
	const balance = dashboard.data.currentStatistics.unpaid + (dashboard.data.currentStatistics.unconfirmed | 0)

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
	const { pool, address } = store

	switch (pool) {
		case 'hiveon':
			return hiveonPoolData(address)

		case '2miners':
			return twoMinersData(address)

		case 'ethermine':
			return ethermineData(address)

		default:
			return twoMinersData(address)
	}
}
