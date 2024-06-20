export function formatCurrency(cents: number) {
  const BRLFormat = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return BRLFormat.format(cents / 100);
}
