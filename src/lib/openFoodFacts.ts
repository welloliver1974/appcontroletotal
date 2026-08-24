export interface OpenFoodFactsProduct {
  barcode: string
  name: string
  brand?: string
  category: string
  imageUrl?: string
  quantityStr?: string
  suggestedQty: number
  suggestedUnit: string
  suggestedShelfLifeDays: number
  suggestedExpiryDate: string // YYYY-MM-DD
}

function inferCategory(categoriesStr: string, name: string): string {
  const combined = `${categoriesStr} ${name}`.toLowerCase()
  if (
    combined.includes('bebida') ||
    combined.includes('refrigerante') ||
    combined.includes('suco') ||
    combined.includes('cerveja') ||
    combined.includes('água') ||
    combined.includes('cafe') ||
    combined.includes('café') ||
    combined.includes('cha') ||
    combined.includes('chá')
  ) {
    return 'bebidas'
  }
  if (
    combined.includes('leite') ||
    combined.includes('queijo') ||
    combined.includes('iogurte') ||
    combined.includes('manteiga') ||
    combined.includes('requeijão') ||
    combined.includes('laticínio') ||
    combined.includes('dairy')
  ) {
    return 'laticínios'
  }
  if (
    combined.includes('pão') ||
    combined.includes('biscoito') ||
    combined.includes('bolo') ||
    combined.includes('torrada') ||
    combined.includes('bakery')
  ) {
    return 'padaria'
  }
  if (
    combined.includes('carne') ||
    combined.includes('frango') ||
    combined.includes('peixe') ||
    combined.includes('bovino') ||
    combined.includes('suíno') ||
    combined.includes('linguiça')
  ) {
    return 'carnes'
  }
  if (
    combined.includes('fruta') ||
    combined.includes('legume') ||
    combined.includes('verdura') ||
    combined.includes('hortaliça') ||
    combined.includes('vegetal')
  ) {
    return 'hortifruti'
  }
  if (
    combined.includes('limpeza') ||
    combined.includes('detergente') ||
    combined.includes('sabão') ||
    combined.includes('desinfetante') ||
    combined.includes('amaciante')
  ) {
    return 'limpeza'
  }
  if (
    combined.includes('shampoo') ||
    combined.includes('sabonete') ||
    combined.includes('dental') ||
    combined.includes('higiene')
  ) {
    return 'higiene'
  }
  if (
    combined.includes('congelado') ||
    combined.includes('pizza') ||
    combined.includes('nugget') ||
    combined.includes('sorvete')
  ) {
    return 'congelados'
  }
  return 'alimentos'
}

function getSuggestedShelfLifeDays(category: string): number {
  switch (category) {
    case 'laticínios':
      return 20
    case 'padaria':
      return 10
    case 'hortifruti':
      return 7
    case 'carnes':
      return 5
    case 'bebidas':
      return 90
    case 'congelados':
      return 60
    case 'limpeza':
    case 'higiene':
      return 365
    case 'alimentos':
    default:
      return 120
  }
}

export async function fetchProductByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  const cleanBarcode = barcode.replace(/\D/g, '').trim()
  if (!cleanBarcode || cleanBarcode.length < 8) return null

  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`, {
      headers: {
        'User-Agent': 'LifeOSHub/1.0 (https://appcontroletotal.local; personal-pwa)',
      },
    })

    if (!res.ok) return null
    const json = await res.json()

    if (json.status !== 1 || !json.product) {
      return null
    }

    const p = json.product
    const name =
      p.product_name_pt ||
      p.product_name ||
      p.generic_name_pt ||
      p.generic_name ||
      p.abbreviated_product_name ||
      'Produto sem nome'

    const brand = p.brands || p.brand_owner || ''
    const categoriesTags = Array.isArray(p.categories_tags) ? p.categories_tags.join(' ') : ''
    const categoriesStr = `${p.categories || ''} ${categoriesTags}`
    const category = inferCategory(categoriesStr, name)

    const shelfLifeDays = getSuggestedShelfLifeDays(category)
    const expiryDate = new Date(Date.now() + shelfLifeDays * 86_400_000).toISOString().slice(0, 10)

    const imageUrl = p.image_front_url || p.image_url || p.image_small_url

    let suggestedQty = 1
    let suggestedUnit = 'un'
    const qtyText = p.quantity || ''
    if (qtyText.toLowerCase().includes('kg')) {
      suggestedUnit = 'kg'
    } else if (qtyText.toLowerCase().includes('g')) {
      suggestedUnit = 'g'
    } else if (qtyText.toLowerCase().includes('l')) {
      suggestedUnit = 'L'
    } else if (qtyText.toLowerCase().includes('ml')) {
      suggestedUnit = 'ml'
    }

    return {
      barcode: cleanBarcode,
      name: brand ? `${name} (${brand})` : name,
      brand,
      category,
      imageUrl,
      quantityStr: qtyText,
      suggestedQty,
      suggestedUnit,
      suggestedShelfLifeDays: shelfLifeDays,
      suggestedExpiryDate: expiryDate,
    }
  } catch (err) {
    console.error('[OpenFoodFacts] Fetch error:', err)
    return null
  }
}
