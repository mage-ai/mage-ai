# B2Mag Geliştirici Rehberi

Bu dosya, projede sık yapılan geliştirme işlemlerine ait adım adım rehberleri içerir.
Yeni bir konu eklemek için ilgili başlık altına yeni bir bölüm oluştur.

---

## İçindekiler

- [1. Yeni Aggregate Aksiyonu Ekleme](#1-yeni-aggregate-aksiyonu-ekleme)
- [2. Yeni Block Type Ekleme (Model Maker Örneği)](#2-yeni-block-type-ekleme-model-maker-örneği)
- [3. Mevcut Block Tipine Alt Şablon Ekleme (Model Maker Örneği)](#3-mevcut-block-tipine-alt-şablon-ekleme-model-maker-örneği)

---

## 1. Yeni Aggregate Aksiyonu Ekleme

Transformer Block > Column Actions > Aggregate dropdown menüsüne yeni bir seçenek eklemek için aşağıdaki adımlar izlenmelidir.

### Adım 1 — Backend: `constants.py`'ye yeni giriş ekle

**Dosya:** `mage_ai/data_preparation/templates/constants.py`

`TEMPLATES_ONLY_FOR_V2` listesindeki `# Column actions > Aggregate` bölümünün sonuna yeni bir `dict` ekle:

```python
dict(
    block_type=BlockType.TRANSFORMER,
    groups=[GROUP_COLUMN_ACTIONS, GROUP_AGGREGATE],
    language=BlockLanguage.PYTHON,
    name='Dropdown menüde görünecek isim',
    path='transformers/transformer_actions/column/yeni_aksiyon.py',
),
```

- `name`: Frontend dropdown'da görünecek metin
- `path`: Şablon dosyasının `mage_ai/data_preparation/templates/` klasörüne göre göreli yolu

### Adım 2 — Backend: Şablon `.py` dosyası oluştur

**Dosya:** `mage_ai/data_preparation/templates/transformers/transformer_actions/column/yeni_aksiyon.py`

Mevcut şablonlara bakarak yeni dosyayı oluştur. Örnek (`average.py` temel alınarak):

```python
{% extends "transformers/transformer_actions/action.jinja" %}
{% block action %}
    """
    Execute Transformer Action: ActionType.YENİ_AKSİYON

    Açıklama buraya.
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.AVERAGE,  # Uygun ActionType ile değiştir
        action_code='',
        arguments=[],  # Aggregate yapılacak sütunlar
        axis=Axis.COLUMN,
        options={'groupby_columns': []},  # Group by sütunları
        outputs=[
            {'uuid': 'yeni_sutun_adi', 'column_type': 'number_with_decimals'},
        ],
    )
{% endblock %}
```

> Mevcut şablon dosyaları: `mage_ai/data_preparation/templates/transformers/transformer_actions/column/`

### Adım 3 — Frontend: `ActionTypeEnum`'a yeni değer ekle

**Dosya:** `mage_ai/frontend/interfaces/ActionPayloadType.ts`

`ActionTypeEnum` enum'una, alfabetik sıraya uygun şekilde yeni değeri ekle:

```typescript
export enum ActionTypeEnum {
  // ...
  YENİ_AKSİYON = 'yeni_aksiyon',
  // ...
}
```

### Adım 4 — Frontend: `TransformerActionType.ts`'yi güncelle

**Dosya:** `mage_ai/frontend/interfaces/TransformerActionType.ts`

Üç yerde değişiklik yapılması gerekir:

**4a — `COLUMN_ACTIONS` dizisine ekle:**

```typescript
export const COLUMN_ACTIONS: ActionTypeEnum[] = [
  // ...
  ActionTypeEnum.YENİ_AKSİYON,
  // ...
];
```

**4b — `ACTION_GROUPING_MAPPING` içindeki Aggregate grubuna ekle:**

```typescript
[ActionGroupingEnum.AGGREGATE]: [
  ActionTypeEnum.AVERAGE,
  // ...
  ActionTypeEnum.YENİ_AKSİYON,
  // ...
],
```

**4c — `ACTION_TYPE_HUMAN_READABLE_MAPPING`'e okunabilir etiket ekle:**

```typescript
[AxisEnum.COLUMN]: {
  // ...
  [ActionTypeEnum.YENİ_AKSİYON]: 'Aggregate by yeni aksiyon',
  // ...
},
```

### Adım 5 — Backend'i yeniden başlat

Frontend dropdown'u backend'den beslenir. Değişikliklerin yansıması için backend sunucusunu yeniden başlatmak gerekir:

```bash
mage start demo
```

### Özet Tablo

| Adım | Dosya | Yapılan Değişiklik |
|------|-------|--------------------|
| 1 | `mage_ai/data_preparation/templates/constants.py` | `TEMPLATES_ONLY_FOR_V2` listesine yeni `dict` ekleme |
| 2 | `mage_ai/data_preparation/templates/transformers/transformer_actions/column/<isim>.py` | Yeni Jinja şablon dosyası oluşturma |
| 3 | `mage_ai/frontend/interfaces/ActionPayloadType.ts` | `ActionTypeEnum`'a yeni değer ekleme |
| 4 | `mage_ai/frontend/interfaces/TransformerActionType.ts` | `COLUMN_ACTIONS`, `ACTION_GROUPING_MAPPING`, `ACTION_TYPE_HUMAN_READABLE_MAPPING` güncelleme |
| 5 | — | Backend sunucusunu yeniden başlatma |

### Gerçek Örnek: `example` aksiyonu

Bu rehber, `example` aksiyonu eklenirken uygulanan adımlar temel alınarak hazırlanmıştır:

- `constants.py` → `name='Example aggregate action'`, `path='.../column/example.py'`
- `example.py` → `ActionType.AVERAGE` kullanan örnek şablon
- `ActionPayloadType.ts` → `EXAMPLE = 'example'`
- `TransformerActionType.ts` → `ActionTypeEnum.EXAMPLE` üç ilgili yere eklendi, label: `'Aggregate by example'`

---

## 2. Yeni Block Type Ekleme (Model Maker Örneği)

Mage-AI'a yeni bir block tipi eklemek için backend (Python) ve frontend (TypeScript) tarafında paralel değişiklikler yapılması gerekir. Aşağıdaki adımlar `model_maker` block tipi eklenerek oluşturulmuştur ve herhangi bir yeni block tipi için şablon olarak kullanılabilir.

---

### Adım 1 — Backend: `BlockType` enum'una ekle

**Dosya:** `mage_ai/data_preparation/models/constants.py`

`BlockType` enum'una yeni değeri alfabetik sıraya uygun olarak ekle:

```python
class BlockType(StrEnum):
    # ...
    MODEL_MAKER = 'model_maker'
    # ...
```

Aynı dosyada `CUSTOM_EXECUTION_BLOCK_TYPES` listesine de ekle (block'un pipeline içinde çalıştırılabilmesi için):

```python
CUSTOM_EXECUTION_BLOCK_TYPES = [
    # ...
    BlockType.MODEL_MAKER,
    # ...
]
```

> `BLOCK_TYPE_DIRECTORY_NAME` sözlüğü dict comprehension ile otomatik oluşur (`model_maker` → `model_makers/` klasörü). Ekstra işlem gerekmez.

---

### Adım 2 — Backend: Block sınıf haritasına ekle

**Dosya:** `mage_ai/data_preparation/models/block/constants.py`

`BLOCK_TYPE_TO_CLASS` sözlüğüne yeni tipi ekle. Özel bir davranış gerekmiyorsa temel `Block` sınıfını kullan:

```python
BLOCK_TYPE_TO_CLASS = {
    # ...
    BlockType.MODEL_MAKER: Block,
    # ...
}
```

> Özel davranış gerekiyorsa (ör. `SensorBlock`, `CallbackBlock` gibi) önce `Block`'tan türeyen yeni bir sınıf oluştur, sonra buraya ekle.

---

### Adım 3 — Backend: Decorator ekle

**Dosya:** `mage_ai/data_preparation/decorators.py`

Her block tipi için kendi adında bir decorator fonksiyonu bulunur. Runtime'da block execution context'ine enjekte edilir:

```python
def model_maker(function):
    return function
```

---

### Adım 4 — Backend: Jinja şablon dosyası oluştur

**Dosya (yeni):** `mage_ai/data_preparation/templates/model_makers/default.jinja`

Yeni klasörü ve varsayılan Jinja şablonunu oluştur. `testable.jinja`'yı extend et, decorator adını ve boilerplate kodunu yaz:

```jinja
{% extends "testable.jinja" %}
{% block imports %}
if 'model_maker' not in globals():
    from mage_ai.data_preparation.decorators import model_maker
{% endblock %}

{% block content %}
@model_maker
def train(df, *args, **kwargs):
    # Buraya ML mantığını yaz
    return {}
{% endblock %}
```

---

### Adım 5 — Backend: Şablon kayıt listesine ekle

**Dosya:** `mage_ai/data_preparation/templates/constants.py`

`TEMPLATES` listesine yeni block tipi için giriş ekle:

```python
TEMPLATES = [
    dict(
        block_type=BlockType.MODEL_MAKER,
        description='Train or wrap an ML model using data from upstream blocks.',
        language=BlockLanguage.PYTHON,
        name='Generic (no template)',
        path='model_makers/default.jinja',
    ),
    # ...
]
```

---

### Adım 6 — Backend: Şablon yükleyici (`template.py`) güncelle

**Dosya:** `mage_ai/data_preparation/templates/template.py`

`fetch_template_source` fonksiyonundaki `elif` zincirinde yeni block tipini işleyen bir dal ekle:

```python
elif block_type == BlockType.MODEL_MAKER:
    template_source = __fetch_model_maker_templates(config, language=language)
```

Ardından yeni özel fonksiyonu dosyanın alt kısmına ekle:

```python
def __fetch_model_maker_templates(config, language=BlockLanguage.PYTHON):
    if language != BlockLanguage.PYTHON:
        return ''
    template_path = 'model_makers/default.jinja'
    return (
        template_env.get_template(template_path).render(
            code=config.get('existing_code', ''),
        )
        + '\n'
    )
```

---

### Adım 7 — Frontend: `BlockTypeEnum`'a ekle

**Dosya:** `mage_ai/frontend/interfaces/BlockType.ts`

`BlockTypeEnum`'a yeni değeri ekle:

```typescript
export enum BlockTypeEnum {
  // ...
  MODEL_MAKER = 'model_maker',
  // ...
}
```

Aynı dosyada şu listeleri ve mapping'leri güncelle:

| Sabit | Yapılan Değişiklik |
|-------|--------------------|
| `BLOCK_TYPES` | `BlockTypeEnum.MODEL_MAKER` eklendi |
| `DRAGGABLE_BLOCK_TYPES` | `BlockTypeEnum.MODEL_MAKER` eklendi |
| `BLOCK_TYPES_WITH_UPSTREAM_INPUTS` | `BlockTypeEnum.MODEL_MAKER` eklendi |
| `BLOCK_TYPES_WITH_VARIABLES` | `BlockTypeEnum.MODEL_MAKER` eklendi |
| `BLOCK_TYPE_NAME_MAPPING` | `[BlockTypeEnum.MODEL_MAKER]: 'Model maker'` eklendi |
| `BLOCK_TYPE_ABBREVIATION_MAPPING` | `[BlockTypeEnum.MODEL_MAKER]: 'MM'` eklendi |

---

### Adım 8 — Frontend: Renk tanımları

**Dosya:** `mage_ai/frontend/mana/themes/blocks.ts` → `getBlockColor()` fonksiyonu

```typescript
} else if (BlockTypeEnum.MODEL_MAKER === blockType) {
  baseName = 'teal';
  accent = colors?.teal;
  accentLight = colors?.tealHi;
}
```

**Dosya:** `mage_ai/frontend/components/CodeBlock/index.style.tsx`

`getGradientColorForBlockType()` içine:
```typescript
} else if (BlockTypeEnum.MODEL_MAKER === blockType) {
  value = EARTH_GRADIENT;
}
```

`getColorsForBlockType()` içine:
```typescript
} else if (BlockTypeEnum.MODEL_MAKER === blockType) {
  accent = (theme?.accent || dark.accent).teal;
  accentLight = (theme?.accent || dark.accent).tealLight;
}
```

> Mevcut renk seçenekleri: `purple` (Transformer), `yellow` (Data Exporter), `blue` (Data Loader), `pink` (Sensor), `teal` (Extension), `rose` (Callback), `sky` (Markdown), `orange` (DBT).

---

### Adım 9 — Frontend: İkon ataması

**Dosya:** `mage_ai/frontend/components/v2/Apps/Browser/System/constants.ts`

```typescript
export const BLOCK_TYPE_ICON_MAPPING = {
  // ...
  [BlockTypeEnum.MODEL_MAKER]: Insights,
  // ...
};
```

**Dosya:** `mage_ai/frontend/components/CustomTemplates/BrowseTemplates/constants.tsx`

Aynı şekilde `BLOCK_TYPE_ICON_MAPPING`'e ekle, `NAV_LINKS` dizisine de giriş ekle:

```typescript
{ uuid: BlockTypeEnum.MODEL_MAKER },
```

---

### Adım 10 — Frontend: "All Blocks" v2 menüsüne ekle

**Dosya:** `mage_ai/frontend/components/PipelineDetail/AddNewBlocks/v2/constants.tsx`

`ITEMS_MORE_UUIDS_ORDERED` listesine istenen sıraya ekle:

```typescript
export const ITEMS_MORE_UUIDS_ORDERED = [
  // ...
  BlockTypeEnum.MODEL_MAKER,
  // ...
];
```

**Dosya:** `mage_ai/frontend/components/PipelineDetail/AddNewBlocks/v2/ButtonItems.tsx`

`Insights` ikonunu import'lara ekle, ardından `getItemConfiguration` içindeki nesneye yeni tipin yapılandırmasını ekle:

```typescript
[BlockTypeEnum.MODEL_MAKER]: {
  Icon: Insights,
  onClick: (e) => {
    e?.preventDefault();
    addNewBlock({ language: BlockLanguageEnum.PYTHON, type: BlockTypeEnum.MODEL_MAKER });
  },
  tooltip: () => 'Add a Model Maker block to train or wrap an ML model',
},
```

---

### Adım 11 — Frontend: v1 "Add block" buton çubuğuna ekle (isteğe bağlı)

**Dosya:** `mage_ai/frontend/components/PipelineDetail/AddNewBlocks/index.tsx`

Sabit index, ref, memo ve JSX butonu ekle — diğer block tiplerine ait mevcut butonların kalıbını takip et.

---

### Adım 12 — Frontend'i derle ve yeniden yükle

TypeScript değişiklikleri ancak frontend bundle yeniden derlendikten sonra aktif olur:

```bash
cd mage_ai/frontend
sudo chown -R $USER .next   # .next klasörü root'a aitse
yarn export_prod            # derle + mage_ai/server/frontend_dist/'a aktar
```

Derleme tamamlandıktan sonra **sadece tarayıcıyı yenile** — container yeniden başlatmak gerekmez.

---

### Özet Tablo

| Adım | Dosya | Yapılan Değişiklik |
|------|-------|--------------------|
| 1 | `models/constants.py` | `BlockType` enum + `CUSTOM_EXECUTION_BLOCK_TYPES` |
| 2 | `models/block/constants.py` | `BLOCK_TYPE_TO_CLASS` haritası |
| 3 | `data_preparation/decorators.py` | Yeni decorator fonksiyonu |
| 4 | `templates/model_makers/default.jinja` | Varsayılan Jinja şablonu (yeni dosya) |
| 5 | `templates/constants.py` | `TEMPLATES` listesine giriş |
| 6 | `templates/template.py` | `fetch_template_source` + `__fetch_*_templates` |
| 7 | `frontend/interfaces/BlockType.ts` | Enum değeri + 6 liste/mapping |
| 8 | `mana/themes/blocks.ts` + `CodeBlock/index.style.tsx` | Renk ve gradient tanımları |
| 9 | `v2/Apps/Browser/System/constants.ts` + `BrowseTemplates/constants.tsx` | İkon ataması + NAV_LINKS |
| 10 | `AddNewBlocks/v2/constants.tsx` + `ButtonItems.tsx` | "All blocks" v2 menüsü |
| 11 | `AddNewBlocks/index.tsx` | v1 buton çubuğu (isteğe bağlı) |
| 12 | — | `yarn export_prod` ile frontend derleme |

---

## 3. Mevcut Block Tipine Alt Şablon Ekleme (Model Maker Örneği)

Zaten var olan bir block tipine (örn. `model_maker`) seçilebilir alt şablonlar eklemek için backend ve frontend tarafında değişiklikler yapılması gerekir. Aşağıdaki adımlar `model_maker` block tipine beş yeni şablon eklenirken uygulanan süreç temel alınarak hazırlanmıştır.

---

### Arka Plan: Şablon Sistemi Nasıl Çalışır?

Mage-AI'da block şablonları şu şekilde işler:

1. **Backend** → `templates/constants.py` içindeki `TEMPLATES` listesi tüm şablonları tanımlar.
2. **API** → `/api/block_templates` endpoint'i bu listeyi frontend'e gönderir.
3. **Frontend** → `utils.tsx` içindeki `groupBlockTemplates()` şablonları `block_type → language → groups` hiyerarşisinde gruplar.
4. **Seçim** → Kullanıcı bir şablon seçtiğinde frontend, `config: { template_path: '...' }` alanını backend'e gönderir.
5. **Render** → `template.py` içindeki `fetch_template_source()` fonksiyonu `template_path` varsa doğrudan o dosyayı render eder (block tipine özgü bir dal gerektirmez).

> **Önemli:** `template_path` config alanı varsa `fetch_template_source()` fonksiyonu block tipinden bağımsız olarak genel bir dal (`if 'template_path' in config`) üzerinden çalışır. Bu sayede `template.py` dosyasında herhangi bir değişiklik yapmak **gerekmez**.

---

### Adım 1 — Backend: Şablon `.py` dosyalarını oluştur

**Klasör:** `mage_ai/data_preparation/templates/<block_tipi_klasörü>/`

Her şablon için ayrı bir `.py` dosyası oluştur. Dosyalar düz Python kodudur; Jinja sözdizimi kullanmak **zorunlu değildir**.

Dosya yapısı örneği (`model_maker` için):

```
mage_ai/data_preparation/templates/model_makers/
├── default.jinja              ← varsayılan (mevcut)
├── sklearn_classifier.py      ← yeni şablon
├── sklearn_regressor.py       ← yeni şablon
├── huggingface_finetune.py    ← yeni şablon
├── model_evaluator.py         ← yeni şablon
└── model_serializer.py        ← yeni şablon
```

Şablon dosyasının içeriği block tipinin decorator'ını kullanmalıdır:

```python
if 'model_maker' not in globals():
    from mage_ai.data_preparation.decorators import model_maker

@model_maker
def train(df, *args, **kwargs):
    # Şablon kodu buraya
    return {}
```

> Mevcut şablon dosyaları referans için: `mage_ai/data_preparation/templates/data_loaders/`, `sensors/`, `model_makers/`

---

### Adım 2 — Backend: `constants.py`'ye şablon girişlerini ekle

**Dosya:** `mage_ai/data_preparation/templates/constants.py`

`TEMPLATES` listesine her yeni şablon için bir `dict` ekle. İlgili block tipinin mevcut girişlerinin hemen altına eklemek okunabilirliği artırır:

```python
dict(
    block_type=BlockType.MODEL_MAKER,
    description='Kısa açıklama.',
    groups=[GROUP_ML_ALGORITHMS],   # İsteğe bağlı; alt menü grubu oluşturur
    language=BlockLanguage.PYTHON,
    name='Şablon Adı',              # Dropdown'da görünecek metin
    path='model_makers/dosya_adi.py',
),
```

- `name`: Frontend dropdown'da görünecek etiket
- `path`: `mage_ai/data_preparation/templates/` klasörüne göre göreli yol
- `groups`: Belirtilirse şablonları alt menüde gruplar (ör. `[GROUP_ML_ALGORITHMS]`). Belirtilmezse şablon düz listede görünür.

Tanımlı grup sabitleri dosyanın üstündedir (`GROUP_AGGREGATE`, `GROUP_ML_ALGORITHMS`, vb.). Yeni bir grup gerekiyorsa buraya ekle.

---

### Adım 3 — Frontend: `ButtonItems.tsx`'e `items` desteği ekle

**Dosya:** `mage_ai/frontend/components/PipelineDetail/AddNewBlocks/v2/ButtonItems.tsx`

Block tipi "All Blocks" menüsünde doğrudan `onClick` ile block ekliyorsa (alt menü yoksa) aşağıdaki değişiklikleri yap:

**3a — `useMemo` ile şablon listesini hesapla:**

Mevcut `itemsSensors` veya `itemsTransformer` bloklarının hemen altına ekle:

```typescript
const itemsModelMaker = useMemo(() => getdataSourceMenuItems(
  addNewBlock,
  BlockTypeEnum.MODEL_MAKER,
  pipelineType,
  {
    blockTemplatesByBlockType,
    v2: true,
  },
)?.find(({
  uuid,
}) => uuid === `${BlockTypeEnum.MODEL_MAKER}/${BlockLanguageEnum.PYTHON}`)?.items,
  [
    addNewBlock,
    blockTemplatesByBlockType,
    pipelineType,
  ]);
```

**3b — `getItemConfiguration` içindeki block tipi girişini güncelle:**

`onClick` kullanan yapıyı kaldır, yerine `items` ekle:

```typescript
// ÖNCE (onClick — alt menü açmaz):
[BlockTypeEnum.MODEL_MAKER]: {
  Icon: Insights,
  onClick: (e) => {
    e?.preventDefault();
    addNewBlock({ language: BlockLanguageEnum.PYTHON, type: BlockTypeEnum.MODEL_MAKER });
  },
  tooltip: () => 'Add a Model Maker block to train or wrap an ML model',
},

// SONRA (items — alt menü açar):
[BlockTypeEnum.MODEL_MAKER]: {
  Icon: Insights,
  items: [
    {
      isGroupingTitle: true,
      label: () => 'Python',
      uuid: `${BlockLanguageEnum.PYTHON}${BlockTypeEnum.MODEL_MAKER}/group`,
    },
    // @ts-ignore
  ].concat(itemsModelMaker),
  label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.MODEL_MAKER],
  uuid: `${BlockTypeEnum.MODEL_MAKER}/${BlockLanguageEnum.PYTHON}`,
},
```

**3c — `getItemConfiguration` bağımlılık dizisine ekle:**

```typescript
], [
  // ...mevcut bağımlılıklar...
  itemsModelMaker,   // ← ekle
  // ...
]);
```

> **Kural:** Alt menü göstermek istiyorsan `onClick` yerine `items` kullan. `onClick` varsa `FlyoutMenuWrapper` açılmaz; `items` varsa açılır. Bu fark Data Loader, Transformer ve Sensor'ın neden ok (►) gösterdiğini, basit `onClick` tanımlı block tiplerinin neden göstermediğini açıklar.

---

### Adım 4 — Backend'i yeniden başlat

`constants.py` değişikliği Python tarafında olduğundan backend sunucusunu yeniden başlatmak yeterlidir:

```bash
mage start demo
```

---

### Adım 5 — Frontend'i derle ve yenile

`ButtonItems.tsx` değişikliği TypeScript bundle'ında olduğundan yeniden derleme gerekir:

```bash
sudo chown -R $USER mage_ai/frontend/.next   # .next root'a aitse
cd mage_ai/frontend && yarn export_prod
```

Derleme tamamlandıktan sonra **sadece tarayıcıyı yenile** — container yeniden başlatmak gerekmez.

---

### Özet Tablo

| Adım | Dosya | Yapılan Değişiklik |
|------|-------|-------------------|
| 1 | `templates/model_makers/<isim>.py` | Her şablon için yeni `.py` dosyası oluşturma |
| 2 | `templates/constants.py` | `TEMPLATES` listesine yeni `dict` girişleri ekleme |
| 3 | `AddNewBlocks/v2/ButtonItems.tsx` | `useMemo` ile şablon listesi + `onClick` → `items` dönüşümü |
| 4 | — | Backend sunucusunu yeniden başlatma (`mage start demo`) |
| 5 | — | `yarn export_prod` ile frontend derleme + tarayıcı yenileme |

### Gerçek Örnek: Model Maker şablonları

Bu rehber, `model_maker` block tipine beş şablon eklenirken uygulanan adımlar temel alınarak hazırlanmıştır:

- `constants.py` → `Generic (no template)` girişinin altına 5 yeni `dict` eklendi; 3 tanesi `groups=[GROUP_ML_ALGORITHMS]` ile gruplandı.
- Template dosyaları → `model_makers/sklearn_classifier.py`, `sklearn_regressor.py`, `huggingface_finetune.py`, `model_evaluator.py`, `model_serializer.py` oluşturuldu.
- `ButtonItems.tsx` → `itemsModelMaker` useMemo eklendi; `MODEL_MAKER` girişindeki doğrudan `onClick` kaldırılıp `items: itemsModelMaker` ile değiştirildi.

---

<!-- Buraya yeni bölümler eklenecek -->
