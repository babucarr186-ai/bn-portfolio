const maximumMoney = 1000000000;

export const staffIdentifier = (value) => String(value ?? '').toUpperCase().replace(/[\s-]+/g, '');

export function recordedCost(product) {
  const value = product.unitCostGmd;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= maximumMoney
    ? value : null;
}

export function staffCatalogRecord(product, sku, costVersion) {
  if (!Number.isSafeInteger(product.stockQty) || product.stockQty < 0 ||
      typeof product.unitPriceGmd !== 'number' || !(product.unitPriceGmd >= 0 && product.unitPriceGmd <= maximumMoney) ||
      typeof product.name !== 'string' || !product.name.trim() || product.name.length > 120) return null;
  const serialNumber = staffIdentifier(product.serialNumber);
  const imei = staffIdentifier(product.imei);
  return {
    sku,
    name: product.name,
    category: String(product.category || '').slice(0, 48),
    storage: String(product.storage || '').slice(0, 32),
    colour: String(product.colour || '').slice(0, 48),
    batteryHealth: Number.isInteger(product.batteryHealth) && product.batteryHealth >= 1 &&
      product.batteryHealth <= 100 ? product.batteryHealth : null,
    serialNumber: /^[A-Z0-9]{3,32}$/.test(serialNumber) ? serialNumber : '',
    imei: /^[0-9]{15}$/.test(imei) ? imei : '',
    stockQty: product.stockQty,
    unitPriceGmd: product.unitPriceGmd,
    costVersion
  };
}

export function withStaffCosts(sales, costs) {
  const versions = new Map(costs.map((cost) => [cost.id, cost]));
  return sales.map((sale) => {
    const version = versions.get(sale.costVersion);
    return {
      ...sale, staffSale: true,
      unitCostGmd: version?.productId === sale.productId ? recordedCost(version) : null
    };
  });
}

export async function recordStaffSale(db, sale, firestore) {
  const { doc, collection, runTransaction, increment, serverTimestamp } = firestore;
  const { sku, quantity, paidGmd, method, customer, date, dueOn, uid } = sale;
  const catalogRef = doc(db, 'staffCatalog', sku);
  const productRef = doc(db, 'products', sku);
  const saleRef = doc(collection(db, 'staffSales'));
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(catalogRef);
    if (!snapshot.exists()) throw new Error('This product is no longer available.');
    const product = snapshot.data();
    if (!Number.isSafeInteger(product.stockQty) || quantity > product.stockQty) {
      throw new Error('Insufficient stock available.');
    }
    const unitPriceGmd = product.unitPriceGmd;
    const totalGmd = Number((unitPriceGmd * quantity).toFixed(2));
    if (!(unitPriceGmd > 0) || !Number.isFinite(totalGmd) || totalGmd > maximumMoney || paidGmd > totalGmd) {
      throw new Error('Check the payment amount or ask the owner to confirm the selling price.');
    }
    const saleStock = { lastSaleId: saleRef.id, updatedAt: serverTimestamp() };
    transaction.update(catalogRef, { ...saleStock, stockQty: product.stockQty - quantity });
    // Staff can decrement stock through this sale, but cannot read the private product.
    transaction.update(productRef, { ...saleStock, stockQty: increment(-quantity) });
    transaction.set(saleRef, {
      productId: sku, sku, productName: product.name, quantity, unitPriceGmd, totalGmd, paidGmd,
      method, date, dueOn, customer, costVersion: product.costVersion,
      createdBy: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
    if (paidGmd > 0) transaction.set(doc(db, 'staffPayments', saleRef.id), {
      saleId: saleRef.id, amountGmd: paidGmd, method, createdBy: uid, createdAt: serverTimestamp()
    });
  });
  return saleRef.id;
}

// Shared by the owner and staff forms. Firestore verifies the balance change and
// the receipt together, as well as which account may modify the sale.
export async function recordStaffPayment(db, { id, amount, method, uid }, firestore) {
  const { doc, collection, runTransaction, serverTimestamp } = firestore;
  const saleRef = doc(db, 'staffSales', id);
  const paymentRef = doc(collection(db, 'staffPayments'));
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(saleRef);
    if (!snapshot.exists()) throw new Error('Sale not found.');
    const sale = snapshot.data();
    const paidGmd = Number((sale.paidGmd + amount).toFixed(2));
    if (paidGmd <= sale.paidGmd || paidGmd > sale.totalGmd) {
      throw new Error('Enter an amount within the outstanding balance.');
    }
    transaction.update(saleRef, { paidGmd, lastPaymentId: paymentRef.id, updatedAt: serverTimestamp() });
    transaction.set(paymentRef, { saleId: id, amountGmd: amount, method, createdBy: uid, createdAt: serverTimestamp() });
  });
}
