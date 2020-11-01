import * as type from "./types"

function minerStats(json: type.MinerAPI) {
	function payoutDates() {
		function calcAverage() {
			let unix = Date.now(),
				yesterday = 0,
				daybefore = 0,
				jour = json.sumrewards[2].reward

			//calc le nbr de jours avant reward
			const ratio = (by: number) =>
				(0.05 - sat(json.stats.balance)) / sat(by)

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

		function countdown(d: { jour: number; heure: number }) {
			const pluriel = (num: number, str: string[]) =>
				num === 1
					? `${num} ${str[0]}`
					: num > 1
					? `${num} ${str[1]}`
					: ``

			return (
				pluriel(d.jour, ["jour", "jours"]) +
				(d.jour > 0 && d.heure > 0 ? " et " : "") +
				pluriel(d.heure, ["heure", "heures"])
			)
		}

		function date(d: { jour: number; heure: number }) {
			//fait avancer la date
			let payout = new Date()
			payout.setDate(payout.getDate() + d.jour)
			payout.setHours(payout.getHours() + d.heure)

			return localeDate(payout)
		}

		const dom = {
			restant: id("jourrestant"),
			date: id("date"),
			titre: id("titre"),
		}

		if (json.hashrate > 0) {
			//calcule les moyennes
			const average = calcAverage()
			const restant = {
				jour: Math.floor(average),
				heure: Math.floor((average * 24) % 24),
			}

			//ajoute les dates
			dom.titre.innerText = "Tu seras payé"
			dom.restant.innerText = "Dans " + countdown(restant)
			dom.date.innerText = "Le " + date(restant)

			//affiche la partie payouts
			dom.restant.classList.add("shown")
			dom.date.classList.add("shown")
		} else {
			dom.titre.innerText = "Tu ne mines pas"
		}
	}

	function toMinerPage() {
		const url = `https://eth.2miners.com/account/${ADDRESS}`
		id("eth").innerText = (json.stats.balance * 10 ** -9).toFixed(3)
		id("minerLink").setAttribute("href", url)
	}

	function history() {
		const historyDom = document.querySelector(".history-liste")!

		json.payments.forEach((pay) => {
			const p = document.createElement("p")
			p.innerText = localeDate(new Date(pay.timestamp * 1000))
			historyDom.appendChild(p)
		})
	}

	const localeDate = (d: Date) =>
		d.toLocaleDateString("fr-fr", {
			day: "2-digit",
			month: "long",
			hour: "2-digit",
			minute: "2-digit",
		})

	toMinerPage()
	payoutDates()
	history()
}

function displayPrice(price: type.PriceAPI, mining: type.MinerAPI) {
	id("prixmax").innerText = (0.05 * price.ethereum.eur).toFixed(2)
	id("prixbal").innerText = (
		sat(mining.stats.balance) * price.ethereum.eur
	).toFixed(2)
	document.querySelector("main")!.className = "loaded"
}

const sat = (a: number) => a * 10 ** -9
const id = (e: string) => document.getElementById(e)!
const ADDRESS = "0xb209dF7430065CA587B433039499B29EeC5c9383"
const COIN = "ethereum"

//attrape stats de miner
fetch(`https://eth.2miners.com/api/accounts/${ADDRESS}`).then((resp) => {
	return resp.json().then((miningdata) => {
		minerStats(miningdata)

		//pour ensuite attraper le prix
		fetch(
			`https://api.coingecko.com/api/v3/simple/price?ids=${COIN}&vs_currencies=eur`
		).then((resp) => {
			return resp.json().then((pricedata) => {
				displayPrice(pricedata, miningdata)
			})
		})
	})
})
