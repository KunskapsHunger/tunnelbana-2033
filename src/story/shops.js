// Trader inventories. `give` mutates game state through the game API.

const ammo = (type, n, price, label, desc) => ({
  label, price, desc,
  give: (g) => g.arsenal.addAmmo(type, n),
  canBuy: (g) => (g.arsenal.reserve[type] ?? 0) < 200,
});

const filter = (price) => ({
  label: 'Gasmaskfilter', price, desc: 'Två minuter ren luft.',
  give: (g) => { g.player.filters += 1; },
  canBuy: (g) => g.player.filters < 9,
});

const medkit = (price) => ({
  label: 'Förbandslåda', price, desc: 'Tryck H för att använda. Max 5.',
  give: (g) => { g.medkits += 1; },
  canBuy: (g) => g.medkits < 5,
});

const mask = (price) => ({
  label: 'Ny gasmask', price, desc: 'Ersätter en sprucken mask.',
  give: (g) => { g.player.maskHealth = 100; },
  canBuy: (g) => g.player.maskHealth < 100,
  denied: 'Din mask är hel.',
});

export const SHOPS = {
  solna: {
    title: 'PRESSBYRÅN',
    subtitle: 'Kiosk-Kjell: "Allt har ett pris. Även hopp."',
    items: [
      ammo('rev', 12, 10, '7,5 mm x12', 'Revolverpatroner, handladdade.'),
      filter(15),
      medkit(20),
      mask(25),
    ],
  },
  fridhem: {
    title: 'SMUGGLARNISCHEN',
    subtitle: 'Viskningar i mörkret.',
    items: [
      ammo('rev', 12, 10, '7,5 mm x12', 'Revolverpatroner.'),
      ammo('9mm', 36, 18, '9 mm x36', 'Ett magasin till kpisten.'),
      ammo('shells', 8, 14, 'Hagel x8', 'Hemgjorda hagelpatroner.'),
      filter(18),
      medkit(24),
    ],
  },
  tc: {
    title: 'HANDELSFÖRBUNDET',
    subtitle: 'T-Centralens stora marknad.',
    items: [
      ammo('rev', 12, 8, '7,5 mm x12', 'Revolverpatroner.'),
      ammo('9mm', 36, 15, '9 mm x36', 'Ett magasin till kpisten.'),
      ammo('shells', 8, 12, 'Hagel x8', 'Hagelpatroner.'),
      filter(12),
      medkit(18),
      mask(20),
      {
        label: 'Hagelbössa', price: 90, desc: 'Dubbelpipig. Gör rent hus på nära håll.',
        give: (g) => { g.arsenal.give('shotgun'); g.arsenal.addAmmo('shells', 8); },
        canBuy: (g) => !g.arsenal.owned.has('shotgun'), denied: 'Du har redan en.',
      },
      {
        label: 'Kpist m/45', price: 110, desc: 'Carl Gustaf. Svensk kvalitet.',
        give: (g) => { g.arsenal.give('kpist'); g.arsenal.addAmmo('9mm', 36); },
        canBuy: (g) => !g.arsenal.owned.has('kpist'), denied: 'Du har redan en.',
      },
    ],
  },
};
