import moment from 'moment';

type SumRewards = {
  inverval: number,
  reward: number,
  numreward: number,
  name: string,
  offset: number
}

type MinerAPI = {
currentHashrate: number,
hashrate: number,
rewards: [
  {
    timestamp: number,
    reward: number,
  }
],
shares: [string],
stats: {
  balance: number,
  blocksFound: number,
  immature: number,
  lastShare: number,
  paid: number,
  pending: boolean
},
sumrewards: [
  SumRewards,
  SumRewards,
  SumRewards,
  SumRewards,
  SumRewards,
],
"24hreward": number,
"24hnumreward": number
}

type PriceAPI = {
  ethereum: {
    eur: number
  }
}

type RestantDate = {
  jour: number;
  heure: number;
  minute: number;
}

function minerStats(json: MinerAPI) {

  function average() {

    let unix = moment().unix(),
      yesterday = 0,
      daybefore = 0,
      jour = json.sumrewards[2].reward;

    //calc le nbr de jours avant reward
    const ratio = (by: number) => (0.05 - sat(json.stats.balance)) / sat(by);

    //increment les rewards comprise entre les intervalles
    const incrRewards = (
      interval: number[],
      re: {timestamp: number, reward: number}) => (
        re.timestamp < unix - interval[0] &&
        re.timestamp > unix - interval[1]
      ? re.reward : 0)

    for (let re of json.rewards) {
      yesterday += incrRewards([86400, 172800], re);
      daybefore += incrRewards([172800, 259200], re);
    }

    const calcMoyenne = (array: number[]) => {

      let average: number[] = [];

      array.forEach(temps => {
        if (temps > 0) {
          average.push(ratio(temps))
        }
      })

      if (average.length > 0) {
        return (average.reduce((a, b) => a + b) / average.length)
      } else {
        return 0
      }
    }

    return calcMoyenne([daybefore, yesterday, jour])
  }

  function countdown(d: RestantDate) {

    let full = ''

    full += d.jour === 1 ? `${d.jour} jour, ` : d.jour > 1 ? `${d.jour} jours, ` : ``;
    full += d.heure === 1 ? `${d.heure} heure` : d.heure > 1 ? `${d.heure} heures` : ``;
    full += d.minute === 1 ? ` et ${d.minute} minute` : d.minute > 1 ? ` et ${d.minute} minutes` : `1 minute`;
  
    return full
  }

  function date(d: RestantDate) {
    return ("Le " + moment().locale('fr').add({days: d.jour, hours: d.heure, minutes: d.minute}).format("DD MMMM à HH:mm"))
  }

  const dom = {
    titre: document.querySelector('h1')!,
    jourrestant: id("jourrestant"),
    date: id("date")
  }

  const moyenne = average();
  const restant = {
    jour: Math.floor(moyenne),
    heure: Math.floor((moyenne * 24) % 24),
    minute: Math.floor((moyenne * 24 * 60) % 60)
  }

  if (json.hashrate === 0 || moyenne === 0) {
    dom.titre.innerText = "Tu ne mines pas"
    dom.jourrestant.style.display = "none"
    dom.date.style.display = "none"
  } else {
    dom.titre.innerText = "Tu seras payé"
    dom.jourrestant.innerText = countdown(restant)
    dom.date.innerText = date(restant)
  }

  id("eth").innerText = (json.stats.balance * 10 ** -9).toFixed(3);
  id("minerLink").setAttribute('href', `https://eth.2miners.com/account/${ADDRESS}`);
}

function displayPrice(price: PriceAPI, mining: MinerAPI) {
  id("prixmax").innerText = (0.05 * price.ethereum.eur).toFixed(2);
  id("prixbal").innerText = (
    sat(mining.stats.balance) * price.ethereum.eur
  ).toFixed(2);
  document.querySelector("main")!.className = "loaded";
}

const sat = (a: number) => a * 10 ** -9;
const id = (e: string) => document.getElementById(e)!;
const ADDRESS = "0xb209dF7430065CA587B433039499B29EeC5c9383";
const COIN = "ethereum";

//attrape stats de miner
fetch(`https://eth.2miners.com/api/accounts/${ADDRESS}`).then((resp) => {
  return resp.json().then((miningdata) => {
    minerStats(miningdata);

    //pour ensuite attraper le prix
    fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${COIN}&vs_currencies=eur`
    ).then((resp) => {
      return resp.json().then((pricedata) => {
        displayPrice(pricedata, miningdata);
      });
    });
  });
});