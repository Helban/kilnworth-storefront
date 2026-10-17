export function StockLabel({ stockLeft }: { stockLeft: number }) {
  if (stockLeft === 0) return <span className="font-medium text-red-800">Sold out</span>;
  return <span>{stockLeft} left</span>;
}
