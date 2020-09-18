
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
}

function minerStats(json: MinerAPI) {

  function average() {

    let unix = Date.now(),
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

    const pluriel = (num: number, str: string[]):string => {
      return (num === 1 ? `${num} ${str[0]}` : num > 1 ? `${num} ${str[1]}` : ``)
    }

    return (
      'Dans ' +
      pluriel(d.jour, ["jour", "jours"]) + 
      (d.jour > 0 && d.heure > 0 ? ' et ' : '') +
      pluriel(d.heure, ["heure", "heures"])
    )
  }

  function date(d: RestantDate) {

    //fait avancer la date 
    let laterDate = new Date;
    laterDate.setDate(laterDate.getDate() + d.jour)
    laterDate.setHours(laterDate.getHours() + d.heure)

    const mois = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'decembre']
    const addTenZero = (num: number):string => num < 10 ? "0" + num.toString() : num.toString()

    //enregistre les formats a afficher
    let ldObj = {
      mo: mois[laterDate.getMonth()],
      j: laterDate.getDate(),
      h: addTenZero(laterDate.getHours()),
      mi: addTenZero(laterDate.getMinutes())
    } 

    return `Le ${ldObj.j} ${ldObj.mo} à ${ldObj.h}:${ldObj.mi}`
  }
  
  //liste les doms à afficher
  const dom = {
    titre: document.querySelector('h1')!,
    jourrestant: id("jourrestant"),
    date: id("date")
  }
  
  //liste les dates a utiliser
  const moyenne = average();
  const restant = {
    jour: Math.floor(moyenne),
    heure: Math.floor((moyenne * 24) % 24)
  }

  //modifie le DOM en fonction de la moyenne trouvé
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