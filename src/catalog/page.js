import { renderCatalog } from './renderCatalog.js';
import { iphones } from './data/iphones.js';
import { macbooks } from './data/macbooks.js';
import { watches } from './data/watches.js';
import { airpods } from './data/airpods.js';
import { giftCards } from './data/giftcards.js';
import { accessories } from './data/accessories.js';

const category = document.documentElement.dataset.category || 'iphones';

const map = {
  iphones,
  macbooks,
  watches,
  airpods,
  giftcards: giftCards,
  accessories,
};

const products = map[category] || iphones;

renderCatalog({
  mountEl: document.getElementById('catalogGrid'),
  products,
});
