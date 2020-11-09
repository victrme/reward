import { choosePool, Response } from './apis'
import 'regenerator-runtime/runtime'

function minerStats(data: Response) {
	function payoutDates() {
		function countdown(d: { jour: number; heure: number }) {
			const pluriel = (num: number, str: string[]) =>
				num === 1
					? `${num} ${str[0]}`
					: num > 1
					? `${num} ${str[1]}`
					: ``

			return (
				pluriel(d.jour, ['jour', 'jours']) +
				(d.jour > 0 && d.heure > 0 ? ' et ' : '') +
				pluriel(d.heure, ['heure', 'heures'])
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
			restant: id('jourrestant'),
			date: id('date'),
			titre: id('titre'),
		}

		if (data.hashrate > 0) {
			//calcule les moyennes
			const restant = {
				jour: Math.floor(data.average),
				heure: Math.floor((data.average * 24) % 24),
			}

			//ajoute les dates
			dom.titre.innerText = 'Tu seras payé'
			dom.restant.innerText = 'Dans ' + countdown(restant)
			dom.date.innerText = 'Le ' + date(restant)

			//affiche la partie payouts
			dom.restant.classList.add('shown')
			dom.date.classList.add('shown')
		} else {
			dom.titre.innerText = 'Tu ne mines pas'
		}
	}

	function toMinerPage() {
		id('minerLink').innerText = 'vers ' + data.from
		id('minerLink').setAttribute('href', data.page)
	}

	function history() {
		if (data.payments) {
			id('history').classList.add('hasHistory')

			const liste = id('liste')!
			data.payments.forEach((pay) => {
				const p = document.createElement('p')
				p.innerText = localeDate(new Date(pay.timestamp * 1000))
				liste.appendChild(p)
			})
		}
	}

	async function displayPrice() {
		const maxAmount = data.from === 'hiveon' ? '0.10' : '0.05'
		id('eth').innerText = `${data.balance.toFixed(3)} / ${maxAmount} ⬨`

		id('prixmax').innerText = (0.05 * data.price).toFixed(2)
		id('prixbal').innerText = (data.balance * data.price).toFixed(2)
		document.querySelector('main')!.className = 'loaded'
	}

	const localeDate = (d: Date) =>
		d.toLocaleDateString('fr-fr', {
			day: '2-digit',
			month: 'long',
			hour: '2-digit',
			minute: '2-digit',
		})

	const id = (e: string) => document.getElementById(e)!

	history()
	toMinerPage()
	payoutDates()
	displayPrice()
}

choosePool('hiveon').then((a) => minerStats(a))
