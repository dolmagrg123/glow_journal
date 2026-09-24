"""python scripts/seed_products.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models.database import SessionLocal, engine
from models.models import Base, Product
import uuid

PRODUCTS = [
    # Glow Recipe
    {"name": "Watermelon Glow PHA+BHA Pore-Tight Toner", "brand": "Glow Recipe", "category": "toner",
     "skin_concerns": ["pores", "texture", "acne"], "key_ingredients": ["PHA", "BHA", "Watermelon Extract"],
     "description": "Exfoliating toner that tightens pores and smooths skin texture."},
    {"name": "Watermelon Glow Niacinamide Dew Drops", "brand": "Glow Recipe", "category": "serum",
     "skin_concerns": ["hyperpigmentation", "glow", "pores"], "key_ingredients": ["Niacinamide", "Watermelon", "Hyaluronic Acid"],
     "description": "Brightening serum for a dewy, glassy skin finish."},
    {"name": "Plum Plump Hyaluronic Acid Serum", "brand": "Glow Recipe", "category": "serum",
     "skin_concerns": ["hydration", "plumpness"], "key_ingredients": ["Hyaluronic Acid", "Plum Extract"],
     "description": "Multi-weight hyaluronic acid serum for deep hydration."},
    # CeraVe
    {"name": "Foaming Facial Cleanser", "brand": "CeraVe", "category": "cleanser",
     "skin_concerns": ["oily skin", "acne"], "key_ingredients": ["Ceramides", "Niacinamide", "Hyaluronic Acid"],
     "description": "Gentle foaming cleanser that removes excess oil without disrupting the skin barrier."},
    {"name": "Moisturizing Cream", "brand": "CeraVe", "category": "moisturizer",
     "skin_concerns": ["dry skin", "eczema"], "key_ingredients": ["Ceramides", "Hyaluronic Acid", "MVE Technology"],
     "description": "Rich cream that restores the skin barrier with long-lasting hydration."},
    {"name": "PM Facial Moisturizing Lotion", "brand": "CeraVe", "category": "moisturizer",
     "skin_concerns": ["oily skin", "hydration"], "key_ingredients": ["Niacinamide", "Ceramides", "Hyaluronic Acid"],
     "description": "Lightweight night moisturizer that helps restore the skin barrier while you sleep."},
    # La Roche-Posay
    {"name": "Anthelios Melt-in Milk Sunscreen SPF 100", "brand": "La Roche-Posay", "category": "sunscreen",
     "skin_concerns": ["sun protection", "sensitive skin"], "key_ingredients": ["Mexoryl XL", "Titanium Dioxide"],
     "description": "Broad-spectrum SPF 100 sunscreen for sensitive skin."},
    {"name": "Toleriane Double Repair Face Moisturizer", "brand": "La Roche-Posay", "category": "moisturizer",
     "skin_concerns": ["sensitive skin", "dry skin"], "key_ingredients": ["Niacinamide", "Ceramide-3", "Glycerin"],
     "description": "Restores the skin barrier and provides 48-hour hydration."},
    # Paula's Choice
    {"name": "Skin Perfecting 2% BHA Liquid Exfoliant", "brand": "Paula's Choice", "category": "exfoliant",
     "skin_concerns": ["acne", "pores", "blackheads"], "key_ingredients": ["Salicylic Acid (BHA)"],
     "description": "Iconic leave-on exfoliant that unclogs pores and smooths skin."},
    {"name": "C15 Super Booster", "brand": "Paula's Choice", "category": "serum",
     "skin_concerns": ["brightening", "anti-aging"], "key_ingredients": ["Vitamin C (15%)", "Vitamin E", "Ferulic Acid"],
     "description": "Stabilized vitamin C serum that brightens and fights free radicals."},
    # The Ordinary
    {"name": "Niacinamide 10% + Zinc 1%", "brand": "The Ordinary", "category": "serum",
     "skin_concerns": ["pores", "oily skin", "acne"], "key_ingredients": ["Niacinamide", "Zinc PCA"],
     "description": "Reduces blemishes, congestion, and excess sebum production."},
    {"name": "Hyaluronic Acid 2% + B5", "brand": "The Ordinary", "category": "serum",
     "skin_concerns": ["hydration", "fine lines"], "key_ingredients": ["Hyaluronic Acid", "Vitamin B5"],
     "description": "Multi-depth hydration serum with vitamin B5 for plump, smooth skin."},
    {"name": "Retinol 0.5% in Squalane", "brand": "The Ordinary", "category": "serum",
     "skin_concerns": ["anti-aging", "texture"], "key_ingredients": ["Retinol 0.5%", "Squalane"],
     "description": "Mid-strength retinol formula for visible anti-aging results."},
    {"name": "AHA 30% + BHA 2% Peeling Solution", "brand": "The Ordinary", "category": "exfoliant",
     "skin_concerns": ["texture", "dullness", "acne"], "key_ingredients": ["Glycolic Acid", "Salicylic Acid", "Tartaric Acid"],
     "description": "10-minute weekly exfoliant for refined skin texture and clarity."},
    # Drunk Elephant
    {"name": "T.L.C. Framboos Glycolic Night Serum", "brand": "Drunk Elephant", "category": "serum",
     "skin_concerns": ["texture", "anti-aging", "dullness"], "key_ingredients": ["Glycolic Acid", "Salicylic Acid", "Raspberry Extract"],
     "description": "AHA/BHA blend that resurfaces skin overnight for a brighter complexion."},
    {"name": "Protini Polypeptide Cream", "brand": "Drunk Elephant", "category": "moisturizer",
     "skin_concerns": ["anti-aging", "firmness"], "key_ingredients": ["Signal Peptides", "Pygmy Waterlily", "Amino Acids"],
     "description": "Protein-rich moisturizer that improves signs of aging and skin tone."},
    {"name": "C-Firma Fresh Day Serum", "brand": "Drunk Elephant", "category": "serum",
     "skin_concerns": ["brightening", "anti-aging"], "key_ingredients": ["Vitamin C (15%)", "Ferulic Acid", "Pumpkin Ferment"],
     "description": "Potent vitamin C day serum that brightens and firms skin."},
    # COSRX
    {"name": "Advanced Snail 96 Mucin Power Essence", "brand": "COSRX", "category": "essence",
     "skin_concerns": ["hydration", "healing", "texture"], "key_ingredients": ["Snail Secretion Filtrate (96%)"],
     "description": "High-concentration snail mucin essence for intense hydration and skin repair."},
    {"name": "Low pH Good Morning Gel Cleanser", "brand": "COSRX", "category": "cleanser",
     "skin_concerns": ["acne", "sensitive skin"], "key_ingredients": ["Tea Tree Oil", "Willow Bark Water"],
     "description": "Low-pH gel cleanser that maintains the skin's natural acid mantle."},
    {"name": "AHA/BHA Clarifying Treatment Toner", "brand": "COSRX", "category": "toner",
     "skin_concerns": ["acne", "texture"], "key_ingredients": ["Willow Bark Water (70%)", "AHA", "BHA"],
     "description": "Exfoliating toner that clears pores and improves skin texture."},
    # Tatcha
    {"name": "The Water Cream", "brand": "Tatcha", "category": "moisturizer",
     "skin_concerns": ["oily skin", "pores", "hydration"], "key_ingredients": ["Japanese Wild Rose", "Leopard Lily", "Hadasei-3"],
     "description": "Oil-free moisturizer that delivers a burst of deep hydration."},
    {"name": "The Dewy Skin Cream", "brand": "Tatcha", "category": "moisturizer",
     "skin_concerns": ["dry skin", "glow"], "key_ingredients": ["Hyaluronic Acid", "Hadasei-3", "Okinawa Red Algae"],
     "description": "Plumping rich cream for a luminous, dewy complexion."},
    # Sunday Riley
    {"name": "Good Genes All-In-One Lactic Acid Treatment", "brand": "Sunday Riley", "category": "serum",
     "skin_concerns": ["texture", "brightening", "anti-aging"], "key_ingredients": ["Lactic Acid", "Licorice Root Extract"],
     "description": "Purified lactic acid treatment that instantly brightens and plumps skin."},
    {"name": "Luna Sleeping Night Oil", "brand": "Sunday Riley", "category": "oil",
     "skin_concerns": ["anti-aging", "texture"], "key_ingredients": ["Trans-Retinoic Acid Ester", "Blue Tansy", "German Chamomile"],
     "description": "Retinoid facial oil for smooth, radiant skin by morning."},
    # SkinCeuticals
    {"name": "C E Ferulic", "brand": "SkinCeuticals", "category": "serum",
     "skin_concerns": ["anti-aging", "brightening"], "key_ingredients": ["Vitamin C (15%)", "Vitamin E", "Ferulic Acid"],
     "description": "Gold-standard antioxidant serum that neutralizes free radicals and brightens skin."},
    {"name": "Phyto Corrective Gel", "brand": "SkinCeuticals", "category": "serum",
     "skin_concerns": ["redness", "sensitive skin", "hydration"], "key_ingredients": ["Cucumber", "Thyme", "Dipeptide-2"],
     "description": "Botanical gel that soothes and hydrates reactive skin."},
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    added = 0
    for data in PRODUCTS:
        exists = db.query(Product).filter(
            Product.name == data["name"], Product.brand == data["brand"]
        ).first()
        if not exists:
            p = Product(id=uuid.uuid4(), is_verified=True, **data)
            db.add(p)
            added += 1
    db.commit()
    db.close()
    print(f"✅  Seeded {added} products.")


if __name__ == "__main__":
    seed()
