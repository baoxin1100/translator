"""生成扁平化"划"字图标
- 应用图标 (PNG, 透明背景, 圆角蓝底): 16 / 48 / 128 / 300
- Edge 商店推广图 (440x280, 不透明白底): 1 张
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
BG_COLOR = (66, 133, 244, 255)        # Material Blue #4285F4
TEXT_COLOR = (255, 255, 255, 255)
PROMO_BG = (255, 255, 255, 255)       # 推广图白底
PROMO_SUB_COLOR = (66, 133, 244, 255) # 副标题/wordmark 主色
PROMO_DESC_COLOR = (95, 99, 104, 255) # 描述文字 (Material Grey 700)
TEXT = '划'
WORDMARK = '划词翻译'
TAGLINE = 'Selection Translator'

FONT_BOLD_CANDIDATES = [
    r'C:\Windows\Fonts\msyhbd.ttc',
    r'C:\Windows\Fonts\simhei.ttf',
    r'C:\Windows\Fonts\msyh.ttc',
    r'C:\Windows\Fonts\simsun.ttc',
]
FONT_REG_CANDIDATES = [
    r'C:\Windows\Fonts\msyh.ttc',
    r'C:\Windows\Fonts\simsun.ttc',
    r'C:\Windows\Fonts\arial.ttf',
]

def get_font(size, candidates):
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()

def rounded_rect_mask(w, h, radius):
    mask = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=radius, fill=255)
    return mask

def draw_text_centered(draw, text, font, box):
    """在 box=(x,y,w,h) 内居中绘制文字（基于 textbbox）。"""
    x0, y0, w, h = box
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = x0 + (w - tw) / 2 - bbox[0]
    y = y0 + (h - th) / 2 - bbox[1]
    draw.text((x, y), text, font=font, fill=TEXT_COLOR if font is not None and box == box else TEXT_COLOR)
    return x, y

def make_app_icon(size, out_path):
    """正方形 圆角 蓝底 白字"划"。"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    bg = Image.new('RGBA', (size, size), BG_COLOR)
    radius = max(2, int(size * 0.2))
    img.paste(bg, (0, 0), rounded_rect_mask(size, size, radius))

    font = get_font(int(size * 0.78), FONT_BOLD_CANDIDATES)
    draw = ImageDraw.Draw(img)
    bbox = draw.textbbox((0, 0), TEXT, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1]
    draw.text((x, y), TEXT, font=font, fill=TEXT_COLOR)

    img.save(out_path, 'PNG')
    print(f'  [App icon] {out_path}  {size}x{size}')

def make_promo_440x280(out_path):
    """Edge 商店 small promotional tile: 440x280, 不支持透明 -> 白底。
    左侧: 蓝色圆角方块 + 白色"划"字 (与扩展图标一致)
    右侧: 中文 wordmark "划词翻译" + 英文 tagline "Selection Translator"
    """
    W, H = 440, 280
    img = Image.new('RGB', (W, H), PROMO_BG[:3])
    draw = ImageDraw.Draw(img)

    # ---- 左侧 logo 方块 ----
    pad = 28
    logo_size = H - pad * 2          # 224
    logo_x = pad
    logo_y = pad
    radius = int(logo_size * 0.2)

    # 圆角蓝底
    logo_layer = Image.new('RGBA', (logo_size, logo_size), (0, 0, 0, 0))
    bg = Image.new('RGBA', (logo_size, logo_size), BG_COLOR)
    logo_layer.paste(bg, (0, 0), rounded_rect_mask(logo_size, logo_size, radius))

    # "划"字
    font_logo = get_font(int(logo_size * 0.78), FONT_BOLD_CANDIDATES)
    ldraw = ImageDraw.Draw(logo_layer)
    bbox = ldraw.textbbox((0, 0), TEXT, font=font_logo)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    lx = (logo_size - tw) / 2 - bbox[0]
    ly = (logo_size - th) / 2 - bbox[1]
    ldraw.text((lx, ly), TEXT, font=font_logo, fill=TEXT_COLOR)

    img.paste(logo_layer, (logo_x, logo_y), logo_layer)

    # ---- 右侧文字 ----
    text_x = logo_x + logo_size + 24
    text_w = W - text_x - pad

    # 中文主标题
    font_title = get_font(40, FONT_BOLD_CANDIDATES)
    bbox = draw.textbbox((0, 0), WORDMARK, font=font_title)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    title_x = text_x + (text_w - tw) / 2 - bbox[0]
    title_y = 92
    draw.text((title_x, title_y), WORDMARK, font=font_title, fill=PROMO_SUB_COLOR)

    # 英文 tagline
    font_sub = get_font(15, FONT_REG_CANDIDATES)
    bbox = draw.textbbox((0, 0), TAGLINE, font=font_sub)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    sub_x = text_x + (text_w - tw) / 2 - bbox[0]
    sub_y = title_y + 56
    draw.text((sub_x, sub_y), TAGLINE, font=font_sub, fill=PROMO_DESC_COLOR)

    img.save(out_path, 'PNG')
    print(f'  [Promo tile] {out_path}  {W}x{H}')

if __name__ == '__main__':
    print('Generating app icons...')
    for s in (16, 48, 128, 300):
        make_app_icon(s, os.path.join(OUT_DIR, f'icon{s}.png'))

    print('Generating store promotional tile...')
    make_promo_440x280(os.path.join(OUT_DIR, 'promo_440x280.png'))

    print('Done!')